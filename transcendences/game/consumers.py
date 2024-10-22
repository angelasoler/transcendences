import json
import asyncio
from pydoc import plain

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Room


class PongConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.game_id = None
        self.game_group_name = None
        self.lock = asyncio.Lock()
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

        await self.update_room_players(+1)

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
                        'result': 'win',
                        'reason': 'O oponente desconectou. Você é o Vencedor!'
                    }
                )
            else:
                del self.games[self.game_id]
                await self.mark_room_inactive()

        await self.channel_layer.group_discard(
            self.game_group_name,
            self.channel_name
        )

        await self.update_room_players(-1)

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
        elif data['type'] == 'players_score':
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'players_score',
                    'sender_channel_name': self.channel_name,
                    'player1_score': data['player1_score'],
                    'player2_score': data['player2_score'],
                }
            )
        elif data['type'] == 'game_over':
            if self.channel_name != self.games[self.game_id]['host']:
                # Apenas o host pode enviar game over
                await self.send(json.dumps({
                    'type': 'error',
                    'message': 'Apenas o Host pode enviar Game Over.'
                }))
                print(f"Rejected game_over from {self.channel_name} - Not host.")
                return
            await self.handle_game_over(data)
        elif data['type'] == 'play_again_request':
            await self.handle_play_again_request()
        elif data['type'] == 'play_again_response':
            await self.handle_play_again_response(data)

    async def game_state(self, event):
        if event['sender_channel_name'] != self.channel_name:
            game_info = self.games.get(self.game_id, {})
            is_sender_host = game_info and event['sender_channel_name'] == game_info['host']
            
            await self.send(json.dumps({
                'type': 'game_state',
                'opponent_paddle': event['paddle_y'],
                'ball': event['ball'] if is_sender_host else None
            }))

    async def players_score(self, event):
        await self.send(json.dumps({
            'type': 'players_score',
            'player1_score': event['player1_score'],
            'player2_score': event['player2_score'],
        }))


    async def game_start(self, event):
        await self.send(json.dumps({
            'type': 'game_start'
        }))

    async def game_end(self, event):
        await self.send(json.dumps({
            'type': 'game_end',
            'result': event.get('result', 'unknown'),
            'reason': event.get('reason', 'unknown')
        }))

        await self.mark_room_inactive()

    def get_opponent_channel(self):
        game_info = self.games.get(self.game_id)
        if game_info:
            opponent_channels = [ch for ch in game_info['players'] if ch != self.channel_name]
            if opponent_channels:
                return opponent_channels[0]
        return None

    async def game_over(self, event):
        await self.send(json.dumps({
            'type': 'game_over',
            'result': event['result'],
            'reason': event['reason']
        }))
        print(f"Sent game_over to {self.channel_name}: {event}")

    async def start_new_game(self, event):
        await self.channel_layer.group_send(
            self.game_group_name,
            {
                'type': 'game_start'
            }
        )

    async def handle_game_over(self, data):
        if self.game_id not in self.games:
            # Game already ended
            print(f"Game {self.game_id} already ended.")
            return
        result = data.get('result')

        # Find the opponent's channel name
        opponent_channel_name = self.get_opponent_channel()

        # Send game_end message to self
        await self.send(json.dumps({
            'type': 'game_over',
            'result': result,
            'reason': 'Você venceu!' if result == 'win' else 'Você perdeu!'
        }))
        print(f"Sent game_over to self: {self.channel_name}, result: {result}")

        # Send game_end message to opponent
        if opponent_channel_name:
            # Invert the result for the opponent
            opponent_result = 'lose' if result == 'win' else 'win'
            await self.channel_layer.send(
                opponent_channel_name,
                {
                    'type': 'game_over',
                    'result': opponent_result,
                    'reason': 'Você venceu!' if opponent_result == 'win' else 'Você perdeu!'
                }
            )
            print(f"Sent game_over to opponent: {opponent_channel_name}, result: {opponent_result}")

        # # Clean up the game state
        # if self.game_id in self.games:
        #     del self.games[self.game_id]
        #     print(f"Deleted game: {self.game_id}")

    async def handle_play_again_request(self):
        # Send a play_again_request to the opponent
        opponent_channel_name = self.get_opponent_channel()
        if opponent_channel_name:
            await self.channel_layer.send(
                opponent_channel_name,
                {
                    'type': 'play_again_request'
                }
            )

    async def handle_play_again_response(self, data):
        accepted = data.get('accepted', False)
        opponent_channel_name = self.get_opponent_channel()
        if opponent_channel_name:
            await self.channel_layer.send(
                opponent_channel_name,
                {
                    'type': 'play_again_response',
                    'accepted': accepted
                }
            )

        if accepted:
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'start_new_game'
                }
            )
            # Reset game state on the server if needed
            pass  # Implement any server-side reset logic here
        else:
            # Close the game
            if self.game_id in self.games:
                del self.games[self.game_id]

    async def play_again_request(self, event):
        await self.send(json.dumps({
            'type': 'play_again_request'
        }))

    async def play_again_response(self, event):
        await self.send(json.dumps({
            'type': 'play_again_response',
            'accepted': event['accepted']
        }))

    @database_sync_to_async
    def update_room_players(self, change):
        try:
            room = Room.objects.get(game_id=self.game_id)
            room.players += change
            if room.players <= 0:
                room.is_active = False
            room.save()
        except Room.DoesNotExist:
            pass

    @database_sync_to_async
    def mark_room_inactive(self):
        try:
            room = Room.objects.get(game_id=self.game_id)
            room.delete()
        except Room.DoesNotExist:
            pass
