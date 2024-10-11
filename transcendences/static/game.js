import * as THREE from './three.min.js';

// export { MovementStrategy };

// export let canvas;
// export let context;

// const canvasWidth = 600;
// const canvasHeight = 400;
// const paddleWidth = 10;
// const paddleHeight = 100;
// const ballRadius = 7;

// let upPressed = false;
// let downPressed = false;
// let animationFrameId = null;

// let waitOponent = true;

// export function initGame(mvStrategy) {
//     gameLoop(mvStrategy);
// }

// const keyDownHandler = (e) => {
//     if (e.key === 'ArrowUp') {
//         upPressed = true;
//     }
//     if (e.key === 'ArrowDown') {
//         downPressed = true;
//     }
// };

// const keyUpHandler = (e) => {
//     if (e.key === 'ArrowUp') {
//         upPressed = false;
//     }
//     if (e.key === 'ArrowDown') {
//         downPressed = false;
//     }
// };

// export const gameLoop = (mvStrategy) => {
//     // console.log('Game loop');
//     if (!mvStrategy.isRunning)
//         return ;
//     if (mvStrategy.start) {
//         mvStrategy.update();
//         mvStrategy.draw();
//     }
//     mvStrategy.animationFrameId = requestAnimationFrame(() => gameLoop(mvStrategy));
// };

// class MovementStrategy {
//     constructor() {
//         this.start = true;
//         this.canvas = document.getElementById('gameCanvas');
//         this.ctx = this.canvas.getContext('2d');

//         this.isRunning = true;
//         this.animationFrameId = null;

//         this.paddleHeight = 100;
//         this.paddleWidth = 10;
//         this.ballRadius = 8;
//         this.paddleSpeed = 5;

//         this.leftPaddle = {
//             y: this.canvas.height / 2 - this.paddleHeight / 2,
//             speed: 0
//         };
          
//         this.rightPaddle = {
//             y: this.canvas.height / 2 - this.paddleHeight / 2,
//             speed: 0
//         };
          
//         this.ball = {
//             x: this.canvas.width / 2,
//             y: this.canvas.height / 2,
//             speedX: 3,
//             speedY: 3
//         };

//         document.addEventListener('keydown', this.handleKeyDown.bind(this));
//         document.addEventListener('keyup', this.handleKeyUp.bind(this));
//         window.addEventListener('beforeunload', this.closeGame.bind(this));
//         window.addEventListener('popstate', this.closeGame.bind(this));

//     }

//     closeGame() {
//         throw new Error('Método close deve ser implementado');
//     }

//     update() {
//         throw new Error('Método update deve ser implementado');
//     }

//     draw () {
//         this.ctx.fillStyle = 'black';
//         this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
//         this.ctx.fillStyle = 'green';
    
//         this.ctx.fillRect(0, this.leftPaddle.y, this.paddleWidth, this.paddleHeight);
    
//         this.ctx.fillRect(this.canvas.width - this.paddleWidth, this.rightPaddle.y, this.paddleWidth, this.paddleHeight);
    
//         this.ctx.beginPath();
//         this.ctx.arc(this.ball.x, this.ball.y, this.ballRadius, 0, Math.PI * 2);
//         this.ctx.fill();
//     }

//     checkPaddleCollision(paddle, isLeft) {
//         const paddleX = isLeft ? this.paddleWidth : this.canvas.width - this.paddleWidth;

//         return this.ball.y >= paddle.y && 
//                this.ball.y <= paddle.y + this.paddleHeight &&
//                (isLeft ? 
//                  this.ball.x <= paddleX + this.paddleWidth && this.ball.x >= paddleX :
//                  this.ball.x >= paddleX - this.paddleWidth && this.ball.x <= paddleX);
//     }

//     resetBall() {
//         this.ball.x = this.canvas.width / 2;
//         this.ball.y = this.canvas.height / 2;
//         this.ball.speedX = -this.ball.speedX;
//     }
// }

export class PongGame {
    constructor(canvas) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        });

        this.initScene();
        this.createPaddles();
        this.createBall();
        this.animate();

        // Game properties
        this.paddleSpeed = 0.05;
        this.ballSpeed = 0.03;
        this.paddleHeight = 1;
        this.paddleWidth = 0.2;
        this.ballRadius = 0.05;

        // Initial ball direction
        this.ballDirection = new THREE.Vector3(1, 1, 0);

        // Set up event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'w':
                    this.updatePaddlePosition('left', this.leftPaddle.position.y + this.paddleSpeed);
                    break;
                case 's':
                    this.updatePaddlePosition('left', this.leftPaddle.position.y - this.paddleSpeed);
                    break;
                case 'ArrowUp':
                    this.updatePaddlePosition('right', this.rightPaddle.position.y + this.paddleSpeed);
                    break;
                case 'ArrowDown':
                    this.updatePaddlePosition('right', this.rightPaddle.position.y - this.paddleSpeed);
                    break;
            }
        });

        // Add keyup event listener to stop paddle movement
        document.addEventListener('keyup', (e) => {
            switch(e.key) {
                case 'w':
                case 's':
                case 'ArrowUp':
                case 'ArrowDown':
                    // TODO: Implement logic to stop paddle movement here
                    break;
            }
        });
    }

    initScene() {
        // Set camera position
        this.camera.position.z = 5;

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x444444);
        this.scene.add(ambientLight);

        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(0, 1, 0);
        this.scene.add(directionalLight);

        // Create court floor
        const floorGeometry = new THREE.PlaneGeometry(10, 5);
        const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x888888 });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        this.scene.add(floor);

        // Create net
        const netGeometry = new THREE.BoxGeometry(0.01, 0.5, 0.01);
        const netMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const net = new THREE.Mesh(netGeometry, netMaterial);
        net.position.y = 0.25;
        this.scene.add(net);
    }

    createPaddles() {
        const paddleGeometry = new THREE.BoxGeometry(this.paddleWidth, this.paddleHeight, 0.02);
        const paddleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

        this.leftPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
        this.leftPaddle.position.x = -4.5 + this.paddleWidth / 2;
        this.leftPaddle.position.y = 0.5;
        this.scene.add(this.leftPaddle);

        this.rightPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
        this.rightPaddle.position.x = 4.5 - this.paddleWidth / 2;
        this.rightPaddle.position.y = 0.5;
        this.scene.add(this.rightPaddle);
    }

    createBall() {
        const sphereGeometry = new THREE.SphereGeometry(this.ballRadius, 32, 16);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.ball = new THREE.Mesh(sphereGeometry, sphereMaterial);
        this.resetBall();
        this.scene.add(this.ball);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.render();

        // Update ball position
        this.updateBallPosition();

        // Check collisions
        this.checkCollisions();

        // Update paddles
        this.updatePaddlePositions();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    updatePaddlePosition(side, newY) {
        let paddle = side === 'left' ? this.leftPaddle : this.rightPaddle;
        paddle.position.y = Math.max(-2.25, Math.min(2.25, newY));
    }

    updateBallPosition() {
        this.ball.position.x += this.ballSpeed * this.ballDirection.x;
        this.ball.position.y += this.ballSpeed * this.ballDirection.y;
    }

    checkCollisions() {
        // Collision with walls
        if (this.ball.position.y > 2.45 || this.ball.position.y < -2.45) {
            this.ballDirection.y *= -1;
        }

        // Collision with paddles
        if ((this.ball.position.x <= -4.35 && this.ball.position.x >= -4.55 &&
             this.ball.position.y >= this.leftPaddle.position.y - this.paddleHeight / 2 &&
             this.ball.position.y <= this.leftPaddle.position.y + this.paddleHeight / 2) ||
            (this.ball.position.x >= 4.35 && this.ball.position.x <= 4.55 &&
             this.ball.position.y >= this.rightPaddle.position.y - this.paddleHeight / 2 &&
             this.ball.position.y <= this.rightPaddle.position.y + this.paddleHeight / 2)) {
            this.ballDirection.x *= -1;
        }

        // Ball out of bounds
        if (this.ball.position.x < -5 || this.ball.position.x > 5) {
            this.resetBall();
        }
    }

    resetBall() {
        this.ball.position.set(0, 0, 0);
        this.ballDirection = new THREE.Vector3(Math.random() < 0.5 ? -1 : 1, Math.random() * 2 - 1, 0).normalize();
    }

    updatePaddlePositions() {

        // Update left paddle position
        if (upPressed) {
            this.updatePaddlePosition('left', this.leftPaddle.position.y + this.paddleSpeed);
        }
        if (downPressed) {
            this.updatePaddlePosition('left', this.leftPaddle.position.y - this.paddleSpeed);
        }

        // Update right paddle position
        if (upPressed) {
            this.updatePaddlePosition('right', this.rightPaddle.position.y + this.paddleSpeed);
        }
        if (downPressed) {
            this.updatePaddlePosition('right', this.rightPaddle.position.y - this.paddleSpeed);
        }
    }
}
