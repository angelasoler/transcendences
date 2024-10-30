
all: build upd

build:
	docker compose build

up:
	docker compose up web

upd:
	docker compose up -d web

test:
	docker compose run --rm test bash

down:
	docker compose down

fclean: down
	@echo "Cleaning..."
	
	if [ "$(shell docker container ls -a  | grep transcendence_web)" ]; then docker container rm transcendence_web; fi
	if [ "$(shell docker container ls -a  | grep transcendence_web_test)" ]; then docker container rm transcendence_web_test; fi
	if [ "$(shell docker container ls -a  | grep transcendence_redis)" ]; then docker container rm transcendence_redis; fi
	if [ "$(shell docker container ls -a  | grep transcendence_db)" ];  then docker container rm transcendence_db; fi
	
	if [ "$(shell docker image ls -a  | grep transcendence/web)" ]; then docker rmi transcendence/web:latest; fi
	if [ "$(shell docker image ls -a  | grep transcendence/redis)" ]; then docker rmi transcendence/redis:latest; fi
	if [ "$(shell docker image ls -a  | grep transcendence/postgres)" ];  then docker rmi transcendence/postgres:latest; fi

	docker volume prune

clean: down
	docker system prune -a -f
	docker volume prune -f
	sudo rm -rf postgres/data

