from django.urls import path

from . import views

urlpatterns = [
    path('api/user/create', views.create_user, name='create_user'),
    path('api/user/update', views.update_user, name='update_user'),
    path('api/user/login',  views.login_user,  name='login_user'),
    path('api/user/add_friends',  views.user_add_friend,  name='user_add_friend')
]