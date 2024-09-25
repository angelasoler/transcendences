from django.urls import path, re_path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/register/', views.register_user, name='register_user'),
    path('api/login/', views.login_user, name='login_user'),
    path('api/logout/', views.logout_user, name='logout_user'),
    path('api/profile/', views.get_profile, name='get_profile'),
    path('api/rankings/', views.get_rankings, name='get_rankings'),
    # redireciona todas as rotas para o template principal
    # nota: esse tratamento se faz necessario pois os app SPA gerenciam as rotas no front
    re_path(r'^.*$', views.index, name='catch_all'),
]
