#!/bin/bash

gcloud config configurations activate supervers
gcloud functions deploy woo_to_bq \
--entry-point=run \
--runtime nodejs16 \
--trigger-http \
--region europe-west1 \
--timeout=120 \
--service-account=woo-orders-to-bq@digital-supervers.iam.gserviceaccount.com \
--env-vars-file .env.yaml