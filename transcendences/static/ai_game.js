import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import {LocalMovementStrategy} from './local_game.js';

// TO-DO
// [_] ai game deve herdar de local
// [_] evitar repetição de codigo

export class AIMovementStrategy extends LocalMovementStrategy {
    constructor() {
        super();
        this.playerKeys = {
			ArrowUp: false,
			ArrowDown: false
		};

        this.aiKeys = {
			w: false,
			s: false
		};

        this.currentState = 'waiting';
        this.lastUpdate = 0;
        this.updateInterval = 1000;
        this.predictedIntersection = null;

        document.addEventListener('iaMoveUp', this.moveAIPaddleUp.bind(this));
        document.addEventListener('iaMoveDown', this.moveAIPaddleDown.bind(this));
        document.addEventListener('iaStop', this.stopAIPaddle.bind(this));
    }

    handleKeyDown(e) {
		if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
			this.playerKeys[e.key] = true;
		}
	}

	handleKeyUp(e) {
		if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
			this.playerKeys[e.key] = false;
		}
	}

    AIDecitionTree() {
        if (this.currentTime - this.lastUpdate >= this.updateInterval) {
            this.lastUpdate = this.currentTime;
            console.log('1 seg has pass...', this.predictedIntersection);
            if (this.ball.speedX < 0
                && this.ball.x < this.canvas.width / 2
            ) {
                console.log('Calculating...', this.predictedIntersection);
                this.calculateTrajectory();
            }
        }
        this.movePaddle();
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
        const tolerance = 10;
        let simulatedKeyEvent;

        if (Math.abs(paddleCenter - this.predictedIntersection) < tolerance) {
            simulatedKeyEvent = new Event('iaStop');
            document.dispatchEvent(simulatedKeyEvent);
        } else if (paddleCenter < this.predictedIntersection) {
            simulatedKeyEvent = new Event('iaMoveDown');
            document.dispatchEvent(simulatedKeyEvent);
        } else if (paddleCenter > this.predictedIntersection) {
            simulatedKeyEvent = new Event('iaMoveUp');
            document.dispatchEvent(simulatedKeyEvent);
        }
    }

    updateAIPaddle() {
        if (this.aiKeys.w && !this.aiKeys.s) {
            this.leftPaddle.speed = -this.paddleSpeed;
        } else if (this.aiKeys.s && !this.aiKeys.w) {
            this.leftPaddle.speed = this.paddleSpeed;
        } else {
            this.leftPaddle.speed = 0;
        }
    }

    moveAIPaddleUp() {
        // console.log('Moving AI paddle up...');
        this.aiKeys['w'] = true;
        this.aiKeys['s'] = false;
    }
    
    moveAIPaddleDown() {
        // console.log('Moving AI paddle down...');
        this.aiKeys['s'] = true;
        this.aiKeys['w'] = false;
    }
    
    stopAIPaddle() {
        // console.log('not moving AI paddle...');
        this.aiKeys['w'] = false;
        this.aiKeys['s'] = false;
    }

    update() {
        this.updateRightPaddle();
        this.updateAIPaddle();
        this.AIDecitionTree();
        this.updateGameEngine();
    }
}