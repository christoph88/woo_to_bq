#!/bin/bash

export GOOGLE_APPLICATION_CREDENTIALS="/Users/christophgeypen/code/supervers/digital-supervers-34345efc4645.json" 

# node -r dotenv-yaml/config -e 'require("./index.js").run({"query": {"page":1}}, null)' dotenv_yaml_config_path=./.env.yaml dotenv_yaml_config_encoding=utf8
node -r dotenv-yaml/config -e 'require("./index.js").run({"query": {"getAmountOfPages":"true"}}, null)' dotenv_yaml_config_path=./.env.yaml dotenv_yaml_config_encoding=utf8