import json
from channels.generic.websocket import AsyncWebsocketConsumer

class GameConsumer(AsyncWebsocketConsumer):
    rooms = {}  # Dicionário para armazenar o estado das salas

    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'game_{self.room_name}'
        self.user = self.scope['user']

        if not self.user.is_authenticated:
            await self.close()
            return

        if self.room_name not in self.rooms:
            self.rooms[self.room_name] = {
                'players': [],
                'game_state': {
                    'paddle1Y': 150,
                    'paddle2Y': 150,
                    'ballX': 300,
                    'ballY': 200,
                    'ballSpeedX': 5,
                    'ballSpeedY': 5,
                    'canvasWidth': 600,
                    'canvasHeight': 400
                },
                'score': {
                    'player1': {
                        'name': '',
                        'score': 0
                    },
                    'player2': {
                        'name': '',
                        'score': 0
                    }
                }
            }

        if len(self.rooms[self.room_name]['players']) >= 2:
            await self.close()
            return

        self.paddle = f'paddle{len(self.rooms[self.room_name]["players"]) + 1}'
        player = f'player{len(self.rooms[self.room_name]["players"]) + 1}'
        self.rooms[self.room_name]['score'][player]['name'] = self.user.username
        self.rooms[self.room_name]['players'].append(self.channel_name)

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        await self.send(text_data=json.dumps({'paddle': self.paddle}))

    async def disconnect(self, close_code):
        if self.room_name in self.rooms:
            self.rooms[self.room_name]['players'].remove(self.channel_name)
            if not self.rooms[self.room_name]['players']:
                del self.rooms[self.room_name]

        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        game_state = self.rooms[self.room_name]['game_state']

        if self.paddle == 'paddle1':
            game_state['paddle1Y'] = data.get('paddle1Y', game_state['paddle1Y'])
        else:
            game_state['paddle2Y'] = data.get('paddle2Y', game_state['paddle2Y'])

        self.update_ball_position()

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'broadcast_game_state',
                'game_state': game_state,
                'score': self.rooms[self.room_name]['score']
            }
        )

    def update_ball_position(self):
        game_state = self.rooms[self.room_name]['game_state']
        score = self.rooms[self.room_name]['score']
        game_state['ballX'] += game_state['ballSpeedX']
        game_state['ballY'] += game_state['ballSpeedY']

        if game_state['ballY'] <= 0 or game_state['ballY'] >= game_state['canvasHeight']:
            game_state['ballSpeedY'] = -game_state['ballSpeedY']

        if game_state['ballX'] <= 0 or game_state['ballX'] >= game_state['canvasWidth']:
            game_state['ballSpeedX'] = -game_state['ballSpeedX']

        # Colisão com o paddle esquerdo
        if (game_state['ballX'] < 10):
            if (game_state['ballY'] > game_state['paddle1Y'] and game_state['ballY'] < game_state['paddle1Y'] + 100):
                game_state['ballSpeedX'] = -game_state['ballSpeedX']
            else:
                score['player2']['score'] += 1
                self.resetBall()

        # Colisão com o paddle direito
        if (game_state['ballX'] > game_state['canvasWidth'] - 10):
            if (game_state['ballY'] > game_state['paddle2Y'] and game_state['ballY'] < game_state['paddle2Y'] + 100):
                game_state['ballSpeedX'] = -game_state['ballSpeedX']
            else:
                score['player1']['score'] += 1
                self.resetBall()


    async def broadcast_game_state(self, event):
        await self.send(text_data=json.dumps(
                {
                    'game_state': event['game_state'],
                    'score': event['score'],
                }
            )
        )

    def resetBall(self):
        game_state = self.rooms[self.room_name]['game_state']
        game_state['ballX'] = game_state['canvasWidth'] / 2
        game_state['ballY'] = game_state['canvasHeight'] / 2
        game_state['ballSpeedX'] = -game_state['ballSpeedX']
