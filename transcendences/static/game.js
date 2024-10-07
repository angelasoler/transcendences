import {sendGameUpdate} from "./websocket.js";
import {fetchViews} from "./ui.js";

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


export const initGame = async () => {
    await fetchViews('local-game');
    canvas = document.getElementById('gameCanvas');
    context = canvas.getContext('2d');
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);
    draw();
};

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
}

export const gameLoop = () => {
    draw();
    updatePaddlePositions();
    animationFrameId = requestAnimationFrame(() => gameLoop());
};

export const stopGame = () => {
    cancelAnimationFrame(animationFrameId);
    document.removeEventListener('keydown', keyDownHandler);
    document.removeEventListener('keyup', keyUpHandler);
};

// export const gameLoop = (context, playerPaddle, paddleMovementStrategy) => {
//     draw(context, playerPaddle);
//     paddleMovementStrategy.updatePaddlePositions(playerPaddle);
//     animationFrameId = requestAnimationFrame(() => gameLoop(context, playerPaddle, paddleMovementStrategy));
// };

class PaddleMovementStrategy {
    updatePaddlePositions(playerPaddle) {
        throw new Error('Método updatePaddlePositions deve ser implementado');
    }
}

class LocalPaddleMovementStrategy extends PaddleMovementStrategy {
    constructor(player1Keys, player2Keys) {
        super();
        this.player1Keys = player1Keys;
        this.player2Keys = player2Keys;
    }

    
    updatePaddlePositions(playerPaddle) {
        
    }
}

class OnlinePaddleMovementStrategy extends PaddleMovementStrategy {
    constructor(socket) {
        super();
        this.socket = socket;
    }

    updatePaddlePositions = (playerPaddle) => {
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
    };
}