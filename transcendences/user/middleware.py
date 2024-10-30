import json
from django.core.exceptions import RequestDataTooBig, SuspiciousOperation
import logging

logger = logging.getLogger(__name__)

class RequestSizeLimitMiddleware:
    """
    ASGI middleware to limit the size of incoming request bodies.
    If the request body exceeds the specified limit, return a JSON response.
    """
    def __init__(self, app, max_size=6990762):  # 5MB
        self.app = app
        self.max_size = max_size
        logger.debug(f"SizeLimitMiddleware initialized")

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            await self.app(scope, receive, send)
            return

        total_size = 0
        try:
            async def receive_limited():
                nonlocal total_size
                message = await receive()
                if message['type'] == 'http.request':
                    body_length = len(message.get('body', b''))
                    total_size += body_length

                    if total_size > self.max_size:
                        logger.warning(f"Request body size {total_size} exceeds the limit of {self.max_size}.")

                        # Construct the JSON error response
                        response_body = json.dumps({
                            'error': 'Tamanho de arquivo muito grande (máx 5MB).'
                        }).encode('utf-8')

                        # Send the HTTP response start event
                        await send({
                            'type': 'http.response.start',
                            'status': 413,
                            'headers': [
                                [b'content-type', b'application/json'],
                                [b'content-length', str(len(response_body)).encode('utf-8')],
                            ]
                        })

                        # Send the HTTP response body event
                        await send({
                            'type': 'http.response.body',
                            'body': response_body,
                            'more_body': False
                        })

                        raise Exception('Request body too large.')

                return message

            await self.app(scope, receive_limited, send)
        except Exception as e:
            logger.error(f"Exception in RequestSizeLimitMiddleware: {e}")
            # After sending the response, we can terminate the connection
            return