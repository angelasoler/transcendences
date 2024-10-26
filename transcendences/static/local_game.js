import {MovementStrategy, gameLoop} from './game.js';
import {navigateTo} from "./routes.js";
import {closeModal} from "./utils.js";

const WINNING_SCORE = 1; //MUDAR PARA 10

export class LocalMovementStrategy extends MovementStrategy {
	constructor() {
		super();

		this.playerKeys = {
			w: false,
			s: false,
			ArrowUp: false,
			ArrowDown: false
		};

		this.handlePlayAgainClick = this.handlePlayAgainClick.bind(this);
    this.handleReturnToHomeClick = this.handleReturnToHomeClick.bind(this);
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
		console.log('Pontos:', this.player1_score, this.player2_score);
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

	displayWinnerMessage(result, message) {
		// First, close any existing modals
		closeModal();

		const modalDiv = document.getElementById('displayWinnerMessageModal');
		const messageDiv = document.getElementById('game-message');

		if (modalDiv) {
			const modal = new bootstrap.Modal(modalDiv);
			modal.show();

			const resultMessage = document.getElementById('resultMessage');
			resultMessage.textContent = result === 'win' ? "Você Ganhou!" : "Você Perdeu";
			messageDiv.textContent = message;

			const playAgainButton = modalDiv.querySelector('#playAgainButton');
			const returnButton = modalDiv.querySelector('#returnToHome');

			// Remove existing event listeners
			playAgainButton.removeEventListener('click', this.handlePlayAgainClick);
			returnButton.removeEventListener('click', this.handleReturnToHomeClick);

			// Add event listeners
			playAgainButton.addEventListener('click', this.handlePlayAgainClick.bind(this));
			returnButton.addEventListener('click', this.handleReturnToHomeClick.bind(this));
		}
	}

	handlePlayAgainClick() {
		this.handlePlayAgain();
	}

	handleReturnToHomeClick() {
		const modalDiv = document.getElementById('displayWinnerMessageModal');
		const modal = bootstrap.Modal.getInstance(modalDiv);
		modal.hide();
		this.closeGame();
		navigateTo('/home');
	}

	handlePlayAgain() {
		// Hide the modal
		const modalDiv = document.getElementById('displayWinnerMessageModal');
		const modal = bootstrap.Modal.getInstance(modalDiv);
		modal.hide();

		// Reset the game
		this.resetGame();

		// Re-enable controls
		this.isRunning = true;
		this.start = true;

		// Restart the game loop
		gameLoop(this);
	}

	resetGame() {
		// Reset positions
		this.leftPaddle.y = this.canvas.height / 2 - this.paddleHeight / 2;
		this.rightPaddle.y = this.canvas.height / 2 - this.paddleHeight / 2;

		this.ball.pos.set(this.canvas.width / 2, this.canvas.height / 2);
		this.ball.speed.set((Math.random() > 0.5 ? 1 : -1) * 3, (Math.random() > 0.5 ? 1 : -1) * 3);

		// Reset scores
		this.player1_score = 0;
		this.player2_score = 0;

		// Update the scoreboard
		this.updateScoreboard();
	}
}
