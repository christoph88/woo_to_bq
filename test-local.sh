#!/bin/bash

export GOOGLE_APPLICATION_CREDENTIALS="/Users/christophgeypen/code/supervers/woo_to_bq.json" 

# get table
# node -r dotenv-yaml/config -e 'require("./index.js").getTable({"params": {"datasetId": "budgets", "tableId": "join_allocations_and_spends_static"}}, null)' dotenv_yaml_config_path=./mv.env.yaml dotenv_yaml_config_encoding=utf8

# get view
# node -r dotenv-yaml/config -e 'require("./index.js").getView({"params": {"datasetId": "budgets", "viewId": "allocations"}}, null)' dotenv_yaml_config_path=./mv.env.yaml dotenv_yaml_config_encoding=utf8

# get tables from dataset
# node -r dotenv-yaml/config -e 'require("./index.js").getDataset({"params": {"datasetId": "budgets"}}, null)' dotenv_yaml_config_path=./mv.env.yaml dotenv_yaml_config_encoding=utf8

# do backup
# node -r dotenv-yaml/config -e 'require("./index.js").getBackup({"params": {}}, null)' dotenv_yaml_config_path=./mv.env.yaml dotenv_yaml_config_encoding=utf8