from django.http import JsonResponse
from django.http.request import RequestDataTooBig
from django.core.exceptions import SuspiciousOperation

class RequestDataTooBigMiddleware:
    """
    Middleware to catch RequestDataTooBig exceptions and return a JSON response.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    async def __call__(self, scope, receive, send):
        # Only process HTTP requests
        if scope['type'] != 'http':
            return await self.get_response(scope, receive, send)

        try:
            response = await self.get_response(scope, receive, send)
            return response
        except RequestDataTooBig as e:
            response = JsonResponse(
                {'error': 'Tamanho de arquivo muito grande (máx 5MB).'},
                status=413  # Payload Too Large
            )
            await response(scope, receive, send)
        except SuspiciousOperation as e:
            response = JsonResponse({'error': str(e)}, status=400)
            await response(scope, receive, send)
        except Exception as e:
            response = JsonResponse({'error': str(e)}, status=500)
            await response(scope, receive, send)