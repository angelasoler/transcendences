from django.urls import path

from . import views

app_name = 'user'

urlpatterns = [
    path('', views.index, name='index'),
    path('api/user/create', views.create, name='create'),
    path('api/user/update', views.update, name='update'),
    path('api/user/delete', views.update, name='delete')
]