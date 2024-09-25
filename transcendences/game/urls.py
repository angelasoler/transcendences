from django.urls import path, re_path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    # redireciona todas as rotas para o template principal
    # not: esse tratamento se faz necessario pois os app SPA gerenciam as rotas no front
    re_path(r'^.*$', views.index, name='catch_all'),
]
