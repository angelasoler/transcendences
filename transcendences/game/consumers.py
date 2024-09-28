import json
from channels.generic.websocket import AsyncWebsocketConsumer

class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'game_{self.room_name}'

        # Entrar no grupo da sala
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Sair do grupo da sala
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receber mensagem do WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        # Processar os dados recebidos, como movimentos dos jogadores

        # Enviar mensagem ao grupo da sala
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_message',
                'message': data
            }
        )

    # Receber mensagem do grupo da sala
    async def game_message(self, event):
        message = event['message']

        # Enviar mensagem ao WebSocket
        await self.send(text_data=json.dumps(message))
