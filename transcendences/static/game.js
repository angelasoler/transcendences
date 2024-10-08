export { MovementStrategy };

export let canvas;
export let context;

const canvasWidth = 600;
const canvasHeight = 400;
const paddleWidth = 10;
const paddleHeight = 100;
const ballRadius = 7;

let upPressed = false;
let downPressed = false;
let animationFrameId = null;

let waitOponent = true;

export function initGame(movementStrategy) {
    // canvas = document.getElementById('gameCanvas');
    // context = canvas.getContext('2d');
    // document.addEventListener('keydown', keyDownHandler);
    // document.addEventListener('keyup', keyUpHandler);
    // console.log('Waiting for oponent');
    // movementStrategy.init();
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


export const gameLoop = (MovementStrategy) => {
    console.log('Game loop');
    console.log('draw');
    MovementStrategy.animate();
    // MovementStrategy.draw();
    // MovementStrategy.update();
    // animationFrameId = requestAnimationFrame(() => gameLoop(MovementStrategy));
};

export const stopGame = (MovementStrategy) => {
    cancelAnimationFrame(animationFrameId);
    document.removeEventListener('keydown', keyDownHandler);
    document.removeEventListener('keyup', keyUpHandler);
    waitOponent = false;
    MovementStrategy.close(MovementStrategy);
};

class MovementStrategy {
    update() {
        throw new Error('Método update deve ser implementado');
    }

    animate() {
        throw new Error('Método animate deve ser implementado');
    }
}
