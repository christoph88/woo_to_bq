require('env-yaml').config({ path: '.env.yaml' });
const express = require('express');
const axios = require('axios').default;
const stream = require('stream');
const { Storage } = require('@google-cloud/storage');
const { CloudTasksClient } = require('@google-cloud/tasks');
const { resolve } = require('path');

/**
 * @param  {String} message message to save as file
 * @param  {String} filename filename to be used
 */
const toBucket = (message, filename, entity) =>
  new Promise((resolve, reject) => {
    const storage = new Storage();
    // Initiate the source
    const bufferStream = new stream.PassThrough();
    // Write your buffer
    bufferStream.end(Buffer.from(message));

    const myBucket = storage.bucket(
      process.env[`${entity.toUpperCase()}_BUCKET`]
    );
    const file = myBucket.file(filename);
    // Pipe the 'bufferStream' into a 'file.createWriteStream' method.
    bufferStream
      .pipe(
        file.createWriteStream({
          validation: 'md5',
        })
      )
      .on('error', (err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        reject(err);
      })
      .on('finish', () => {
        // The file upload is complete.
        const finish = `${filename} is stored on GCS!`;
        // eslint-disable-next-line no-console
        console.log(finish);
        resolve(finish);
      });
  });

/**
 * @param  {number} number the number where you want to add padding to
 * @param  {number} size the total length of the number encluding padding
 */
const pad = (number, size) => {
  let s = String(number);
  while (s.length < (size || 2)) {
    s = `0${s}`;
  }
  return s;
};

/**
 * @param  {Object} data Woocommerce response.data
 */
const extractOrder = async (data) => {
  const model = {
    id: data.id,
    status: data.status,
    date_created: data.date_created,
    discount_total: data.discount_total,
    discount_tax: data.discount_tax,
    shipping_total: data.shipping_total,
    shipping_tax: data.shipping_tax,
    total: data.total,
    total_tax: data.total_tax,
    customer_id: data.customer_id,
    payment_method: data.payment_method,
    payment_method_title: data.payment_method_title,
    transaction_id: data.transaction_id,
    date_completed: data.date_completed,
    billing_city: data.billing.city,
    billing_state: data.billing.state,
    billing_postcode: data.billing.postcode,
    coupon_lines_id: data.coupon_lines.id,
    coupon_lines_code: data.coupon_lines.code,
    coupon_lines_discount: data.coupon_lines.discount,
    coupon_lines_discount_tax: data.coupon_lines.discount_tax,
    line_items: JSON.stringify(data.line_items),
  };
  return `${JSON.stringify(model)}\n`;
};

/**
 * @param  {Object} data Woocommerce response.data
 */
const extractProduct = async (data) => {
  const model = {
    id: data.id,
    name: data.name,
    slug: data.slug,
    permalink: data.permalink,
    virtual: data.virtual,
  };
  return `${JSON.stringify(model)}\n`;
};

/**
 * @param  {Object} responseData Woocommerce response.data object
 */
const toJsonl = async (responseData, entity) => {
  const rows = await Promise.all(
    responseData.map(async (row) => {
      if (entity === 'orders') {
        extractOrder(row, entity);
      }
      if (entity === 'products') {
        extractProduct(row, entity);
      }
    })
  );

  // join all lines as one string with no join symbol
  return rows.join('');
};

/**
 * @param  {Number} pageIndex Pass the index which is used for scheduling
 */
async function createHttpTask(pageIndex, entity) {
  // Instantiates a client.
  const client = new CloudTasksClient();
  // TODO(developer): Uncomment these lines and replace with your values.
  const project = process.env.PROJECT;
  const queue = process.env.QUEUE;
  const location = process.env.LOCATION;
  const url = `${process.env.ENDPOINT}/${entity}/${pageIndex}`;
  const payload = 'Hello, World!';
  const inSeconds = pageIndex * 12;

  // Construct the fully qualified queue name.
  const parent = client.queuePath(project, location, queue);

  const task = {
    httpRequest: {
      httpMethod: 'POST',
      url,
    },
  };

  if (payload) {
    task.httpRequest.body = Buffer.from(payload).toString('base64');
  }

  if (inSeconds) {
    // The time when the task is scheduled to be attempted.
    task.scheduleTime = {
      seconds: inSeconds + Date.now() / 1000,
    };
  }

  // Send create task request.
  console.log(`Sending task for page ${pageIndex}`);
  // console.log(task);
  const request = { parent, task };
  const [response] = await client.createTask(request);
  return `Created task ${response.name}`;
}

/**
 *
 * Loop through pages and create http tasks
 *
 * @param  {Number} totalpages pass the amount of pages to loop through
 */
const enqueuePages = async (totalpages, entity) => {
  const arr = Array.from(Array(parseInt(totalpages)).keys());

  // eslint-disable-next-line no-restricted-syntax
  for (const index of arr) {
    // pages start from 1 and not 0
    const task = await createHttpTask(index + 1, entity);
    console.log(task);
  }
};

const getWoo = async (entity, page) => {
  const endpoint = `${entity.toUpperCase()}_ENDPOINT`;
  return axios
    .get(process.env[endpoint], {
      params: {
        per_page: process.env.PER_PAGE,
        page,
      },
      auth: {
        username: process.env.USERNAME,
        password: process.env.PASSWORD,
      },
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error(error);
    });
};

/**
 * HTTP Cloud Function.
 *
 * @param {Object} req Cloud Function request context.
 *                     More info: https://expressjs.com/en/api.html#req
 * @param {Object} res Cloud Function response context.
 *                     More info: https://expressjs.com/en/api.html#res
 */

const getProductPage = async (req, res) => {
  // get all tables within a dataset
  const { page } = req.params;
  console.log(req.params);

  const entity = 'products';

  const response = await getWoo(entity, page);

  const filename = `page_${pad(page, 3)}.jsonl`;

  const jsonl = await toJsonl(response.data, entity);

  const saved = await toBucket(jsonl, filename, entity);

  res.status(200).send(saved);
};

const enqueueProducts = async (req, res) => {
  // get all datasets
  const entity = 'products';
  const page = 1;

  const response = await getWoo(entity, page);

  // create tasks for all pages to get
  const totalpages = response.headers['x-wp-totalpages'];
  console.log(`${totalpages} pages to get.`);
  await enqueuePages(totalpages, entity);

  res.status(200).send(`
    <h1>Enqueueing ${totalpages} order pages for GCS.</h1>
  `);
};

const getOrderPage = async (req, res) => {
  // get all tables within a dataset
  const { page } = req.params;
  console.log(req.params);

  const entity = 'orders';

  const response = await getWoo(entity, page);

  const filename = `page_${pad(page, 3)}.jsonl`;

  const jsonl = await toJsonl(response.data, entity);

  const saved = await toBucket(jsonl, filename, entity);

  res.status(200).send(saved);
};

const enqueueOrders = async (req, res) => {
  // get all datasets
  const entity = 'orders';
  const page = 1;

  const response = await getWoo(entity, page);

  // create tasks for all pages to get
  const totalpages = response.headers['x-wp-totalpages'];
  console.log(`${totalpages} pages to get.`);
  await enqueuePages(totalpages, entity);

  res.status(200).send(`
    <h1>Enqueueing ${totalpages} order pages for GCS.</h1>
  `);
};

const getHome = async (req, res) => {
  res.status(200).send(`
  <h1>Function to save woocommerce data to GCS</h1>
  <h2>Routes</h2>
    <ul>
    <li>/products/:page > get a certain product page</li>
    <li>/products/enqueue > enqueue all product pages</li>
    <li>/orders/:page > get a certain order page</li>
    <li>/orders/enqueue > enqueue all order pages</li>
  </ul>
  `);
};

// Create an Express object and routes (in order)
const app = express();
app.use('/products/:page', getProductPage); //
app.use('/products/enqueue', enqueueProducts); //
app.use('/orders/:page', getOrderPage); //
app.use('/orders/enqueue', enqueueOrders); //
app.use(getHome);

// Set our GCF handler to our Express app.
exports.getOrderPage = getOrderPage;
exports.enqueueOrders = enqueueOrders;
exports.getProductPage = getProductPage;
exports.enqueueProducts = enqueueProducts;
exports.run = app;
// Needed for Quokka
// exports.run({ query: { page: 1 } }, null);
// exports.run({ query: { getAmountOfPages: true } }, null);
