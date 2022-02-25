#!/bin/bash

gcloud config configurations activate youtube-playlist
gcloud functions deploy discogs_to_youtube \
--entry-point=run \
--runtime nodejs16 \
--trigger-http \
--region europe-west1 \
--env-vars-file .env.yml
