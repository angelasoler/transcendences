import json
from channels.generic.websocket import AsyncWebsocketConsumer

class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'game_{self.room_name}'

        # Acessar o usuário autenticado
        self.user = self.scope['user']

        if not self.user.is_authenticated:
            await self.close()
        # Limitar a 2 jogadores
        if len(self.channel_layer.groups.get(self.room_group_name, [])) >= 2:
            await self.close()
        else:
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            await self.accept()

            # Inicializar o estado do jogo
            self.game_state = {
                'paddle1Y': 0,
                'paddle2Y': 0,
                'ballX': 400,
                'ballY': 300,
                'ballSpeedX': 5,
                'ballSpeedY': 5,
                'paddleSpeed': 10
            }

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        
        # Atualizar o estado dos jogadores (paddles)
        self.game_state['paddle1Y'] = data.get('paddle1Y', self.game_state['paddle1Y'])
        self.game_state['paddle2Y'] = data.get('paddle2Y', self.game_state['paddle2Y'])

        # Atualizar o estado da bola
        self.update_ball_position()

        # Enviar o estado atualizado para ambos os jogadores
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_state',
                'game_state': self.game_state
            }
        )

    # Atualizar a posição da bola no jogo
    def update_ball_position(self):
        self.game_state['ballX'] += self.game_state['ballSpeedX']
        self.game_state['ballY'] += self.game_state['ballSpeedY']

        # Colisão com as bordas
        if self.game_state['ballY'] <= 0 or self.game_state['ballY'] >= 600:
            self.game_state['ballSpeedY'] = -self.game_state['ballSpeedY']

        if self.game_state['ballX'] <= 0 or self.game_state['ballX'] >= 800:
            self.game_state['ballSpeedX'] = -self.game_state['ballSpeedX']

    async def game_state(self, event):
        await self.send(text_data=json.dumps(event['game_state']))

