from django.urls import path, re_path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/join_or_create_room/', views.join_or_create_room, name='join_or_create_room'),
    path('api/create_tournament/', views.create_tournament, name='create_tournament'),
    path('api/tournament/<str:tournament_id>/', views.get_tournament_matches, name='get_tournament_matches'),
    path('api/update_bracket/<str:tournament_id>/', views.update_bracket, name='update_bracket'),
    path('start_next_game/<str:tournament_id>/', views.start_next_game, name='start_next_game'),
]
