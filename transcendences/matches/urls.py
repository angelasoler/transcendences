from django.urls import path
from . import views

urlpatterns = [
    path('api/matches/', views.user_matches, name='user_matches'),
    path('api/matches/create/', views.create_match, name='create_match'),
    path('api/matches/stats/', views.user_stats, name='user_stats'),
]
