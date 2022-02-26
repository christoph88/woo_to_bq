#!/bin/bash

export GOOGLE_APPLICATION_CREDENTIALS="/Users/christophgeypen/keys/woo_to_bq.json" 

# get order page
# node -r dotenv-yaml/config -e 'require("./index.js").getOrderPage({"params": {"page": "3"}}, null)' dotenv_yaml_config_path=./.env.yaml dotenv_yaml_config_encoding=utf8

# enqueue orders
node -r dotenv-yaml/config -e 'require("./index.js").enqueueOrders({}, null)' dotenv_yaml_config_path=./.env.yaml dotenv_yaml_config_encoding=utf8

# get product page
# node -r dotenv-yaml/config -e 'require("./index.js").getProductPage({"params": {"page": "2"}}, null)' dotenv_yaml_config_path=./.env.yaml dotenv_yaml_config_encoding=utf8

# enqueue products
# node -r dotenv-yaml/config -e 'require("./index.js").enqueueProducts({}, null)' dotenv_yaml_config_path=./.env.yaml dotenv_yaml_config_encoding=utf8