import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
export { MovementStrategy };

export let canvas;
export let context;

export function initGame(mvStrategy) {
    gameLoop(mvStrategy);
}

export const gameLoop = (mvStrategy) => {
    mvStrategy.animationFrameId = requestAnimationFrame((timestamp) => {
        if (!mvStrategy.isRunning)
            return ;
        mvStrategy.currentTime = timestamp;
        if (mvStrategy.start) {
            mvStrategy.update();
            mvStrategy.draw();
        }
        gameLoop(mvStrategy)
    });
};

class MovementStrategy {
    constructor() {
        this.start = true;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.isRunning = true;
        this.animationFrameId = null;
        this.currentTime = 0;

        this.paddleHeight = 100;
        this.paddleWidth = 10;
        this.ballRadius = 8;
        this.paddleSpeed = 5;

        this.leftPaddle = {
            y: this.canvas.height / 2 - this.paddleHeight / 2,
            speed: 0
        };
          
        this.rightPaddle = {
            y: this.canvas.height / 2 - this.paddleHeight / 2,
            speed: 0
        };
          
        this.ball = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            speedX: 3,
            speedY: 3
        };

        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        window.addEventListener('beforeunload', this.closeGame.bind(this));
        window.addEventListener('popstate', this.closeGame.bind(this));

    }

	updateGameEngine() {
        this.updateBall();
        this.handleBallCollision();
        if (this.checkPaddleCollision(this.leftPaddle, true) || 
        this.checkPaddleCollision(this.rightPaddle, false)) {
            this.ball.speedX = -this.ball.speedX;
        }
	}

    draw () {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
        this.ctx.fillStyle = 'green';
    
        this.ctx.fillRect(0, this.leftPaddle.y, this.paddleWidth, this.paddleHeight);
    
        this.ctx.fillRect(this.canvas.width - this.paddleWidth, this.rightPaddle.y, this.paddleWidth, this.paddleHeight);
    
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ballRadius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    checkPaddleCollision(paddle, isLeft) {
        const paddleX = isLeft ? this.paddleWidth : this.canvas.width - this.paddleWidth;
        const withinPaddleYRange = this.ball.y >= paddle.y && this.ball.y <= paddle.y + this.paddleHeight;
    
        if (!withinPaddleYRange) {
            return false;
        }

        if (isLeft) {
            return this.ball.x >= paddleX && this.ball.x <= paddleX + this.paddleWidth;
        } else {
            return this.ball.x <= paddleX && this.ball.x >= paddleX - this.paddleWidth;
        }
    }

    resetBall() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        this.ball.speedX = -this.ball.speedX;
    }


    handleBallCollision() {
        if (this.ball.y <= 0 || this.ball.y >= this.canvas.height) {
            this.ball.speedY = -this.ball.speedY;
        }
        if (this.ball.x < 0 || this.ball.x > this.canvas.width) {
            this.resetBall();
        }
    }

    updateBall() {
        this.ball.x += this.ball.speedX;
        this.ball.y += this.ball.speedY;
    }

    closeGame() {
        throw new Error('Método close deve ser implementado');
    }

    update() {
        throw new Error('Método update deve ser implementado');
    }
}
