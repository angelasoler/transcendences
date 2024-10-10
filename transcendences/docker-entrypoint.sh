#!/bin/bash
set -e

pip install -r requirements.txt

python manage.py makemigrations

python manage.py migrate

exec "$@"
