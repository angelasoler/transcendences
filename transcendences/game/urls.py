from django.urls import path, re_path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/check_auth/', views.check_auth, name='check_auth'),
    path('api/register/', views.register_user, name='register_user'),
    path('api/login/', views.login_user, name='login_user'),
    path('api/logout/', views.logout_user, name='logout_user'),
    path('api/profile/', views.get_profile, name='get_profile'),
    path('game/<str:room_name>/', views.game_room, name='game_room'),
    path('api/create_room/', views.create_room, name='create_room'),
    path('api/get_available_rooms/', views.get_available_rooms, name='get_available_rooms'),
    path('api/join_room/', views.join_room, name='join_room'),
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    re_path(r'^.*$', views.index, name='catch_all'),
]
