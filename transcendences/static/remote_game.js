import {MovementStrategy} from './game.js';

export class OnlineMovementStrategy extends MovementStrategy {
    constructor(websocket) {
        super();
        this.websocket = websocket;
        this.isHost = false;

        this.start = false;

        this.keys = {
            up: false,
            down: false
        };

        this.setupWebSocket();
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
            // case 'room_full':
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

    //deve virar server side
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

    closeGame() {
        console.log('Game closed');
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        if (this.websocket) {
            this.websocket.close();
        }
        document.removeEventListener('keydown', this.boundHandleKeyDown);
        document.removeEventListener('keyup', this.boundHandleKeyUp);
        window.removeEventListener('beforeunload', this.boundCloseGame);
        window.removeEventListener('popstate', this.boundCloseGame);
    }
}
