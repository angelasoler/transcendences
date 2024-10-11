import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.contrib.auth.models import User
from .models import Room



class RoomsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = 'online_rooms'


        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        print(f"WebSocket connected: {self.channel_name}")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        print(f"WebSocket disconnected: {self.channel_name}")

    # Receive message from WebSocket
    # Maybe handle messages from the client if needed
    # async def receive(self, text_data):
        # pass

    # Receive message from room group
    async def rooms_update(self, event):
        await self.send(text_data=json.dumps(event['message']))


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

        async with self.lock:
            await self.increment_players()

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
                async with self.lock:
                    await self.decrement_players()
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

        await self.close()

    @database_sync_to_async
    def increment_players(self):
        try:
            room = Room.objects.get(game_id=self.game_id)
            room.players += 1
            room.save()
        except Room.DoesNotExist:
            pass  # Handle error if needed

    @database_sync_to_async
    def decrement_players(self):
        try:
            room = Room.objects.get(game_id=self.game_id)
            room.players -= 1
            if room.players <= 0:
                # Set room as inactive and delete it
                room.is_active = False
                room.save()
                room.delete()
                # Broadcast room deletion
                self.broadcast_room_deletion()
            else:
                room.save()
                # Broadcast room update
                self.broadcast_room_update(room)
        except Room.DoesNotExist:
            pass  # Handle error if needed

    def broadcast_room_update(self, room):
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'online_rooms',
            {
                'type': 'rooms.update',
                'message': {
                    'action': 'update',
                    'room': {
                        'game_id': room.game_id,
                        'players': room.players,
                        'created_by': room.created_by.username,
                    }
                }
            }
        )

    def broadcast_room_deletion(self):
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'online_rooms',
            {
                'type': 'rooms.update',
                'message': {
                    'action': 'delete',
                    'room': {
                        'game_id': self.game_id,
                    }
                }
            }
        )
