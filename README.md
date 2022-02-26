A Google Cloud Function which downloads orders/product data from the Woocommerce API to Google Cloud storage. A file per page is created. This can be used to create a table with a wildcard in Big Query.
# Table of contents
- [Table of contents](#table-of-contents)
- [Woocommerce orders/products to Big Query](#woocommerce-ordersproducts-to-big-query)
- [Setup](#setup)
- [.env.yaml](#envyaml)
- [Endpoints](#endpoints)
- [Service account permissions](#service-account-permissions)
- [Testing](#testing)
# Woocommerce orders/products to Big Query
1. Create a connection with Woocommerce api
1. Create cloud tasks for each page to get (the function is self referencing)
1. Extract the required fields
1. Save the output as jsonl to Google Cloud Storage
1. Create a new table based on GCS data with a wildcard in the naming e.g. page_*.jsonl

# Setup
1. Clone repo
1. Create .env.yaml file
1. npm install
1. ./deploy.sh

# .env.yaml
```yaml
ORDERS_ENDPOINT: website/wp-json/wc/v3/orders
PRODUCTS_ENDPOINT: website/wp-json/wc/v3/products
USERNAME: woocommerce api username
PASSWORD: woocommerce api password
PROJECT: google cloud project name
QUEUE: google cloud task queue
LOCATION: google cloud location
ENDPOINT: google cloud function endpoint/woo_to_bq
SERVICE_ACCOUNT_EMAIL: the service account to use emailadress
ORDERS_BUCKET: the bucket where to save the orders
PRODUCTS_BUCKET: the bucket where to save the products
PER_PAGE: '50'
```

# Endpoints
- **/** > the homepage
- **/orders/:id** > get a specific order page (number)
- **/products/:id** > get a specific product page (number)
- **/enqueue/orders** > enqueue all order pages using cloud tasks
- **/enqueue/products** > enqueue all product pages using cloud tasks

# Service account permissions
Your service account will need following **permissions**.
1. Cloud Functions Invoker
1. Cloud Tasks Enqueuer
1. Storage Object Admin
1. Service Account User

# Testing
1. gcloud auth print-identity-token
1. Use this as a bearer token
1. You can also use ./test.sh but set the service account first