import {MovementStrategy} from './game.js';

export class OnlineMovementStrategy extends MovementStrategy {
    constructor(websocket) {
        super();
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.websocket = websocket;
        this.isHost = false;

        this.isRunning = true;
        this.start = false;
        this.animationFrameId = null;

        this.paddleHeight = 100;
        this.paddleWidth = 10;
        this.ballRadius = 8;
        
        this.leftPaddle = {
          y: this.canvas.height / 2 - this.paddleHeight / 2,
          speed: 0
        };
        
        this.rightPaddle = {
          y: this.canvas.height / 2 - this.paddleHeight / 2,
          speed: 0
        };

        this.keys = {
            up: false,
            down: false
        };
        
        this.ball = {
          x: this.canvas.width / 2,
          y: this.canvas.height / 2,
          speedX: 3,
          speedY: 3
        };
        
        this.paddleSpeed = 5;
        
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        window.addEventListener('beforeunload', this.closeGame.bind(this));
        
        this.setupWebSocket();
        this.animate();
    }

    setupWebSocket() {
        this.websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
    }

    handleWebSocketMessage(data) {
        switch(data.type) {
            case 'game_status':
                this.isHost = data.is_host;
                break;
            case 'game_start':
                this.start = true;
                break;
            case 'game_state':
                if (this.isHost) {
                    this.rightPaddle.y = data.opponent_paddle;
                } else {
                    this.leftPaddle.y = data.opponent_paddle;
                    this.ball = data.ball;
                }
                break;
            case 'game_end':
                this.closeGame();
                break;
        }
    }
      
    handleKeyDown(e) {
        if (e.key === 'ArrowUp') this.keys.up = true;
        if (e.key === 'ArrowDown') this.keys.down = true;
    }
      
    handleKeyUp(e) {
        if (e.key === 'ArrowUp') this.keys.up = false;
        if (e.key === 'ArrowDown') this.keys.down = false;
    }
      
    update() {
        let paddleSpeed = 0;
        if (this.keys.up && !this.keys.down) paddleSpeed = -this.paddleSpeed;
        else if (this.keys.down && !this.keys.up) paddleSpeed = this.paddleSpeed;

        if (this.isHost) {
            this.leftPaddle.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, 
                this.leftPaddle.y + paddleSpeed));
            
            // Host atualiza a bola
            this.updateBall();
            
            // Envia estado do jogo
            this.sendGameState(this.leftPaddle.y);
        } else {
            this.rightPaddle.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, 
                this.rightPaddle.y + paddleSpeed));
            
            // Client envia apenas sua posição
            this.sendGameState(this.rightPaddle.y);
        }
    }

    updateBall() {
        this.ball.x += this.ball.speedX;
        this.ball.y += this.ball.speedY;
        
        if (this.ball.y <= 0 || this.ball.y >= this.canvas.height) {
            this.ball.speedY = -this.ball.speedY;
        }

        if (this.checkPaddleCollision(this.leftPaddle, true) || 
            this.checkPaddleCollision(this.rightPaddle, false)) {
            this.ball.speedX = -this.ball.speedX;
        }

        if (this.ball.x < 0 || this.ball.x > this.canvas.width) {
            this.resetBall();
        }
    }

    sendGameState(paddleY) {
        const gameState = {
            type: 'paddle_update',
            paddle_y: paddleY
        };

        if (this.isHost) {
            gameState.ball = this.ball;
        }

        this.websocket.send(JSON.stringify(gameState));
    }
      
    checkPaddleCollision(paddle, isLeft) {
        const paddleX = isLeft ? this.paddleWidth : this.canvas.width - this.paddleWidth;

        return this.ball.y >= paddle.y && 
               this.ball.y <= paddle.y + this.paddleHeight &&
               (isLeft ? 
                 this.ball.x <= paddleX + this.paddleWidth && this.ball.x >= paddleX :
                 this.ball.x >= paddleX - this.paddleWidth && this.ball.x <= paddleX);
    }
      
    resetBall() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        this.ball.speedX = -this.ball.speedX;
    }
      
    draw() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = 'green';

        this.ctx.fillRect(0, this.leftPaddle.y, this.paddleWidth, this.paddleHeight);

        this.ctx.fillRect(this.canvas.width - this.paddleWidth, this.rightPaddle.y, this.paddleWidth, this.paddleHeight);

        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ballRadius, 0, Math.PI * 2);
        this.ctx.fill();
    }
      
    animate() {
        if (!this.isRunning)
            return;
        if (this.start) {
            this.update();
            this.draw();
        }
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    }

    closeGame() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.websocket.close();
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('keyup', this.handleKeyUp);
    }
}
