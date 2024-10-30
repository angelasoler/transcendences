#!/bin/bash
set -e

# Parse DATABASE_URL to get host and port
DB_HOST=$(echo $DATABASE_URL | sed -r 's/.*@([^:]+):([0-9]+).*/\1/')
DB_PORT=$(echo $DATABASE_URL | sed -r 's/.*@([^:]+):([0-9]+).*/\2/')

echo "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."

while ! nc -z $DB_HOST $DB_PORT; do
  echo "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
  sleep 1
done

echo "PostgreSQL is up. Applying migrations..."

python manage.py makemigrations

python manage.py migrate

echo "Starting Daphne server..."

# Start Daphne server
daphne -b 0.0.0.0 -p 8000 transcendences.asgi:application
