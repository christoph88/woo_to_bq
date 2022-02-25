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
const toBucket = (message, filename) =>
  new Promise((resolve, reject) => {
    const storage = new Storage();
    // Initiate the source
    const bufferStream = new stream.PassThrough();
    // Write your buffer
    bufferStream.end(Buffer.from(message));

    const myBucket = storage.bucket(process.env.BUCKET);
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
        const finish = `${filename} is uploaded!`;
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
const extract = async (data) => {
  const extractedRow = {
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
  return `${JSON.stringify(extractedRow)}\n`;
};

/**
 * @param  {Object} responseData Woocommerce response.data object
 */
const toJsonl = async (responseData) => {
  const rows = await Promise.all(responseData.map(async (row) => extract(row)));

  // join all lines as one string with no join symbol
  return rows.join('');
};

/**
 * @param  {Number} index Pass the index which is used for scheduling
 */
async function createHttpTask(index) {
  // Instantiates a client.
  const client = new CloudTasksClient();
  // TODO(developer): Uncomment these lines and replace with your values.
  const project = process.env.PROJECT;
  const queue = process.env.QUEUE;
  const location = process.env.LOCATION;
  const url = `${process.env.ENDPOINT}?per_page=${process.env.PER_PAGE}&page=${index}`;
  const payload = 'Hello, World!';
  const inSeconds = index * 12;

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
  console.log(`Sending task for page ${index}`);
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
const loopThroughPages = async (totalpages) => {
  const arr = Array.from(Array(parseInt(totalpages)).keys());

  // eslint-disable-next-line no-restricted-syntax
  for (const index of arr) {
    // pages start from 1 and not 0
    const task = await createHttpTask(index + 1);
    console.log(task);
  }
};

/**
 * HTTP Cloud Function.
 *
 * @param {Object} req Cloud Function request context.
 *                     More info: https://expressjs.com/en/api.html#req
 * @param {Object} res Cloud Function response context.
 *                     More info: https://expressjs.com/en/api.html#res
 */
exports.run = async (req, res) => {
  const { page, getAmountOfPages } = req.query;
  // eslint-disable-next-line camelcase
  const per_page = process.env.PER_PAGE;

  const response = await axios
    .get(process.env.URL, {
      params: {
        per_page,
        page: page || 1,
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

  // create tasks for all pages to get
  if (getAmountOfPages === 'true') {
    const totalpages = response.headers['x-wp-totalpages'];
    console.log(`${totalpages} pages to get.`);
    const looped = await loopThroughPages(totalpages);
    res.status(200).send(`created ${totalpages} tasks`);
  }

  // get a single page
  if (getAmountOfPages !== 'true') {
    const filename = `page_${pad(page, 3)}.jsonl`;

    const jsonl = await toJsonl(response.data);

    const saved = await toBucket(jsonl, filename);
    res.status(200).send(saved);
  }
};

// Create an Express object and routes (in order)
const app = express();
app.use('/dataset/:datasetId/view/:viewId', getView);
app.use('/dataset/:datasetId/table/:tableId', getTable);
app.use('/dataset/:datasetId', getDataset);
app.use('/backup', getBackup); //
app.use(getHome);

// Set our GCF handler to our Express app.
exports.getTable = getTable;
exports.getView = getView;
exports.getDataset = getDataset;
exports.getBackup = getBackup;
exports.run = app;
// Needed for Quokka
// exports.run({ query: { page: 1 } }, null);
// exports.run({ query: { getAmountOfPages: true } }, null);
