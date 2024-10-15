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
            pos: new THREE.Vector2(this.canvas.width / 2, this.canvas.height / 2),
            speed: new THREE.Vector2(3, 3),
        };

        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        window.addEventListener('beforeunload', this.closeGame.bind(this));
        window.addEventListener('popstate', this.closeGame.bind(this));

    }

	updateGameEngine() {
        this.updateBall();
        this.handleBallCollision();
        this.checkPaddleCollision(this.leftPaddle, true);
        this.checkPaddleCollision(this.rightPaddle, false);
	}

    draw () {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
        this.ctx.fillStyle = 'green';
    
        this.ctx.fillRect(0, this.leftPaddle.y, this.paddleWidth, this.paddleHeight);
    
        this.ctx.fillRect(this.canvas.width - this.paddleWidth, this.rightPaddle.y, this.paddleWidth, this.paddleHeight);
    
        this.ctx.beginPath();
        this.ctx.arc(this.ball.pos.x, this.ball.pos.y, this.ballRadius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    checkPaddleCollision(paddle, isLeft) {
        const paddleX = isLeft ? this.paddleWidth : this.canvas.width - this.paddleWidth;
        const withinPaddleYRange = this.ball.pos.y >= paddle.y && this.ball.pos.y <= paddle.y + this.paddleHeight;

        if (withinPaddleYRange) {
            if ((isLeft && this.ball.pos.x <= paddleX + this.paddleWidth) ||
                (!isLeft && this.ball.pos.x >= paddleX - this.paddleWidth)) {
                    this.ball.speed.x = -this.ball.speed.x;
                    const spin = new THREE.Vector2(0, paddle.speed * 0.1);
                    this.ball.speed.add(spin);
            }
        }
    }

    resetBall() {
        this.ball.pos.set(this.canvas.width / 2, this.canvas.height / 2);
        this.ball.speed.set((Math.random() > 0.5 ? 1 : -1) * 3, (Math.random() > 0.5 ? 1 : -1) * 3);
    }


    handleBallCollision() {
        if (this.ball.pos.y <= 0 || this.ball.pos.y >= this.canvas.height) {
            const normal = new THREE.Vector2(0, 1);
            const dotProduct = this.ball.speed.dot(normal);
            const reflection = normal.clone().multiplyScalar(2 * dotProduct);
            this.ball.speed.sub(reflection);
        }
        if (this.ball.pos.x < 0 || this.ball.pos.x > this.canvas.width) {
            this.resetBall();
        }
    }

    updateBall() {
        this.ball.pos.add(this.ball.speed);
    }

    closeGame() {
        throw new Error('Método close deve ser implementado');
    }

    update() {
        throw new Error('Método update deve ser implementado');
    }
}
