from channels.generic.websocket import AsyncWebsocketConsumer
import json

class PongConsumer(AsyncWebsocketConsumer):
    games = {}

    async def connect(self):
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.game_group_name = f'pong_{self.game_id}'

        if self.game_id not in self.games:
            self.games[self.game_id] = {
                'players': [self.channel_name],
                'host': self.channel_name
            }
            is_host = True
        elif len(self.games[self.game_id]['players']) < 2:
            self.games[self.game_id]['players'].append(self.channel_name)
            is_host = False
        else:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.game_group_name,
            self.channel_name
        )

        await self.accept()

        await self.send(json.dumps({
            'type': 'game_status',
            'is_host': is_host
        }))

        if len(self.games[self.game_id]['players']) == 2:
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'game_start',
                }
            )

    async def disconnect(self, close_code):
        if self.game_id in self.games:
            game_info = self.games[self.game_id]
            if self.channel_name in game_info['players']:
                game_info['players'].remove(self.channel_name)
                
                if game_info['players']:
                    await self.channel_layer.group_send(
                        self.game_group_name,
                        {
                            'type': 'game_end',
                            'reason': 'opponent_disconnected'
                        }
                    )
                else:
                    del self.games[self.game_id]

        await self.channel_layer.group_discard(
            self.game_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        if self.game_id not in self.games or len(self.games[self.game_id]['players']) < 2:
            return

        data = json.loads(text_data)
        
        if data['type'] == 'paddle_update':
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'game_state',
                    'sender_channel_name': self.channel_name,
                    'paddle_y': data['paddle_y'],
                    'ball': data.get('ball')  # Apenas o host envia isso
                }
            )

    async def game_state(self, event):
        if event['sender_channel_name'] != self.channel_name:
            game_info = self.games.get(self.game_id, {})
            is_sender_host = game_info and event['sender_channel_name'] == game_info['host']
            
            await self.send(json.dumps({
                'type': 'game_state',
                'opponent_paddle': event['paddle_y'],
                'ball': event['ball'] if is_sender_host else None
            }))

    async def game_start(self, event):
        await self.send(json.dumps({
            'type': 'game_start'
        }))

    async def game_end(self, event):
        await self.send(json.dumps({
            'type': 'game_end',
            'reason': event.get('reason', 'unknown')
        }))
