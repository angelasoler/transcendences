#!/bin/bash
set -e

pip install -r requirements.txt

python manage.py makemigrations matches
python manage.py migrate
python manage.py makemigrations game
python manage.py migrate
python manage.py makemigrations user
python manage.py migrate

python manage.py makemigrations
python manage.py migrate

daphne -b 0.0.0.0 -p 8000 transcendences.asgi:application

exec "$@"
