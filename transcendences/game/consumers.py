import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.layers import get_channel_layer
from django.core.cache import cache

class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'game_{self.room_name}'
        self.user = self.scope['user']

        if not self.user.is_authenticated:
            await self.close() # Fechar se o usuário não estiver autenticado

        # Obter a contagem atual de jogadores na sala
        player_count = cache.get(self.room_group_name, 0)

        if player_count >= 2:
            await self.close()
            return

        if player_count == 0:
            self.paddle = 'paddle1'
        else:
            self.paddle = 'paddle2'
        print(f"Atribuição do paddle: {self.paddle}") 

         # Incrementar a contagem de jogadores
        cache.set(self.room_group_name, player_count + 1)

        game_state = cache.get(f'{self.room_group_name}_state')
        if not game_state:
            game_state = {
                'paddle1Y': 150,
                'paddle2Y': 150,
                'ballX': 300,
                'ballY': 200,
                'ballSpeedX': 5,
                'ballSpeedY': 5,
                'canvasWidth': 600,
                'canvasHeight': 400
            }
            cache.set(f'{self.room_group_name}_state', game_state)
            print("Inicializando estado do jogo.")  # Log para depuração
        else:
            print("Recuperando estado do jogo existente.")

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()


        await self.send(text_data=json.dumps({
            'paddle': self.paddle
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)

        # Recuperar o estado atual do jogo
        game_state = cache.get(f'{self.room_group_name}_state')
        if not game_state:
            game_state = {
                'paddle1Y': 150,
                'paddle2Y': 150,
                'ballX': 300,
                'ballY': 200,
                'ballSpeedX': 5,
                'ballSpeedY': 5,
                'canvasWidth': 600,
                'canvasHeight': 400
            }
            cache.set(f'{self.room_group_name}_state', game_state)
            print("Inicializando estado do jogo no recebimento.")

        if self.paddle == 'paddle1':
            game_state['paddle1Y'] = data.get('paddle1Y', game_state['paddle1Y'])
        else:
            game_state['paddle2Y'] = data.get('paddle2Y', game_state['paddle2Y'])

        # Atualizar o estado da bola
        # self.update_ball_position(game_state)


        game_state['ballX'] += game_state['ballSpeedX']
        game_state['ballY'] += game_state['ballSpeedY']

        # Colisão com as bordas
        if game_state['ballY'] <= 0 or game_state['ballY'] >= game_state['canvasHeight']:
            game_state['ballSpeedY'] = -game_state['ballSpeedY']

        if game_state['ballX'] <= 0 or game_state['ballX'] >= game_state['canvasWidth']:
            game_state['ballSpeedX'] = -game_state['ballSpeedX']


        # Atualizar o estado no cache
        cache.set(f'{self.room_group_name}_state', game_state)
        print(f"Estado do jogo atualizado: {game_state}") 

        # Enviar o estado atualizado para ambos os jogadores
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'broadcast_game_state',
                'game_state': game_state
            }
        )

    # Atualizar a posição da bola no jogo
    # def update_ball_position(self, game_state):
    #     game_state['ballX'] += game_state['ballSpeedX']
    #     game_state['ballY'] += game_state['ballSpeedY']

    #     # Colisão com as bordas
    #     if game_state['ballY'] <= 0 or game_state['ballY'] >= game_state['canvasHeight']:
    #         game_state['ballSpeedY'] = -game_state['ballSpeedY']

    #     if game_state['ballX'] <= 0 or game_state['ballX'] >= game_state['canvasWidth']:
    #         game_state['ballSpeedX'] = -game_state['ballSpeedX']

    async def broadcast_game_state(self, event):
        await self.send(text_data=json.dumps(event['game_state']))
