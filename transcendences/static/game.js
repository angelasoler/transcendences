import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { FontLoader, TextGeometry } from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export { MovementStrategy };

export let canvas;
export let context;

export function initGame(mvStrategy) {
    // Salva a atual instancia de MovementStrategy globalmente
    // para que possamos chamar closeGame() quando mudar de view
    window.currentMovementStrategy = mvStrategy;
    gameLoop(mvStrategy);
}

export const gameLoop = (mvStrategy) => {
    mvStrategy.animationFrameId = requestAnimationFrame((timestamp) => {
        if (!mvStrategy.isRunning)
            return ;
        mvStrategy.currentTime = timestamp;
        if (mvStrategy.start) {
            mvStrategy.update();
            mvStrategy.draw();
        }
        gameLoop(mvStrategy)
    });
};

class MovementStrategy {
    constructor() {
        this.start = true;
        this.canvas = document.getElementById('gameCanvas');
        this.my_score = 0;
        this.opponent_score = 0;

        this.isRunning = true;
        this.animationFrameId = null;
        this.currentTime = 0;

        this.paddleHeight = 100;
        this.paddleWidth = 10;
        this.ballRadius = 8;
        this.paddleSpeed = 5;

        this.leftPaddle = {
            y: this.canvas.height / 2 - this.paddleHeight / 2,
            speed: 0
        };
          
        this.rightPaddle = {
            y: this.canvas.height / 2 - this.paddleHeight / 2,
            speed: 0
        };

        this.ball = {
            pos: new THREE.Vector2(this.canvas.width / 2, this.canvas.height / 2),
            speed: new THREE.Vector2(3, 3),
        };

        this.scoreDigits = {
            player: [],
            opponent: []
        };

        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.boundHandleKeyUp = this.handleKeyUp.bind(this);
        this.boundCloseGame = this.closeGame.bind(this);

        document.addEventListener('keydown', this.boundHandleKeyDown);
        document.addEventListener('keyup', this.boundHandleKeyUp);
        window.addEventListener('beforeunload', this.boundCloseGame);
        window.addEventListener('popstate', this.boundCloseGame);

        this.initThreeJS();
    }

    initThreeJS() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            50, this.canvas.width / this.canvas.height,
            0.1, 1000
        );
        this.camera.position.z = 500;
        this.camera.position.y = -10;
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(this.canvas.width, this.canvas.height);
    
        // Create floor
        const floorGeometry = new THREE.PlaneGeometry(this.canvas.width + 60, this.canvas.height);
        const floorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x006400,
            roughness: 0.8 // Added line to set roughness
        });
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        floorMesh.position.z = -10;
        floorMesh.receiveShadow = true;
        this.scene.add(floorMesh);
    
        // Create paddles
        const paddleGeometry = new THREE.BoxGeometry(this.paddleWidth, this.paddleHeight, 10);
    
        this.leftPaddleMesh = new THREE.Mesh(paddleGeometry, new THREE.MeshStandardMaterial({ color: 0x7DFDFE }));
        this.leftPaddleMesh.position.x = -this.canvas.width / 2 + this.paddleWidth / 2;
        this.leftPaddleMesh.castShadow = true;
        this.leftPaddleMesh.receiveShadow = true;
        this.scene.add(this.leftPaddleMesh);
    
        this.rightPaddleMesh = new THREE.Mesh(paddleGeometry, new THREE.MeshStandardMaterial({ color: 0xF7C530 }));
        this.rightPaddleMesh.position.x = this.canvas.width / 2 - this.paddleWidth / 2;
        this.rightPaddleMesh.castShadow = true;
        this.rightPaddleMesh.receiveShadow = true;
        this.scene.add(this.rightPaddleMesh);
    
        // Create ball
        const ballGeometry = new THREE.SphereGeometry(this.ballRadius, 32, 32);
        const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        this.ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
        this.ballMesh.castShadow = true;
        this.scene.add(this.ballMesh);
    
        // Create walls
        const wallThickness = 20;
        const wallHeight = this.canvas.height;
        const wallWidth = this.canvas.width;
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    
        // Left wall
        const leftWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, 15);
        const leftWallMesh = new THREE.Mesh(leftWallGeometry, wallMaterial);
        leftWallMesh.position.set(-this.canvas.width / 2 - wallThickness / 2 - 10, 0, 0);
        leftWallMesh.receiveShadow = true;
        this.scene.add(leftWallMesh);
    
        // Right wall
        const rightWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, 15);
        const rightWallMesh = new THREE.Mesh(rightWallGeometry, wallMaterial);
        rightWallMesh.position.set(this.canvas.width / 2 + wallThickness / 2 + 10, 0, 0);
        rightWallMesh.receiveShadow = true;
        this.scene.add(rightWallMesh);

        // Top wall
        const topWallGeometry = new THREE.BoxGeometry(wallWidth + 60, wallThickness, 15);
        const topWallMesh = new THREE.Mesh(topWallGeometry, wallMaterial);
        topWallMesh.position.set(0, this.canvas.height / 2 + wallThickness / 2, 0);
        topWallMesh.receiveShadow = true;
        this.scene.add(topWallMesh);

        // Bottom wall
        const bottomWallGeometry = new THREE.BoxGeometry(wallWidth + 60, wallThickness, 15);
        const bottomWallMesh = new THREE.Mesh(bottomWallGeometry, wallMaterial);
        bottomWallMesh.position.set(0, -this.canvas.height / 2 - wallThickness / 2, 0);
        bottomWallMesh.receiveShadow = true;
        this.scene.add(bottomWallMesh);
    
        this.addLights();
    
        this.loadFont();
    }

    addLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(0, 30, 100);
        pointLight.castShadow = true;
        pointLight.lookAt(new THREE.Vector3(0, 0, 0));
        this.scene.add(pointLight);
    }

    loadFont() {
        const loader = new FontLoader();
        loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
            this.font = font;
            this.updateScoreboard();
        });
    }

    updateScoreboard() {
        const scoreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

        // Update player score text
        this.updateScore(this.my_score, -100, scoreMaterial, 'player');

        // Update opponent score text
        this.updateScore(this.opponent_score, 100, scoreMaterial, 'opponent');
    }

    updateScore(score, xOffset, material, type) {
        const oldDigits = this.scoreDigits[type];
        const newDigits = score.toString().split('').map(Number);
    
        // Remove old digits
        oldDigits.forEach(digit => this.scene.remove(digit));
        this.scoreDigits[type] = [];
    
        // Create new digits
        for (let i = 0; i < newDigits.length; i++) {
            const geometry = new TextGeometry(newDigits[i].toString(), {
                font: this.font,
                size: 40,
                height: 5,
                curveSegments: 12,
                bevelEnabled: false
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(xOffset + i * 30, this.canvas.height / 2 - 50, 0);
            mesh.userData.digit = newDigits[i]; // Store digit value in user data
            this.scene.add(mesh);
            this.scoreDigits[type].push(mesh);
        }
    
        // Animate changing digits
        this.animateDigitChange(oldDigits, newDigits, type);
    }
    
    animateDigitChange(oldDigits, newDigits, type) {
        const maxLength = Math.max(oldDigits.length, newDigits.length);
        oldDigits = oldDigits.map(digit => Number(digit.userData.digit));
        oldDigits.push(...Array(maxLength - oldDigits.length).fill(0));
    
        for (let i = 0; i < maxLength; i++) {
            if (oldDigits[i] !== newDigits[i]) {
                this.animateRotation(this.scoreDigits[type][i]);
            }
        }
    }

    animateRotation(mesh) {
        const duration = 1000; // Duration of the spin in milliseconds
        const start = performance.now();
        const initialRotation = mesh.rotation.y;
        const targetRotation = initialRotation + Math.PI * 2;
    
        const animate = (time) => {
            const elapsed = time - start;
            const progress = Math.min(elapsed / duration, 1);
            mesh.rotation.y = initialRotation + (targetRotation - initialRotation) * progress;
    
            console.log(`Animating rotation: progress=${progress}, rotation=${mesh.rotation.y}, visible=${mesh.visible}`);
    
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                mesh.rotation.y = targetRotation; // Ensure final rotation is set
                console.log(`Final rotation set: rotation=${mesh.rotation.y}`);
            }
    
            this.renderer.render(this.scene, this.camera);
        };
    
        requestAnimationFrame(animate);
    }

    updateGameEngine() {
        this.updateBall();
        this.handleBallCollision(); 
        this.checkPaddleCollision(this.leftPaddle, true);
        this.checkPaddleCollision(this.rightPaddle, false);
    }

    draw () {
        if (!this.ball) {
            console.warn('Ball is undefined. Skipping draw.');
            return;
        }

        // Update Three.js objects positions
        this.leftPaddleMesh.position.y = -(this.leftPaddle.y - this.canvas.height / 2 + this.paddleHeight / 2);
        this.rightPaddleMesh.position.y = -(this.rightPaddle.y - this.canvas.height / 2 + this.paddleHeight / 2);
        this.ballMesh.position.set(this.ball.pos.x - this.canvas.width / 2, -(this.ball.pos.y - this.canvas.height / 2), 0);

        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }

    checkPaddleCollision(paddle, isLeft) {
        const paddleX = isLeft ? this.paddleWidth : this.canvas.width - this.paddleWidth;
        const withinPaddleYRange = this.ball.pos.y >= paddle.y && this.ball.pos.y <= paddle.y + this.paddleHeight;

        if (withinPaddleYRange) {
            if ((isLeft && this.ball.pos.x <= paddleX + this.paddleWidth) ||
                (!isLeft && this.ball.pos.x >= paddleX - this.paddleWidth)) {
                    this.ball.speed.x = -this.ball.speed.x;
                    const spin = new THREE.Vector2(0, paddle.speed * 0.1);
                    this.ball.speed.add(spin);
            }
        }
    }

    resetBall() {
        this.ball.pos.set(this.canvas.width / 2, this.canvas.height / 2);
        this.ball.speed.set((Math.random() > 0.5 ? 1 : -1) * 3, (Math.random() > 0.5 ? 1 : -1) * 3);
        this.updateScoreboard();
    }


    handleBallCollision() {
        if (this.ball.pos.y <= 0 || this.ball.pos.y >= this.canvas.height) {
            const normal = new THREE.Vector2(0, 1);
            const dotProduct = this.ball.speed.dot(normal);
            const reflection = normal.clone().multiplyScalar(2 * dotProduct);
            this.ball.speed.sub(reflection);
        }
        if (this.ball.pos.x < this.paddleWidth || this.ball.pos.x > this.canvas.width - this.paddleWidth) {
            if (this.ball.pos.x < this.paddleWidth) {
            this.opponent_score += 1;
            } else if (this.ball.pos.x > this.canvas.width - this.paddleWidth) {
            this.my_score += 1;
            }
            console.log('Pontos:', this.my_score, this.opponent_score);
            this.updateScoreboard();
            this.resetBall();    
            this.checkGameEnd();
        }
    }

    //Mudar funcoes abaixo para local_game(?)
    checkGameEnd() {
        if (this.my_score >= 3 || this.opponent_score >= 3) {
            this.isRunning = false;
            this.displayWinnerMessage();
        }
    }

    displayWinnerMessage() {
        const winner = this.my_score >= 3 ? 'Player' : 'Opponent';
        document.getElementById('resultMessage').innerText = `${winner} wins!`;
        const winnerModal = new bootstrap.Modal(document.getElementById('displayWinnerMessageModal'));
        winnerModal.show();

        document.getElementById('playAgainButton').addEventListener('click', () => {
            winnerModal.hide();
            this.resetGame();
        });

        document.getElementById('returnToHome').addEventListener('click', () => {
            window.location.href = '/';
        });
    }

    resetGame() {
        this.my_score = 0;
        this.opponent_score = 0;
        this.isRunning = true;
        this.resetBall();
    }

    updateBall() {
        this.ball.pos.add(this.ball.speed);
    }

    closeGame() {
        throw new Error('Método close deve ser implementado');
    }

    update() {
        throw new Error('Método update deve ser implementado');
    }
  
    handleKeyUp() {
        throw new Error('Método handleKeyUp deve ser implementado');
    }

    handleKeyDown() {
        throw new Error('Método handleKeyDown deve ser implementado');
    }
  
    // Descomentar depois que implementar esses métodos no local_game!
    // displayWinnerMessage() {
    //     throw new Error('Método displayWinnerMessage deve ser implementado');
    // }
    //
    // handlePlayAgain() {
    //     throw new Error('Método handlePlayAgain deve ser implementado');
    // }
    //
    // resetGame() {
    //     throw new Error('Método resetGame deve ser implementado');
    // }

}
