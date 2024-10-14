import {MovementStrategy} from './game.js';


export class LocalMovementStrategy extends MovementStrategy {
	constructor() {
		super();

		this.playerKeys = {
			w: false,
			s: false,
			ArrowUp: false,
			ArrowDown: false
		};
	}

	handleKeyDown(e) {
		if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
			this.playerKeys[e.key] = true;
		}
	}

	handleKeyUp(e) {
		if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
			this.playerKeys[e.key] = false;
		}
	}

	updateGameEngine() {
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

	updateRightPaddle() {
		if (this.playerKeys.ArrowUp && !this.playerKeys.ArrowDown)
			this.rightPaddle.speed = -this.paddleSpeed;
		else if (this.playerKeys.ArrowDown && !this.playerKeys.ArrowUp)
			this.rightPaddle.speed = this.paddleSpeed;
		else
			this.rightPaddle.speed = 0;
	}

	updateLeftPaddle() {
		if (this.playerKeys.w && !this.playerKeys.s)
			this.leftPaddle.speed = -this.paddleSpeed;
		else if (this.playerKeys.s && !this.playerKeys.w)
			this.leftPaddle.speed = this.paddleSpeed;
		else
			this.leftPaddle.speed = 0;
	}

	update() {
		this.updateRightPaddle();
		this.updateLeftPaddle();
		this.updateGameEngine();
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

