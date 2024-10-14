// static/your_app/js/remote_game.js

import { BaseGame } from './game.js';

export class RemotePlay extends BaseGame {
    constructor(canvas, socket) {
        super(canvas);
        this.socket = socket;
        this.isHost = false;

        this.setupSocketListeners();
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

        this.socket.on('game_start', (data) => {
            this.isHost = data.isHost;
            this.start = true;
        });

        this.socket.on('paddle_update', (data) => {
            this.updatePaddlePosition(data.side, data.newY);
        });

        this.socket.on('ball_update', (data) => {
            this.ball.position.set(data.x, data.y, 0);
        });
    }

    sendPaddleUpdate(y) {
        this.socket.emit('paddle_update', { side: this.isHost ? 'left' : 'right', newY: y });
    }

    sendBallUpdate(x, y) {
        if (this.isHost) {
            this.socket.emit('ball_update', { x: x, y: y });
        }
    }

    update() {
        super.update();

        // Send paddle and ball updates to the server
        this.sendPaddleUpdate(this.leftPaddle.position.y);
        if (this.isHost) {
            this.sendBallUpdate(this.ball.position.x, this.ball.position.y);
        }
    }

    startGame() {
        this.socket.emit('start_game');
        this.start = true;
        this.intervalId = setInterval(() => this.update(), 16); // 60 FPS
    }

    endGame() {
        this.socket.emit('end_game');
        this.start = false;
        clearInterval(this.intervalId);
    }
}