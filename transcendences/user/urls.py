from django.urls import path, re_path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('home', views.index, name='home'),
    path('api/user/create', views.create_user, name='create_user'),
    path('api/user/update', views.update_user, name='update_user'),
    path('api/user/api/user/login',  views.login_user,  name='login_user'),
    path('api/user/profile',  views.profile_user,  name='profile_user'),
    path('api/user/check_auth', views.check_auth, name='check_auth'),
    path('api/user/logout', views.logout_user, name='logout_user'),
    path('register/',  views.register_view,  name='register_view'),
    path('login/',  views.login_view,  name='login_view'),
    path('api/user/add_friends/',  views.user_add_friend,  name='user_add_friend'),
    re_path(r'^.*$', views.not_found, name='catch_all')
]