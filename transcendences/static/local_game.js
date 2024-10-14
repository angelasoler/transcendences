// static/your_app/js/local_game.js

import { BaseGame } from './game.js';

export class LocalPlay extends BaseGame {
    constructor(canvas) {
        super(canvas);
    }

    startGame() {
        this.start = true;
        this.intervalId = setInterval(() => this.update(), 16); // 60 FPS
    }

    endGame() {
        this.start = false;
        clearInterval(this.intervalId);
    }
}