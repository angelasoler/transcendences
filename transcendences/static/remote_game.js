import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import {MovementStrategy, WINNING_SCORE} from './game.js';
import {navigateTo} from "./routes.js";
import {closeModal, getCookie} from "./utils.js";
import {redirectToLogin} from "./ui.js";



export class OnlineMovementStrategy extends MovementStrategy {
    constructor(websocket) {
        super();
        this.websocket = websocket;
        this.player_side = null;

        this.start = false;

        this.keys = {
            up: false,
            down: false
        };

        // Variables for smoothing own paddle position
        this.serverPaddleY = null;
        this.localPaddleY = null;
        this.paddleInterpolationTime = 30; // in milliseconds
        this.paddleInterpolationStartTime = null;

        this.game_state = null;

        this.paddleSpeed = 6;

        // Initialize logical dimensions (should match the server's dimensions)
        this.logicalWidth = 600;
        this.logicalHeight = 400;

        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.boundHandleKeyUp = this.handleKeyUp.bind(this);
        this.boundCloseGame = this.closeGame.bind(this);

        document.addEventListener('keydown', this.boundHandleKeyDown);
        document.addEventListener('keyup', this.boundHandleKeyUp);
        window.addEventListener('beforeunload', this.boundCloseGame);
        window.addEventListener('popstate', this.boundCloseGame);


        this.handleReturnToHomeClick = this.handleReturnToHomeClick.bind(this);
        this.setupWebSocket();
    }

    setupWebSocket() {
        this.websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
    }

    handleWebSocketMessage(data) {
        switch(data.type) {
            case 'game_joined':
                this.player_side = data.player_side;
                if (data.canvas_width && data.canvas_height) {
                    this.logicalWidth = data.canvas_width;
                    this.logicalHeight = data.canvas_height;
                }
                this.initializeGameElements();
                // Initialize game state with default values
                this.game_state = {
                    ball_x: this.logicalWidth / 2,
                    ball_y: this.logicalHeight / 2,
                    ball_speed_x: 0,
                    ball_speed_y: 0,
                    paddle_left_y: this.logicalHeight / 2 - this.paddleHeight / 2,
                    paddle_right_y: this.logicalHeight / 2 - this.paddleHeight / 2,
                    score_left: 0,
                    score_right: 0,
                };
                break;
            case 'game_start':
                if (!this.start) { // Prevent multiple initializations
                    this.game_state = data.game_state;
                    this.player1 = data.game_state.player1_username;
                    this.player2 = data.game_state.player2_username;
                    this.initThreeJS();
                    this.start = true;
                    this.isRunning = true;
                }
                break;
            case 'game_update':
                if (this.fontLoaded) {
                    this.game_state = data;
                    this.serverPaddleY = this.player_side === 'left' ? data.paddle_left_y : data.paddle_right_y;
                    this.updateScoreboard();
                } else {
                    console.warn('Received game_update before font was loaded. Ignoring.');
                }
                break;
            case 'game_end':
                this.closeGame();
                break;
            case 'game_over':
                if (this.isRunning) {
                    this.isRunning = false;
                    this.start = false;
                    const winner = data.winner;
                    const message = winner === this.player_side ? "Você venceu!" : "Você perdeu!";
                    this.displayWinnerMessage(winner === this.player_side ? 'win' : 'lose', message);
                    if (this.player_side === 'left') {
                        const result = {
                            'username': this.player1,
                            'opponent': this.player2,
                            'result': winner === 'left' ? this.player1 : this.player2,
                        };
                        this.sendResult(result);
                    }
                }
                break;
        }
    }

    initializeGameElements() {
        // Initialize paddles
        this.leftPaddle = {
            y: this.canvas.height / 2 - this.paddleHeight / 2,
            speed: 0
        };

        this.rightPaddle = {
            y: this.canvas.height / 2 - this.paddleHeight / 2,
            speed: 0
        };
    }

    update() {
        if (!this.isRunning) return;
        const gs = this.game_state;
        // Update ball position and speed from game state
        this.ball.pos.set(gs.ball_x, gs.ball_y);
        this.ball.speed.set(gs.ball_speed_x, gs.ball_speed_y);
		this.updatePaddleAndSendInput();
        // // Smooth own paddle position towards server value
        this.smoothOwnPaddlePosition();
        if (this.player_side === 'left') {
            this.rightPaddle.y = gs.paddle_right_y;
        } else {
            this.leftPaddle.y = gs.paddle_left_y;
        }
        this.player1_score = gs.score_left;
        this.player2_score = gs.score_right;

        if (this.player1_score >= WINNING_SCORE) {
            this.updateScoreboard();
            this.websocket.send(JSON.stringify({
                type: 'game_over',
                winner: 'left'
            }));
        } else if (this.player2_score >= WINNING_SCORE) {
            this.updateScoreboard();
            this.websocket.send(JSON.stringify({
                type: 'game_over',
                winner: 'right'
            }));
        }
    }

    smoothOwnPaddlePosition() {
        if (this.serverPaddleY === null) return;

        const currentTime = performance.now();

        // Initialize interpolation start time and local paddle Y if not set
        if (this.paddleInterpolationStartTime === null) {
            this.paddleInterpolationStartTime = currentTime;
            this.localPaddleY = this.player_side === 'left' ? this.leftPaddle.y : this.rightPaddle.y;
        }

        const elapsedTime = currentTime - this.paddleInterpolationStartTime;
        const t = Math.min(elapsedTime / this.paddleInterpolationTime, 1); // Ensure t is between 0 and 1

        const interpolatedY = THREE.MathUtils.lerp(
            this.localPaddleY,
            this.serverPaddleY,
            t
        );

        // Update own paddle position with interpolated value
        if (this.player_side === 'left') {
            this.leftPaddle.y = interpolatedY;
        } else {
            this.rightPaddle.y = interpolatedY;
        }

        // Reset interpolation if complete
        if (t >= 1) {
            this.paddleInterpolationStartTime = null;
            this.localPaddleY = null;
        }
    }

    handleKeyDown(e) {
        if (!this.isRunning) return;
        if (e.key === 'ArrowUp') {
            this.keys.up = true;
        } else if (e.key === 'ArrowDown') {
            this.keys.down = true;

        }
        // Send input to server
        this.updatePaddleAndSendInput();
    }

    handleKeyUp(e) {
        if (!this.isRunning) return;
        if (e.key === 'ArrowUp') {
            this.keys.up = false;
        } else if (e.key === 'ArrowDown') {
            this.keys.down = false;
        }
        // Send input to server
        this.updatePaddleAndSendInput();
    }

    updatePaddleAndSendInput() {
        let paddleSpeed = 0;
        if (this.keys.up && !this.keys.down) paddleSpeed = -this.paddleSpeed;
        else if (this.keys.down && !this.keys.up) paddleSpeed = this.paddleSpeed;
        // Update own paddle position locally
        if (this.player_side === null) {
            // Wait until player_side is set
            return;
        }

        // Update own paddle position locally
        if (this.player_side === 'left') {
            this.leftPaddle.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight,
                this.leftPaddle.y + paddleSpeed));
        } else if (this.player_side === 'right'){
            this.rightPaddle.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight,
                this.rightPaddle.y + paddleSpeed));
        }

        // // Reset interpolation when player moves paddle
        this.paddleInterpolationStartTime = null;
        this.localPaddleY = null;

        // Send paddle input to server
        this.sendPaddleInput(paddleSpeed);
    }

    sendPaddleInput(paddleSpeed) {
        if (!this.isRunning || this.websocket.readyState !== WebSocket.OPEN) return;
        this.websocket.send(JSON.stringify({
            type: 'paddle_move',
            paddle_speed: paddleSpeed
        }));
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

            const returnButton = modalDiv.querySelector('#returnToHome');

            returnButton.removeEventListener('click', this.handleReturnToHomeClick);
            returnButton.addEventListener('click', this.handleReturnToHomeClick);
        }
    }

    handleReturnToHomeClick() {
        const modalDiv = document.getElementById('displayWinnerMessageModal');
        const modal = bootstrap.Modal.getInstance(modalDiv);
        modal.hide();
        this.closeGame();
        navigateTo('/home');
    }

    closeGame() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        if (this.websocket) {
            this.websocket.close();
        }
        this.enableScroll();
        document.removeEventListener('keydown', this.boundHandleKeyDown);
        document.removeEventListener('keyup', this.boundHandleKeyUp);
        window.removeEventListener('beforeunload', this.boundCloseGame);
        window.removeEventListener('popstate', this.boundCloseGame);
    }

    async createMatch(matchData) {
        try {
            const csrftoken = getCookie('csrftoken');
            const response = await fetch('/api/matches/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken
                },
                credentials: 'include',
                body: JSON.stringify(matchData),
            });

            if (!response.ok) {
                const errorText = await response.text(); // Fetch error details
                console.error('Erro ao criar nova partida:', response.status, errorText);
                return null; // Early exit on error
            }

            const createdMatch = await response.json();
            return createdMatch; // Return the created match
        } catch (error) {
            console.error('Erro ao criar nova partida:', error);
            return null;
        }
    }
    async sendResult(result) {
        const createdMatch = await this.createMatch(result);
    }
}

