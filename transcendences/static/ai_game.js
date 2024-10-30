import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { FontLoader, TextGeometry } from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import {LocalMovementStrategy} from './local_game.js';

export class AIMovementStrategy extends LocalMovementStrategy {
	constructor() {
		super();
		this.playerKeys = {
			ArrowUp: false,
			ArrowDown: false
		};

		this.player1 = 'AI';
		this.player2 = 'YOU';

		this.aiKeys = {
			w: false,
			s: false
		};

		this.lastUpdate = 0;
		this.updateInterval = 1000;
		this.predictedIntersection = null;

		this.playerPatterns = {
			topHits: 0,
			middleHits: 0,
			bottomHits: 0,
			lastPositions: []
		};

		this.confidence = 1.0;
		this.defaultPosition = this.canvas.height / 2;

		document.addEventListener('iaMoveUp', this.moveAIPaddleUp.bind(this));
		document.addEventListener('iaMoveDown', this.moveAIPaddleDown.bind(this));
		document.addEventListener('iaStop', this.stopAIPaddle.bind(this));

		this.initThreeJS();
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

	AIDecition() {
		if (this.currentTime - this.lastUpdate >= this.updateInterval) {
			this.lastUpdate = this.currentTime;
			
			if (this.ball.speed.x < 0 && this.ball.pos.x < this.canvas.width / 2) {
				this.calculateTrajectory();
			}
			this.updatePlayerPatterns();
		}
		this.movePaddle();
	}

	calculateTrajectory() {
		const maxBounces = 3;
		let currentPos = new THREE.Vector2(this.ball.pos.x, this.ball.pos.y);
		let currentVel = new THREE.Vector2(this.ball.speed.x, this.ball.speed.y)
		let bounces = 0;
		let finalIntersection = null;
	
		while (bounces < maxBounces) {
			const timeToPaddle = (this.paddleWidth - currentPos.x) / currentVel.x;
			if (timeToPaddle <= 0)
				break;
	
			let intersectionY = currentPos.y + currentVel.y * timeToPaddle;
			
			if (intersectionY >= 0 && intersectionY <= this.canvas.height) {
				finalIntersection = intersectionY;
				break;
			}
	
			const timeToWall = currentVel.y > 0 ? 
				(this.canvas.height - currentPos.y) / currentVel.y :
				-currentPos.y / currentVel.y;
	
			currentPos.y += currentVel.y * timeToWall;
			currentVel.y *= -1;
			currentPos.x += currentVel.x * timeToWall;
			bounces++;
		}
	
		this.predictedIntersection = finalIntersection;
		this.updateConfidence();
	}

	movePaddle() {
		if (this.predictedIntersection === null) {
			this.moveToDefault();
			return;
		}
		const variation = (1 - this.confidence) * 30;
		const impactOffset = this.calculatePaddleImpactPoint() * this.paddleHeight;
		const adjustedPrediction = this.predictedIntersection + 
									(Math.random() - 0.5) * variation + impactOffset;
		const paddleCenter = this.leftPaddle.y + this.paddleHeight / 2;
		const tolerance = 10;
		let simulatedKeyEvent;
	
		let anticipation = 0;
		if (this.ball.speed.x > 0) {
			const preferredZone = this.getPreferredZone();
			anticipation = (preferredZone - paddleCenter) * 0.2;
		}
		if (Math.abs(paddleCenter - adjustedPrediction - anticipation) < tolerance) {
			simulatedKeyEvent = new Event('iaStop');
		} else if (paddleCenter < adjustedPrediction + anticipation) {
			simulatedKeyEvent = new Event('iaMoveDown');
		} else {
			simulatedKeyEvent = new Event('iaMoveUp');
		}
		document.dispatchEvent(simulatedKeyEvent);
	}

	moveToDefault() {
		const paddleCenter = this.leftPaddle.y + this.paddleHeight / 2;
		const tolerance = 10;
		
		if (Math.abs(paddleCenter - this.defaultPosition) < tolerance) {
			document.dispatchEvent(new Event('iaStop'));
		} else if (paddleCenter < this.defaultPosition) {
			document.dispatchEvent(new Event('iaMoveDown'));
		} else {
			document.dispatchEvent(new Event('iaMoveUp'));
		}
	}

	moveAIPaddle() {
		if (this.aiKeys.w && !this.aiKeys.s) {
			this.leftPaddle.speed = -this.paddleSpeed;
		} else if (this.aiKeys.s && !this.aiKeys.w) {
			this.leftPaddle.speed = this.paddleSpeed;
		} else {
			this.leftPaddle.speed = 0;
		}
	}

	moveAIPaddleUp() {
		this.aiKeys['w'] = true;
		this.aiKeys['s'] = false;
	}

	moveAIPaddleDown() {
		this.aiKeys['s'] = true;
		this.aiKeys['w'] = false;
	}

	stopAIPaddle() {
		this.aiKeys['w'] = false;
		this.aiKeys['s'] = false;
	}

	update() {
		this.moveRightPaddle();
		this.moveAIPaddle();
		this.AIDecition();
		this.updatePaddles();
		this.updateGameEngine();
	}

	updateConfidence() {
		const distanceFromPaddle = Math.abs(this.ball.pos.x - this.paddleWidth);
		const ballSpeed = Math.sqrt(
			this.ball.speed.x * this.ball.speed.x + 
			this.ball.speed.y * this.ball.speed.y
		);

		this.confidence = 1.0 - 
			(distanceFromPaddle / this.canvas.width) * 0.3 - 
			(ballSpeed / 15) * 0.2;

		this.confidence = Math.max(0.5, this.confidence);
	}

	updatePlayerPatterns() {
		if (this.ball.speed.x > 0 && this.lastBallPos) {
			const hitPosition = this.ball.pos.y;
			const zoneSize = this.canvas.height / 3;

			if (hitPosition < zoneSize) this.playerPatterns.topHits++;
			else if (hitPosition < zoneSize * 2) this.playerPatterns.middleHits++;
			else this.playerPatterns.bottomHits++;

			this.playerPatterns.lastPositions.push(hitPosition);
			if (this.playerPatterns.lastPositions.length > 5) {
				this.playerPatterns.lastPositions.shift();
			}
		}
		this.lastBallPos = {...this.ball.pos};
	}

	getPreferredZone() {
		const total = this.playerPatterns.topHits + 
						this.playerPatterns.middleHits + 
						this.playerPatterns.bottomHits;
		
		if (total < 5)
			return this.canvas.height / 2;

		const topProb = this.playerPatterns.topHits / total;
		const middleProb = this.playerPatterns.middleHits / total;
		const bottomProb = this.playerPatterns.bottomHits / total;

		const maxProb = Math.max(topProb, middleProb, bottomProb);
		
		if (maxProb === topProb)
			return this.canvas.height * 0.25;
		if (maxProb === bottomProb)
			return this.canvas.height * 0.75;
		return this.canvas.height / 2;
	}

	calculatePaddleImpactPoint() {

		if (this.ball.speed.x < 0) {
			const ballSpeed = Math.sqrt(
				this.ball.speed.x * this.ball.speed.x + 
				this.ball.speed.y * this.ball.speed.y
			);
			const total = this.playerPatterns.topHits + 
						this.playerPatterns.middleHits + 
						this.playerPatterns.bottomHits;
			if (total > 5) {
				const topProb = this.playerPatterns.topHits / total;
				const bottomProb = this.playerPatterns.bottomHits / total;
				if (topProb > 0.5) {
					return 0.3;
				}
				if (bottomProb > 0.5) {
					return -0.3;
				}
			}
			if (ballSpeed > this.maxBallSpeed * 0.8) {
				return 0;
			}
		
			return (Math.random() - 0.5) * 0.4;
		}
		return 0;
	}
}
