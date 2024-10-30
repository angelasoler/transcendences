"""
ASGI config for transcendences project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
import django

from django.core.asgi import get_asgi_application
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from user.middleware import RequestSizeLimitMiddleware

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'transcendences.settings')

# Initialize the Django ASGI application
django_asgi_app = get_asgi_application()

import game.routing

application = ProtocolTypeRouter({
    'http': RequestSizeLimitMiddleware(django_asgi_app),
    'websocket': AuthMiddlewareStack(
        URLRouter(
            game.routing.websocket_urlpatterns
        )
    ),
})
