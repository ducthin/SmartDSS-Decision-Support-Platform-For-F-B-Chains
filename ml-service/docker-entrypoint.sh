#!/bin/sh
set -eu

if [ ! -f /app/artifacts/model.joblib ] && [ -f /app/seed-artifacts/model.joblib ]; then
  cp /app/seed-artifacts/model.joblib /app/artifacts/model.joblib
fi

if [ ! -f /app/data/training_data.csv ] && [ -f /app/seed-data/training_data.csv ]; then
  cp /app/seed-data/training_data.csv /app/data/training_data.csv
fi

exec "$@"
