import { connectWebSocket, playerPaddle, sendGameUpdate, gameSocket } from "./websocket.js";
import { roomName } from "./ui.js";

export { OnlineMovementStrategy };


let canvas;
let context;

export const canvasWidth = 600;
export const canvasHeight = 400;
export const paddleWidth = 10;
export const paddleHeight = 100;
export const ballRadius = 7;


let paddle1Y = canvasHeight / 2 - 50;
let paddle2Y = canvasHeight / 2 - 50;
let ballX = canvasWidth / 2;
let ballY = canvasHeight / 2;

let upPressed = false;
let downPressed = false;
let animationFrameId = null;

let waitOponent = true;

let score = {
    player1: { name: '', score: 0 },
    player2: { name: '', score: 0 }
};

export function initGame(movementStrategy) {
    canvas = document.getElementById('gameCanvas');
    context = canvas.getContext('2d');
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    console.log('Waiting for oponent');
    movementStrategy.init();
    gameLoop(movementStrategy);
}

const keyDownHandler = (e) => {
    if (e.key === 'ArrowUp') {
        upPressed = true;
    }
    if (e.key === 'ArrowDown') {
        downPressed = true;
    }
};

const keyUpHandler = (e) => {
    if (e.key === 'ArrowUp') {
        upPressed = false;
    }
    if (e.key === 'ArrowDown') {
        downPressed = false;
    }
};

export const draw = () => {
    console.log('Desenhando paddles nas posições:', paddle1Y, paddle2Y);
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw paddles
    context.fillStyle = 'green';
    context.fillRect(0, paddle1Y, paddleWidth, paddleHeight);
    context.fillRect(canvasWidth - paddleWidth, paddle2Y, paddleWidth, paddleHeight);

    // Draw ball
    context.beginPath();
    context.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    context.fill();

    // Draw scores
    context.font = '24px Arial';
    context.fillStyle = 'white';
    context.fillText(`${score.player1.name}: ${score.player1.score}`, 50, 30);
    context.fillText(`${score.player2.name}: ${score.player2.score}`, canvasWidth - 150, 30);
};

//remote
export function updateGameState(gameState, serverScore) {
    console.log('Waiting for oponent false');
    try {
        waitOponent = false
        if (playerPaddle === 'paddle1') {
            paddle2Y = gameState.paddle2Y;
        } else if (playerPaddle === 'paddle2') {
            paddle1Y = gameState.paddle1Y;
        }
        ballX = gameState.ballX;
        ballY = gameState.ballY;
        score.player1.name = serverScore.player1.name;
        score.player1.score = serverScore.player1.score;
        score.player2.name = serverScore.player2.name;
        score.player2.score = serverScore.player2.score;
    } catch (error) {
        console.error('Erro ao atualizar o estado do jogo:', error);
    }
}

export const gameLoop = (MovementStrategy) => {
    console.log('Game loop');
    if (waitOponent) {
        console.log('Waiting for oponent');
        context.font = 'bold 60px serif';
        context.strokeStyle = 'green';
        context.strokeText(`Wait`, canvasWidth/2 - 80, canvasHeight/2);
    } else {
        console.log('draw');
        draw();
        MovementStrategy.updatePaddlePositions();
    }
    // TO-DO: onclick close game
    animationFrameId = requestAnimationFrame(() => gameLoop(MovementStrategy));
};

export const stopGame = (MovementStrategy) => {
    cancelAnimationFrame(animationFrameId);
    document.removeEventListener('keydown', keyDownHandler);
    document.removeEventListener('keyup', keyUpHandler);
    waitOponent = false;
    MovementStrategy.close(MovementStrategy);
};

class MovementStrategy {
    updatePaddlePositions() {
        throw new Error('Método updatePaddlePositions deve ser implementado');
    }
}

class LocalMovementStrategy extends MovementStrategy {
    constructor(player1Keys, player2Keys) {
        super();
        this.player1Keys = player1Keys;
        this.player2Keys = player2Keys;
    }

    init() {
        waitOponent = false;
        console.log(local);
    }
    
    
    updatePaddlePositions() {
        console.log(local);
        
    }

    close() {
        console.log(local);
        
    }
}

class OnlineMovementStrategy extends MovementStrategy {
    constructor(roomName) {
        super();
        this.roomName = roomName;
        this.socket = gameSocket;
    }

    init() {
        connectWebSocket(this.roomName);
    }

    updatePaddlePositions() {
        if (playerPaddle === 'paddle1' && upPressed && paddle1Y > 0) {
            paddle1Y -= 5;
        } else if (playerPaddle === 'paddle1' && downPressed && paddle1Y < canvasHeight - 100) {
            paddle1Y += 5;
        } else if (playerPaddle === 'paddle2' && upPressed && paddle2Y > 0) {
            paddle2Y -= 5;
        } else if (playerPaddle === 'paddle2' && downPressed && paddle2Y < canvasHeight - 100) {
            paddle2Y += 5;
        }
        const gameState = {
            paddle1Y: paddle1Y,
            paddle2Y: paddle2Y,
        };
        sendGameUpdate(gameState);
    }

    close() {
        this.socket.close();
    }
}