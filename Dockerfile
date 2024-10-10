FROM python:3.9-slim

ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1

WORKDIR /app

COPY ./transcendences /app/
RUN pip install --upgrade pip
RUN pip install -r requirements.txt


EXPOSE 8000

COPY ./transcendences/docker-entrypoint.sh /usr/bin/docker-entrypoint.sh

RUN chmod +x /usr/bin/docker-entrypoint.sh
ENTRYPOINT ["/usr/bin/docker-entrypoint.sh"]

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
