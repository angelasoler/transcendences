import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import {gameLoop, MovementStrategy} from './game.js';
import {navigateTo} from "./routes.js";
import {closeModal, getCookie} from "./utils.js";

const WINNING_SCORE = 10;

export class OnlineMovementStrategy extends MovementStrategy {
    constructor(websocket) {
        super();
        this.websocket = websocket;
        this.isHost = false;

        this.start = false;

        this.keys = {
            up: false,
            down: false
        };
        this.handlePlayAgainClick = this.handlePlayAgainClick.bind(this);
        this.handleReturnToHomeClick = this.handleReturnToHomeClick.bind(this);
        this.handleAcceptPlayAgainClick = this.handleAcceptPlayAgainClick.bind(this);
        this.handleDeclinePlayAgainClick = this.handleDeclinePlayAgainClick.bind(this);
        this.setupWebSocket();
    }

    setupWebSocket() {
        this.websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
    }

    startNewGame() {
        // Reset game variables
        this.resetGame();

        // Hide the modal
        closeModal();

        // Re-enable controls
        this.isRunning = true;
        this.start = true;

        // Restart the game loop
        gameLoop(this);
    }

    resetGame() {
        this.canvas = document.getElementById('gameCanvas');
        // Reset keys
        this.keys.up = false;
        this.keys.down = false;
        this.player1_score = 0;
        this.player2_score = 0;

        this.animationFrameId = null;
        this.ballPassedPaddle = false;
        this.currentTime = 0;

        // Reset positions
        this.ball.pos.set(this.canvas.width / 2, this.canvas.height / 2);
		this.ball.speed.set((Math.random() > 0.5 ? 1 : -1) * 3, (Math.random() > 0.5 ? 1 : -1) * 3);

        this.newMatch = {
            date: '',
            opponent: '',
            result: ''
        };

        this.updateScoreboard();
    }

    handleWebSocketMessage(data) {
        switch(data.type) {
            case 'game_status':
                this.isHost = data.is_host;
                break;
            case 'game_start':
                this.start = true;
                break;
            case 'game_state':
                if (this.isHost) {
                    this.rightPaddle.y = data.opponent_paddle;
                } else {
                    this.leftPaddle.y = data.opponent_paddle;
                    if (data.ball) {
                        // Update ball position and speed without overwriting the object
                        this.ball.pos.set(data.ball.pos.x, data.ball.pos.y);
                        this.ball.speed.set(data.ball.speed.x, data.ball.speed.y);
                    }
                }
                break;
            case 'players_score':
                this.player1_score = data.player1_score;
                this.player2_score = data.player2_score;
                console.log('Pontos:', this.player1_score, this.player2_score);
                this.updateScoreboard();
                this.checkGameEnd();
                break;
            case 'game_end':
                this.closeGame();
                break;
            case 'game_over':
                this.isRunning = false;
                this.start = false;
                this.displayWinnerMessage(data.result, data.reason || "");
                break;
            case 'play_again_request':
                // The opponent wants to play again
                console.log('play again received');
                this.handleOpponentPlayAgainRequest();
                break;
            case 'play_again_response':
                if (data.accepted) {
                    // Both players agreed to play again
                    console.log('play again accepted');
                    this.startNewGame();
                } else {
                    // Opponent declined
                    this.closeGame();
                    alert('O oponente não quer jogar novamente.');
                    navigateTo('/home');
                }
                break;
            case 'start_new_game':
                // Handle the start of a new game
                console.log('Received start_new_game message.');
                this.startNewGame();
                break;
            // case 'room_full':
        }
    }

    handleKeyDown(e) {
        if (e.key === 'ArrowUp') this.keys.up = true;
        if (e.key === 'ArrowDown') this.keys.down = true;
    }
      
    handleKeyUp(e) {
        if (e.key === 'ArrowUp') this.keys.up = false;
        if (e.key === 'ArrowDown') this.keys.down = false;
    }

    update() {
        if (!this.isRunning) {
            console.log('Update called after game_over. Ignoring.');
            return;
        }

        let paddleSpeed = 0;
        if (this.keys.up && !this.keys.down) paddleSpeed = -this.paddleSpeed;
        else if (this.keys.down && !this.keys.up) paddleSpeed = this.paddleSpeed;

        if (this.isHost) {
            this.leftPaddle.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, 
                this.leftPaddle.y + paddleSpeed));
            
            // Host atualiza a bola
            this.updateGameEngine();
            
            // Envia estado do jogo
            this.sendGameState(this.leftPaddle.y);
        } else {
            this.rightPaddle.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, 
                this.rightPaddle.y + paddleSpeed));
            
            // Client envia apenas sua posição
            this.sendGameState(this.rightPaddle.y);
        }
    }

    handleScores() {
		if (this.ball.pos.x < 0) {
			this.player2_score += 1;
		} else if (this.ball.pos.x > this.canvas.width) {
			this.player1_score += 1;
		}

        const gameScore = {
            type: 'players_score',
            player1_score: this.player1_score,
            player2_score: this.player2_score,
        };

        this.websocket.send(JSON.stringify(gameScore));

        this.resetBall();
	}

    checkGameEnd() {
        if (this.isHost) {
            if (this.player1_score >= WINNING_SCORE) {
                this.sendGameOver('win');
            } else if (this.player2_score >= WINNING_SCORE) {
                this.sendGameOver('lose');
            }
        }
    }

    sendGameOver(result) {
        if (!this.isHost) {
        console.warn('Only the host can send game_over.');
        return;
        }
        const message = {
            type: 'game_over',
            result: result
        };
        try {
            this.websocket.send(JSON.stringify(message));
            console.log('Sent game_over message:', message);
        } catch (error) {
            console.error('Failed to send game_over:', error);
        }
    }

    sendGameState(paddleY) {
        const gameState = {
            type: 'paddle_update',
            paddle_y: paddleY
        };

        if (this.isHost) {
            gameState.ball = this.ball;
        }

        this.websocket.send(JSON.stringify(gameState));
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
            playAgainButton.addEventListener('click', this.handlePlayAgainClick);
            returnButton.addEventListener('click', this.handleReturnToHomeClick);
        }
    }

    handleOpponentPlayAgainRequest() {
        const modalElement = document.getElementById('playAgainRequestModal');
        const modal = new bootstrap.Modal(modalElement);

        // Show the modal
        modal.show();

        const acceptButton = modalElement.querySelector('#acceptPlayAgain');
        const declineButton = modalElement.querySelector('#declinePlayAgain');

        acceptButton.removeEventListener('click', this.handleAcceptPlayAgainClick);
        declineButton.removeEventListener('click', this.handleDeclinePlayAgainClick);

        acceptButton.addEventListener('click', this.handleAcceptPlayAgainClick);
        declineButton.addEventListener('click', this.handleDeclinePlayAgainClick);
    }

    handleAcceptPlayAgainClick() {
        const modalDiv = document.getElementById('playAgainRequestModal');
        const modal = bootstrap.Modal.getInstance(modalDiv);
        modal.hide();
        this.respondToPlayAgain(true);
    }

    handleDeclinePlayAgainClick() {
        const modalDiv = document.getElementById('playAgainRequestModal');
        const modal = bootstrap.Modal.getInstance(modalDiv);
        modal.hide();
        this.respondToPlayAgain(false);
    }

    respondToPlayAgain(accept) {
        // envia resposta de Jogar Novamente para o servidor
        this.websocket.send(JSON.stringify({
            type: 'play_again_response',
            accepted: accept
        }));

        if (accept) {
            this.startNewGame();
        } else {
            this.closeGame();
            navigateTo('/home');
        }
    }

    handlePlayAgainClick() {
        const modalDiv = document.getElementById('displayWinnerMessageModal');
        const modal = bootstrap.Modal.getInstance(modalDiv);
        modal.hide();
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
        // Send 'play_again' request to the server
        this.websocket.send(JSON.stringify({
            type: 'play_again_request'
        }));
        console.log('request to play again sent');
        // Show a waiting message
        const messageDiv = document.getElementById('game-message');
        if (messageDiv) {
            messageDiv.textContent = 'Esperando o outro jogador...';
        }
    }

    closeGame() {
        console.log('Game closed');
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        if (this.websocket) {
            this.websocket.close();
        }
        document.removeEventListener('keydown', this.boundHandleKeyDown);
        document.removeEventListener('keyup', this.boundHandleKeyUp);
        window.removeEventListener('beforeunload', this.boundCloseGame);
        window.removeEventListener('popstate', this.boundCloseGame);
    }

    async sendResult() {
        this.newMatch.result = ''
        const createdMatch = await createMatch(this.newMatch);
        console.log('Nova partida criada:', createdMatch);
    }
}

async function createMatch(matchData) {
    try {
        const csrftoken = getCookie('csrftoken');
        const response = await fetch('/api/matches/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken
            },
            body: JSON.stringify(matchData),
        });

        if (!response.ok)
            console.error('Erro ao criar nova partida', response.status);

        const createdMatch = await response.json();
        console.log('Partida criada com sucesso:', createdMatch);
    } catch (error) {
        console.error('Erro ao criar nova partida:', error);
        return null;
    }
}

