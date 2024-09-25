from django.urls import path, re_path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    re_path(r'^.*$', views.index, name='catch_all'),# redireciona todas as rotas para o template principla
]
