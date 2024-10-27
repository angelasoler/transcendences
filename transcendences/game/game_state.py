import asyncio

class GameState:
    def __init__(self, game_id, canvas_width, canvas_height):
        self.game_id = game_id
        self.canvas_width = canvas_width
        self.canvas_height = canvas_height
        self.paddle_height = 100
        self.paddle_width = 10
        self.ball_radius = 8
        self.lock = asyncio.Lock()

        # Initial positions
        self.ball_position = [self.canvas_width / 2, self.canvas_height / 2]
        self.ball_velocity = [3, 0]  # Starts moving vertically
        self.paddle_positions = {
            'left': self.canvas_height / 2 - self.paddle_height / 2,
            'right': self.canvas_height / 2 - self.paddle_height / 2
        }
        self.paddle_speeds = {'left': 0, 'right': 0}
        self.scores = {'left': 0, 'right': 0}