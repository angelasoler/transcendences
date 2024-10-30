import json
import asyncio
import time
import os
import aioredis
import uuid
from pydoc import plain

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Room

LOGICAL_WIDTH = 600
LOGICAL_HEIGHT = 400
PADDLE_WIDTH = 10
PADDLE_HEIGHT = 100
BALL_RADIUS = 8
MAX_BALL_SPEED = 8  # Adjust based on your game settings

class PongConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.game_id = None
        self.game_group_name = None
        self.collision_speed_x = 7
        self.lock = asyncio.Lock()
    games = {}

    async def connect(self):
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.game_group_name = f'pong_{self.game_id}'
        self.user = self.scope['user']
        self.player_id = str(uuid.uuid4())

        if not self.user.is_authenticated:
            await self.close()
            return

        #Init redis
        self.redis = await aioredis.create_redis_pool(os.environ.get('REDIS_URL'))

        await self.channel_layer.group_add(
            self.game_group_name,
            self.channel_name
        )

        await self.accept()

        await self.add_player_to_game()
        await database_sync_to_async(self.increment_room_player_count)()

        player_count = await self.get_player_count()

        if player_count == 2:

            await self.start_game()



    async def disconnect(self, close_code):
        # Remove player from the game
        await self.remove_player_from_game()
        await self.decrement_room_player_count()



        # Leave the game group
        await self.channel_layer.group_discard(
            self.game_group_name,
            self.channel_name
        )

        # Close redis connection
        self.redis.close()
        await self.redis.wait_closed()

    async def receive(self, text_data):
        data = json.loads(text_data)
        data_type = data.get('type')

        if data_type == 'paddle_move':
            # Update paddle position
            await self.update_paddle_position(data)
        elif data_type == 'game_over':
            # Handle game over
            await self.handle_game_over(data)
        elif data_type == 'game_end':
            await self.handle_game_end()


    # Helper methods

    async def opponent_disconnected(self, event):
        # Declare the player as the winner
        await self.send(json.dumps({
            'type': 'game_over',
            'winner': self.player_side
        }))
        # Cancel the game loop if it's running
        if hasattr(self, 'game_task'):
            self.game_task.cancel()

    def increment_room_player_count(self):
        try:
            room = Room.objects.get(game_id=self.game_id)
            room.players += 1
            room.save()
        except Room.DoesNotExist:
            # Room should already exist, but handle the case if it doesn't
            pass

    async def decrement_room_player_count(self):
        try:
            # Perform database operations asynchronously
            room = await database_sync_to_async(Room.objects.get)(game_id=self.game_id)
            room.players -= 1
            if room.players == 1:
                # Get the channel name of the remaining player
                remaining_player_channel = await self.get_remaining_player_channel()
                if remaining_player_channel:
                    # Notify the remaining player that they have won
                    await self.channel_layer.send(
                        remaining_player_channel,
                        {
                            'type': 'opponent_disconnected',
                        }
                    )

            if room.players <= 0:
                # Delete the room
                await database_sync_to_async(room.delete)()
                # No players left, clean up the game state
                await self.redis.delete(f'game:{self.game_id}:state')
                await self.redis.delete(f'game:{self.game_id}:players')
                await self.redis.delete(f'game:{self.game_id}:channels')
            else:
                # Save the room
                await database_sync_to_async(room.save)()
        except Room.DoesNotExist:
            pass

    async def add_player_to_game(self):
        # Use Redis to store player info
        player_key = f'game:{self.game_id}:players'
        await self.redis.sadd(player_key, self.player_id)
        # Set an expiration time of 1 hour (or any suitable time)
        await self.redis.expire(player_key, 3600)

        # Store channel name associated with player ID
        await self.redis.hset(f'game:{self.game_id}:channels', self.player_id, self.channel_name)

        # Set an expiration time for the channels hash
        await self.redis.expire(f'game:{self.game_id}:channels', 3600)

        # Store username in Redis
        await self.redis.hset(f'game:{self.game_id}:usernames', self.player_id, self.user.username)

        # Determine player side
        player_count = await self.redis.scard(player_key)
        self.player_side = 'left' if player_count == 1 else 'right'

        # Assign player role in Redis
        if self.player_side == 'left':
            await self.redis.set(f'game:{self.game_id}:left_player', self.player_id)
        elif self.player_side == 'right':
            await self.redis.set(f'game:{self.game_id}:right_player', self.player_id)

        # Send initial game data to the player
        await self.send(json.dumps({
            'type': 'game_joined',
            'player_side': self.player_side,
            'canvas_width': LOGICAL_WIDTH,
            'canvas_height': LOGICAL_HEIGHT
        }))

    async def get_remaining_player_channel(self):
        # Get all player IDs
        player_key = f'game:{self.game_id}:players'
        player_ids = await self.redis.smembers(player_key)

        # Remove current player's ID
        remaining_player_ids = [pid for pid in player_ids if pid != self.player_id]

        if remaining_player_ids:
            remaining_player_id = remaining_player_ids[0]
            # Get channel name from Redis
            channel_name = await self.redis.hget(f'game:{self.game_id}:channels', remaining_player_id)
            return channel_name.decode('utf-8') if channel_name else None
        return None

    async def remove_player_from_game(self):
        player_key = f'game:{self.game_id}:players'
        await self.redis.srem(player_key, self.player_id)

        # If no players left, remove game state
        player_count = await self.redis.scard(player_key)
        if player_count == 0:
            await self.redis.delete(f'game:{self.game_id}:state')

    async def get_player_count(self):
        player_key = f'game:{self.game_id}:players'
        player_count = await self.redis.scard(player_key)

        return player_count

    async def start_game(self):
        # Retrieve player IDs
        left_player_id = await self.redis.get(f'game:{self.game_id}:left_player', encoding='utf-8')
        right_player_id = await self.redis.get(f'game:{self.game_id}:right_player', encoding='utf-8')

        # Retrieve usernames from Redis
        usernames_key = f'game:{self.game_id}:usernames'
        usernames = await self.redis.hgetall(usernames_key, encoding='utf-8')

        left_player_username = usernames.get(left_player_id, 'Player1')
        right_player_username = usernames.get(right_player_id, 'Player2')

        # Initialize game state
        game_state = {
            'ball_x': LOGICAL_WIDTH / 2,
            'ball_y': LOGICAL_HEIGHT / 2,
            'ball_speed_x': 5,  # Use your initial speed
            'ball_speed_y': 0,
            'paddle_left_y': LOGICAL_HEIGHT / 2 - PADDLE_HEIGHT / 2,
            'paddle_right_y': LOGICAL_HEIGHT / 2 - PADDLE_HEIGHT / 2,
            'paddle_left_speed': 0,
            'paddle_right_speed': 0,
            'score_left': 0,
            'score_right': 0,
            'player1_username': left_player_username,
            'player2_username': right_player_username,
        }
        self.collision_speed_x = 7  # Adjust based on your game settings
        await self.save_game_state(game_state)

        # Notify players that the game is starting
        await self.channel_layer.group_send(
            self.game_group_name,
            {
                'type': 'game_start',
                'game_state': game_state
            }
        )


        # Start the game loop
        self.game_task = asyncio.create_task(self.game_loop())

    async def save_game_state(self, game_state):
        state_key = f'game:{self.game_id}:state'
        await self.redis.set(state_key, json.dumps(game_state))

    async def load_game_state(self):
        state_key = f'game:{self.game_id}:state'
        state_data = await self.redis.get(state_key)
        if state_data:
            return json.loads(state_data)
        return None

    async def game_loop(self):
        while True:
            game_state = await self.load_game_state()
            if not game_state:
                break  # Game state not found, exit loop

            # Update game state
            game_state = await self.update_game_state(game_state)

            # Save updated game state
            await self.save_game_state(game_state)

            # Broadcast game state to players
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'game_update',
                    'timestamp': time.time() * 1000,
                    'ball_x': game_state['ball_x'],
                    'ball_y': game_state['ball_y'],
                    'ball_speed_x': game_state['ball_speed_x'],
                    'ball_speed_y': game_state['ball_speed_y'],
                    'paddle_left_y': game_state['paddle_left_y'],
                    'paddle_right_y': game_state['paddle_right_y'],
                    'score_left': game_state['score_left'],
                    'score_right': game_state['score_right'],
                }
            )

            await asyncio.sleep(0.033)  #  FPS

    async def update_game_state(self, game_state):
        # Update ball position
        game_state['ball_x'] += game_state['ball_speed_x']
        game_state['ball_y'] += game_state['ball_speed_y']

        # Check for wall collisions
        if game_state['ball_y'] - BALL_RADIUS <= 0 or game_state['ball_y'] + BALL_RADIUS >= LOGICAL_HEIGHT:
            game_state['ball_speed_y'] *= -1
            # Adjust ball position to prevent sticking
            if game_state['ball_y'] - BALL_RADIUS <= 0:
                game_state['ball_y'] = BALL_RADIUS
            else:
                game_state['ball_y'] = LOGICAL_HEIGHT - BALL_RADIUS

        # Check for paddle collisions
        game_state = await self.check_paddle_collision(game_state, is_left=True)
        game_state = await self.check_paddle_collision(game_state, is_left=False)

        # Check for scoring
        if game_state['ball_x'] < 0:
            game_state['score_right'] += 1
            await self.reset_ball(game_state, direction='right')
        elif game_state['ball_x'] > LOGICAL_WIDTH:
            game_state['score_left'] += 1
            await self.reset_ball(game_state, direction='left')
        return game_state

    async def check_paddle_collision(self, game_state, is_left):
        paddle_x = PADDLE_WIDTH if is_left else LOGICAL_WIDTH - PADDLE_WIDTH
        paddle_y = game_state['paddle_left_y'] if is_left else game_state['paddle_right_y']
        paddle_speed = game_state['paddle_left_speed'] if is_left else game_state['paddle_right_speed']
        ball_x = game_state['ball_x']
        ball_y = game_state['ball_y']

        within_paddle_y_range = paddle_y <= ball_y <= paddle_y + PADDLE_HEIGHT

        # Adjusted collision detection
        if within_paddle_y_range:
            if (is_left and ball_x - BALL_RADIUS <= paddle_x + PADDLE_WIDTH) or \
                    (not is_left and ball_x + BALL_RADIUS >= paddle_x - PADDLE_WIDTH):

                # Adjust ball's horizontal speed
                game_state['ball_speed_x'] = self.collision_speed_x if is_left else -self.collision_speed_x

                # Adjust vertical speed based on where the ball hits the paddle
                hit_position = ((ball_y - paddle_y) / PADDLE_HEIGHT) - 0.5  # Range from -0.5 to 0.5
                game_state['ball_speed_y'] = hit_position * 5  # Adjust vertical speed

                # Add spin based on paddle speed
                spin = paddle_speed * 0.1
                game_state['ball_speed_y'] += spin

                # Normalize speed to prevent excessive speed
                speed = (game_state['ball_speed_x'] ** 2 + game_state['ball_speed_y'] ** 2) ** 0.5
                if speed > MAX_BALL_SPEED:
                    factor = MAX_BALL_SPEED / speed
                    game_state['ball_speed_x'] *= factor
                    game_state['ball_speed_y'] *= factor

                # Adjust ball position to prevent sticking
                offset = (PADDLE_WIDTH + BALL_RADIUS) if is_left else -(PADDLE_WIDTH + BALL_RADIUS)
                game_state['ball_x'] = paddle_x + offset

        return game_state

    async def reset_ball(self, game_state, direction):
        game_state['ball_x'] = LOGICAL_WIDTH / 2
        game_state['ball_y'] = LOGICAL_HEIGHT / 2
        speed = 3  # Use your initial speed
        game_state['ball_speed_x'] = speed if direction == 'left' else -speed
        game_state['ball_speed_y'] = 0
        # Reset paddle speeds
        game_state['paddle_left_speed'] = 0
        game_state['paddle_right_speed'] = 0

    async def update_paddle_position(self, data):
        game_state = await self.load_game_state()
        if not game_state:
            return

        paddle_speed = data.get('paddle_speed', 0)
        if self.player_side == 'left':
            game_state['paddle_left_y'] += paddle_speed
            game_state['paddle_left_y'] = max(0, min(LOGICAL_HEIGHT - PADDLE_HEIGHT, game_state['paddle_left_y']))
            game_state['paddle_left_speed'] = paddle_speed  # Store the paddle speed
        else:
            game_state['paddle_right_y'] += paddle_speed
            game_state['paddle_right_y'] = max(0, min(LOGICAL_HEIGHT - PADDLE_HEIGHT, game_state['paddle_right_y']))
            game_state['paddle_right_speed'] = paddle_speed  # Store the paddle speed

        await self.save_game_state(game_state)

    async def handle_game_over(self, data):
        # Handle game over logic
        await self.channel_layer.group_send(
            self.game_group_name,
            {
                'type': 'game_over',
                'winner': data.get('winner'),
            }
        )

    async def handle_game_end(self):
        # Notify other player
        await self.channel_layer.group_send(
            self.game_group_name,
            {
                'type': 'game_end',
                'sender_channel_name': self.channel_name
            }
        )

        # Clean up game state
        await self.redis.delete(f'game:{self.game_id}:state')
        await self.redis.delete(f'game:{self.game_id}:players')

        # Close the connection for this client
        await self.close()

    # Event handlers

    async def game_start(self, event):
        await self.send(json.dumps({
            'type': 'game_start',
            'game_state': event['game_state']
        }))

    async def game_update(self, event):
        await self.send(json.dumps({
            'type': 'game_update',
            'timestamp': event['timestamp'],
            'ball_x': event['ball_x'],
            'ball_y': event['ball_y'],
            'ball_speed_x': event['ball_speed_x'],
            'ball_speed_y': event['ball_speed_y'],
            'paddle_left_y': event['paddle_left_y'],
            'paddle_right_y': event['paddle_right_y'],
            'score_left': event['score_left'],
            'score_right': event['score_right'],
        }))

    async def game_over(self, event):
        await self.send(json.dumps({
            'type': 'game_over',
            'winner': event['winner']
        }))
        # Cancel the game loop
        if hasattr(self, 'game_task'):
            self.game_task.cancel()

    async def game_end(self, event):
        if event['sender_channel_name'] != self.channel_name:
            # The other player has ended the game
            await self.send(json.dumps({
                'type': 'game_end',
            }))

            # Clean up game state
            await self.redis.delete(f'game:{self.game_id}:state')
            await self.redis.delete(f'game:{self.game_id}:players')

            # Close the connection for this client
            await self.close()

    async def game_end(self, event):
        await self.send(json.dumps({
            'type': 'game_end',
        }))

        # Close the connection
        await self.close()

