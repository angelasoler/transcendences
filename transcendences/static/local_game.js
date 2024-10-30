import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { FontLoader, TextGeometry } from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import {MovementStrategy, gameLoop, WINNING_SCORE} from './game.js';
import {navigateTo} from "./routes.js";
import {closeModal} from "./utils.js";

export class LocalMovementStrategy extends MovementStrategy {
	constructor() {
		super();

		this.playerKeys = {
			w: false,
			s: false,
			ArrowUp: false,
			ArrowDown: false
		};


		this.handleReturnToHomeClick = this.handleReturnToHomeClick.bind(this);
		this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.boundHandleKeyUp = this.handleKeyUp.bind(this);
        this.boundCloseGame = this.closeGame.bind(this);

        document.addEventListener('keydown', this.boundHandleKeyDown);
        document.addEventListener('keyup', this.boundHandleKeyUp);
        window.addEventListener('beforeunload', this.boundCloseGame);
        window.addEventListener('popstate', this.boundCloseGame);
    	this.handleReturnToHomeClick = this.handleReturnToHomeClick.bind(this);
		this.initThreeJS();
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

	handleScores() {
		if (this.ball.pos.x < 0) {
			this.player2_score += 1;
		} else if (this.ball.pos.x > this.canvas.width) {
			this.player1_score += 1;
		}
		this.updateScoreboard();
		this.resetBall();
		this.checkGameEnd();
	}

	checkGameEnd() {
		if (this.player1_score >= WINNING_SCORE) {
				this.displayWinnerMessage('win', 'Congratulations! You won the game.');
				this.isRunning = false;
		} else if (this.player2_score >= WINNING_SCORE) {
				this.displayWinnerMessage('lose', 'Sorry! You lost the game.');
				this.isRunning = false;
		}
	}

	updateGameEngine() {
        this.updateBall();
        this.handleBallCollision();
        this.checkPaddleCollision(this.leftPaddle, true);
        this.checkPaddleCollision(this.rightPaddle, false);
    }

	updateBall() {
        this.ball.pos.add(this.ball.speed);
    }

	checkPaddleCollision(paddle, isLeft) {
        const paddleX = isLeft ? this.paddleWidth : this.canvas.width - this.paddleWidth;
        const withinPaddleYRange = this.ball.pos.y >= paddle.y && this.ball.pos.y <= paddle.y + this.paddleHeight;

        if (withinPaddleYRange && !this.ballPassedPaddle) {
            if ((isLeft && this.ball.pos.x <= paddleX + this.paddleWidth) ||
                (!isLeft && this.ball.pos.x >= paddleX - this.paddleWidth)) {
                    this.ball.speed.x = isLeft ? this.collisionSpeedX : -this.collisionSpeedX;

                    // Optionally, adjust the vertical speed based on where the ball hits the paddle
                    const hitPosition = (this.ball.pos.y - paddle.y) / this.paddleHeight - 0.5; // Range from -0.5 to 0.5
                    this.ball.speed.y = hitPosition * 5; // Adjust vertical speed

                    const spin = new THREE.Vector2(0, paddle.speed * 0.1);
                    this.ball.speed.add(spin);

                    // Normalize speed to prevent excessive speed
                    this.ball.speed.setLength(this.maxBallSpeed);

                    // Adjust ball position to prevent sticking
                    const offset = isLeft ? this.paddleWidth + this.ballRadius : -(this.paddleWidth + this.ballRadius);
                    this.ball.pos.x = paddleX + offset;
            }
        }
    }

    resetBall() {
        this.ball.pos.set(this.canvas.width / 2, this.canvas.height / 2);
        this.ball.speed.set((Math.random() > 0.5 ? 1 : -1) * this.initialSpeed, 0);
        this.ballPassedPaddle = false;
        this.updateScoreboard();
    }

    handleBallCollision() {
        if (this.ball.pos.y - this.ballRadius <= 0  || this.ball.pos.y + this.ballRadius >= this.canvas.height) {
            const normal = new THREE.Vector2(0, 1);
            const dotProduct = this.ball.speed.dot(normal);
            const reflection = normal.clone().multiplyScalar(2 * dotProduct);
            this.ball.speed.sub(reflection);
        }
        if (this.ball.pos.x < 0 || this.ball.pos.x > this.canvas.width) {
            this.handleScores();
        } else {
            this.ballPassedPaddle = this.ball.pos.x < this.paddleWidth || this.ball.pos.x > this.canvas.width - this.paddleWidth;
        }
    }

	closeGame() {
		this.isRunning = false;
		if (this.animationFrameId) {
				cancelAnimationFrame(this.animationFrameId);
		}
		this.enableScroll();
		document.removeEventListener('keydown', this.boundHandleKeyDown);
		document.removeEventListener('keyup', this.boundHandleKeyUp);
		window.removeEventListener('beforeunload', this.boundCloseGame);
		window.removeEventListener('popstate', this.boundCloseGame);
	}

	displayWinnerMessage(result, message) {
		// First, close any existing modals
		closeModal();

		const modalDiv = document.getElementById('displayWinnerMessageModal');
		const messageDiv = document.getElementById('game-message');
	
		if (modalDiv) {
			const modal = new bootstrap.Modal(modalDiv);
			modal.show();
	
			const resultMessage = document.getElementById('resultMessage');
			resultMessage.textContent = "Fim Do Jogo!";
			messageDiv.textContent = "";

			const returnButton = modalDiv.querySelector('#returnToHome');
	
			// Remove existing event listeners
			returnButton.removeEventListener('click', this.handleReturnToHomeClick);
	
			// Add event listener para o botão de retornar
			returnButton.addEventListener('click', this.handleReturnToHomeClick.bind(this));
		}
	}

	handleReturnToHomeClick() {
		const modalDiv = document.getElementById('displayWinnerMessageModal');
		const modal = bootstrap.Modal.getInstance(modalDiv);
		modal.hide();
		this.closeGame();
		navigateTo('/home');
	}
}
