from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/pong/(?P<game_id>[^/]+)/$', consumers.PongConsumer.as_asgi()),
    re_path(r'ws/rooms/$', consumers.RoomsConsumer.as_asgi()),
]
