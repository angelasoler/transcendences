


up:
	docker-compose up web
upd:
	docker-compose up -d web

down:
	docker-compose down
fclean:
	docker rmi 			transcendences-web
	docker volume rm 	transcendences_postgres_data