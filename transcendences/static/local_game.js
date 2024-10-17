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

	updatePaddles() {
		this.leftPaddle.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, 
            this.leftPaddle.y + this.leftPaddle.speed));
        this.rightPaddle.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, 
            this.rightPaddle.y + this.rightPaddle.speed));
	}

	moveRightPaddle() {
		if (this.playerKeys.ArrowUp && !this.playerKeys.ArrowDown)
			this.rightPaddle.speed = -this.paddleSpeed;
		else if (this.playerKeys.ArrowDown && !this.playerKeys.ArrowUp)
			this.rightPaddle.speed = this.paddleSpeed;
		else
			this.rightPaddle.speed = 0;
	}

	moveLeftPaddle() {
		if (this.playerKeys.w && !this.playerKeys.s)
			this.leftPaddle.speed = -this.paddleSpeed;
		else if (this.playerKeys.s && !this.playerKeys.w)
			this.leftPaddle.speed = this.paddleSpeed;
		else
			this.leftPaddle.speed = 0;
	}

	update() {
		this.moveRightPaddle();
		this.moveLeftPaddle();
		this.updatePaddles();
		this.updateGameEngine();
	}
  
	closeGame() {
		console.log('Game closed');
		this.isRunning = false;
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
		}
		document.removeEventListener('keydown', this.boundHandleKeyDown);
    document.removeEventListener('keyup', this.boundHandleKeyUp);
    window.removeEventListener('beforeunload', this.boundCloseGame);
    window.removeEventListener('popstate', this.boundCloseGame);
	}
}

