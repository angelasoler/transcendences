from django.urls import path, re_path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/join_or_create_room/', views.join_or_create_room, name='join_or_create_room'),
    re_path(r'^.*$', views.not_found, name='catch_all')
]
