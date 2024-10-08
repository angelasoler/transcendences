import { OnlineMovementStrategy, updateGameState } from "./game.js";
// import { roomName } from "./ui.js";

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