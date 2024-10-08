import {} from "./game.js";
// import { roomName } from "./ui.js";

const canvasWidth = 600;
const canvasHeight = 400;
const paddleWidth = 10;
const paddleHeight = 100;
const ballRadius = 7;


export let paddle1Y = canvasHeight / 2 - 50;
export let paddle2Y = canvasHeight / 2 - 50;
export let ballX = canvasWidth / 2;
export let ballY = canvasHeight / 2;

export let score = {
    player1: { name: '', score: 0 },
    player2: { name: '', score: 0 }
};

export let gameSocket = null;
export let playerPaddle = null;

export const connectWebSocket = (roomName) => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/ws/game/${roomName}/`;

    gameSocket = new WebSocket(wsUrl);

    gameSocket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.paddle) {
            playerPaddle = data.paddle;
            console.log("You control:", playerPaddle);
        } else {
            const gameState = data.game_state;
            const serverScore = data.score;
            updateGameState(gameState, serverScore);
        }
    };

    gameSocket.onopen = () => console.log("Connected to room", roomName);
    gameSocket.onclose = () => console.log("Disconnected from room", roomName);
    gameSocket.onerror = (e) => console.error('WebSocket error:', e);
};

export const sendGameUpdate = (gameState) => {
    if (gameSocket && gameSocket.readyState === WebSocket.OPEN) {
        gameSocket.send(JSON.stringify(gameState));
    }
};

export function updateGameState(gameState, serverScore) {
    console.log('updateGameState');
    try {
        if (!window.opponentReady) {
            window.dispatchEvent(new Event('opponentReady'));
            window.opponentReady = true;
        }
        // waitOponent = false
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