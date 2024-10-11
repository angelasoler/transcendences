import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import {MovementStrategy} from './game.js';

export class AIMovementStrategy extends MovementStrategy {
    constructor() {
        super();
        this.keys = {
            ArrowUp: false,
            ArrowDown: false
        };

        this.currentState = 'waiting';
        this.lastUpdate = 0;
        this.updateInterval = 1000;
        this.predictedIntersection = null;

    }

    handleKeyDown(e) {
        if (e.key === 'ArrowUp') this.keys.ArrowUp = true;
        if (e.key === 'ArrowDown') this.keys.ArrowDown = true;
    }
      
    handleKeyUp(e) {
        if (e.key === 'ArrowUp') this.keys.ArrowUp = false;
        if (e.key === 'ArrowDown') this.keys.ArrowDown = false;
    }

    // Máquina de estados da IA
    updateAI(currentTime) {
        if (currentTime - this.lastUpdate < this.updateInterval) {
            return;
        }
        this.lastUpdate = currentTime;

        switch (this.currentState) {
            case 'waiting':
                console.log('Waiting for ball to move...');
                if (this.ball.speedX < 0) {
                    this.currentState = 'calculating';
                }
                break;

            case 'calculating':
                console.log('Calculating trajectory...');
                this.calculateTrajectory();
                this.currentState = 'moving';
                break;

            case 'moving':
                this.movePaddle();
                if (this.ball.speedX > 0) {
                    this.currentState = 'waiting';
                }
                break;
        }
    }

    calculateTrajectory() {
        const ballPos = new THREE.Vector2(this.ball.x, this.ball.y);
        const ballVelocity = new THREE.Vector2(this.ball.speedX, this.ball.speedY);
        
        const timeToPaddle = (this.paddleWidth - ballPos.x) / ballVelocity.x;
        const intersectionY = ballPos.y + ballVelocity.y * timeToPaddle;


        let futureY = intersectionY;
        const canvasHeight = this.canvas.height;
        
        if (futureY < 0) {
            futureY = Math.abs(futureY);
        } else if (futureY > canvasHeight) {
            futureY = canvasHeight - (futureY - canvasHeight);
        }

        this.predictedIntersection = futureY;
    }

    movePaddle() {
        if (this.predictedIntersection === null) return;

        const paddleCenter = this.leftPaddle.y + this.paddleHeight / 2;
        const targetDiff = this.predictedIntersection - paddleCenter;

        const tolerance = 10;

        if (Math.abs(targetDiff) > tolerance) {
            if (targetDiff > 0) {
                this.leftPaddle.speed = this.paddleSpeed;
            } else {
                this.leftPaddle.speed = -this.paddleSpeed;
            }
        } else {
            this.leftPaddle.speed = 0;
        }
    }

    update(currentTime) {
        if (this.keys.ArrowUp && !this.keys.ArrowDown) {
            this.rightPaddle.speed = -this.paddleSpeed;
        } else if (this.keys.ArrowDown && !this.keys.ArrowUp) {
            this.rightPaddle.speed = this.paddleSpeed;
        } else {
            this.rightPaddle.speed = 0;
        }

        this.updateAI(currentTime);

        this.leftPaddle.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, 
            this.leftPaddle.y + this.leftPaddle.speed));
        this.rightPaddle.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, 
            this.rightPaddle.y + this.rightPaddle.speed));

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

    closeGame() {
		console.log('Game closed');
		this.isRunning = false;
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
		}
		document.removeEventListener('keydown', this.handleKeyDown);
		document.removeEventListener('keyup', this.handleKeyUp);
	}
}