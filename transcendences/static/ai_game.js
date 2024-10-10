import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import {MovementStrategy} from './game.js';

export class AIMovementStrategy extends MovementStrategy {
    constructor() {
        super();

        // Teclas para o jogador humano (setas)
		this.keys = {
			w: false,
			s: false,
			ArrowUp: false,
			ArrowDown: false
		};
        // Configuração da IA
        this.currentState = 'waiting';
        this.lastUpdate = performance.now();
        this.updateInterval = 1000;
        this.predictedIntersection = null;
    }


	handleKeyDown(e) {
		if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
			this.keys[e.key] = true;
		}
	}

	handleKeyUp(e) {
		if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
			this.keys[e.key] = false;
		}
	}

    // Máquina de estados da IA
    updateState(currentTime) {
        switch (this.currentState) {
            case 'waiting':
                // console.log('Waiting for ball to move...');
                if (currentTime - this.lastUpdate >= this.updateInterval) {
                    this.currentState = 'calculating';
                }
                break;
                
            case 'calculating':
                // console.log('Calculating trajectory...');
                this.calculateTrajectory();
                this.currentState = 'moving';
                break;
                
            case 'moving':
                // if (this.predictedIntersection !== NaN) {
                //     console.log('moving..', this.predictedIntersection);
                // }
                this.movePaddle();
                this.lastUpdate = currentTime;
                this.currentState = 'waiting';
                break;
        }
    }

    calculateTrajectory() {
        // const ballPos = new THREE.Vector2(this.ball.x, this.ball.y);
        // const ballVelocity = new THREE.Vector2(this.ball.speedX, this.ball.speedY);

        // if (ballVelocity.x >= 0) {
        //     // A bola está se afastando, não precisa mover a raquete
        //     this.predictedIntersection = this.canvas.height / 2; // Centro
        //     return;
        // }

        // // Prever onde a bola intersectará com a raquete da IA
        // const timeToReachPaddle = (this.leftPaddleX + this.paddleWidth - ballPos.x) / ballVelocity.x;
        // const intersectionY = ballPos.y + ballVelocity.y * timeToReachPaddle;

        // // Considerar rebotes nas paredes
        // let finalY = intersectionY;
        // const canvasHeight = this.canvas.height;

        // if (finalY < 0) {
        //     finalY = Math.abs(finalY);
        // } else if (finalY > canvasHeight) {
        //     finalY = canvasHeight - (finalY - canvasHeight);
        // }

        // this.predictedIntersection = finalY;
        
        const aiPaddleX = this.paddleWidth;
        const ballPos = new THREE.Vector2(this.ball.x, this.ball.y);
        const ballVelocity = new THREE.Vector2(this.ball.speedX, this.ball.speedY);
        const deltaX = aiPaddleX - ballPos.x;
        const timeToPaddle = deltaX / ballVelocity.x;

        // console.log('ballpos', ballPos, 'ballVelocity', ballVelocity, 'deltaX', deltaX, 'timeToPaddle', timeToPaddle)
      
        if (timeToPaddle < 0) {
          // A bola está se afastando; retornar posição central
          return this.canvas.height / 2;
        }
      
        let futureY = ballPos.y + ballVelocity.y * timeToPaddle;
      
        // Considerar rebotes nas bordas
        const tableHeight = this.canvas.height;
      
        while (futureY < 0 || futureY > tableHeight) {
          if (futureY < 0) {
            futureY = -futureY;
          } else if (futureY > tableHeight) {
            futureY = 2 * tableHeight - futureY;
          }
        }
      
        this.predictedIntersection = futureY;
    }


    simulateKeyPress(key) {
        console.log('key down');
        const event = new KeyboardEvent('keydown', { key: key });
        window.dispatchEvent(event);
    }
    
    simulateKeyRelease(key) {
        console.log('key up');
        const event = new KeyboardEvent('keyup', { key: key });
        window.dispatchEvent(event);
    }

    movePaddle() {
        if (this.predictedIntersection === null) {
            console.log('No predicted intersection. Waiting...');
            return;
        }

        const paddleCenter = this.leftPaddle.y + this.paddleHeight / 2;
        const targetDiff = this.predictedIntersection - paddleCenter;

        const tolerance = 10;

        // console.log('update paddles', targetDiff, paddleCenter, 'tolerance', tolerance, 'diff', Math.abs(targetDiff) > tolerance);
        if (Math.abs(targetDiff) > tolerance) {
            if (targetDiff > 0) {
                this.simulateKeyPress('s');
            } else {
                this.simulateKeyPress('w');
            }
        } else {
            this.simulateKeyRelease('w');
            this.simulateKeyRelease('s');
        }
    }
    
    update() {
        this.updateState(this.currentTime);
        //ia
        if (this.keys.w && !this.keys.s)
			this.leftPaddle.speed = -this.paddleSpeed;
		else if (this.keys.s && !this.keys.w)
			this.leftPaddle.speed = this.paddleSpeed;
		else
			this.leftPaddle.speed = 0;

        //jogador humano
        if (this.keys.ArrowUp && !this.keys.ArrowDown) {
            this.rightPaddle.speed = -this.paddleSpeed;
        } else if (this.keys.ArrowDown && !this.keys.ArrowUp) {
            this.rightPaddle.speed = this.paddleSpeed;
        }
        else
            this.rightPaddle.speed = 0;


        // Atualiza posições dos paddles
		this.leftPaddle.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, this.leftPaddle.y + this.leftPaddle.speed));
		this.rightPaddle.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, this.rightPaddle.y + this.rightPaddle.speed));

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
}
