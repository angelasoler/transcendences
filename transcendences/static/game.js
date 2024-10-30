import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { FontLoader, TextGeometry } from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';

export { MovementStrategy };

export const WINNING_SCORE = 10;

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
        this.player1_score = 0;
        this.player2_score = 0;
        this.player1 = 'Player1';
        this.player2 = 'Player2';

        this.isRunning = true;
        this.animationFrameId = null;
        this.ballPassedPaddle = false;
        this.currentTime = 0;

        this.paddleHeight = 100;
        this.paddleWidth = 10;
        this.ballRadius = 8;
        this.paddleSpeed = 3;

        // Define initial speeds
        this.initialSpeed = 1; // Speed when the ball resets
        this.collisionSpeedX = 2; // Horizontal speed after paddle collision
        this.maxBallSpeed = 3;    // Maximum speed of the ball

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
            speed: new THREE.Vector2(2, 0),
        };

        this.scoreDigits = {
            player: [],
            opponent: []
        };

        this.fontLoaded = false; // Flag to indicate font loading status
    }

    initThreeJS() {
        this.disableScrollOnGame();
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
        this.renderer.shadowMap.enabled = true;
    
        // Create floor
        const floorGeometry = new THREE.PlaneGeometry(this.canvas.width + 60, this.canvas.height + 20);
        const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x006400 });
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        floorMesh.position.z = -10;
        floorMesh.receiveShadow = true;
        this.scene.add(floorMesh);

        const bgGeometry = new THREE.PlaneGeometry(this.canvas.width + 150, this.canvas.height + 100);
        const bgMaterial = new THREE.MeshStandardMaterial({ color: 0xADD8E6 });
        const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
        bgMesh.position.z = -15;
        bgMesh.receiveShadow = true;
        this.scene.add(bgMesh);
    
        this.addBall();
        this.addPaddles();
        this.addWalls();
        this.addLights();
    
        this.loadFont();
    }

    addBall() {
        // Create ball
        const ballGeometry = new THREE.SphereGeometry(this.ballRadius, 32, 32);
        const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        this.ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
        this.ballMesh.castShadow = true;
        this.scene.add(this.ballMesh);
    }

    addPaddles() {
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
    }

    addWalls() {
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
        leftWallMesh.castShadow = true;
        this.scene.add(leftWallMesh);

        // Right wall
        const rightWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, 15);
        const rightWallMesh = new THREE.Mesh(rightWallGeometry, wallMaterial);
        rightWallMesh.position.set(this.canvas.width / 2 + wallThickness / 2 + 10, 0, 0);
        rightWallMesh.receiveShadow = true;
        rightWallMesh.castShadow = true;
        this.scene.add(rightWallMesh);

        // Top wall
        const topWallGeometry = new THREE.BoxGeometry(wallWidth + 60, wallThickness, 15);
        const topWallMesh = new THREE.Mesh(topWallGeometry, wallMaterial);
        topWallMesh.position.set(0, this.canvas.height / 2 + wallThickness / 2, 0);
        topWallMesh.receiveShadow = true;
        topWallMesh.castShadow = true;
        this.scene.add(topWallMesh);

        // Bottom wall
        const bottomWallGeometry = new THREE.BoxGeometry(wallWidth + 60, wallThickness, 15);
        const bottomWallMesh = new THREE.Mesh(bottomWallGeometry, wallMaterial);
        bottomWallMesh.position.set(0, -this.canvas.height / 2 - wallThickness / 2, 0);
        bottomWallMesh.receiveShadow = true;
        bottomWallMesh.castShadow = true;
        this.scene.add(bottomWallMesh);
        
    }

    addLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 1, 10000);
        pointLight.position.set(0, 250, 250);
        pointLight.castShadow = true;
        this.scene.add(pointLight);
    }

    loadFont() {
        const loader = new FontLoader();
        loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
            this.font = font;
            this.fontLoaded = true; // Set flag to indicate font is loaded
            this.addPlayersName();
            this.updateScoreboard();
        });
    }

    addPlayersName() {
        if (!this.fontLoaded) {
            console.error('Cannot add player names: font not loaded');
            return;
        }

        // Add player names
        const playerNameMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

        const playerNameGeometry = new THREE.TextGeometry(this.player1, {
            font: this.font,
            size: 16,
            height: 1,
        });

        playerNameGeometry.computeBoundingBox();
        const playerNameOffset = playerNameGeometry.boundingBox.max.x - playerNameGeometry.boundingBox.min.x;
        const playerNameMesh = new THREE.Mesh(playerNameGeometry, playerNameMaterial);
        playerNameMesh.position.set(-150 - playerNameOffset / 2, 165, 0); // Adjust position as needed
        this.scene.add(playerNameMesh);

        const opponentNameGeometry = new THREE.TextGeometry(this.player2, {
            font: this.font,
            size: 16,
            height: 1,
        });

        opponentNameGeometry.computeBoundingBox();
        const opponentNameOffset = opponentNameGeometry.boundingBox.max.x - opponentNameGeometry.boundingBox.min.x;
        const opponentNameMesh = new THREE.Mesh(opponentNameGeometry, playerNameMaterial);
        opponentNameMesh.position.set(150 - opponentNameOffset / 2, 165, 0); // Adjust position as needed
        this.scene.add(opponentNameMesh);
    }

    updateScoreboard() {
        if (!this.fontLoaded) {
            console.error('Cannot update scoreboard: font not loaded');
            return;
        }

        const scoreMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    
        // Calculate the total width of the scores
        const playerScoreWidth = this.player1_score.toString().length * 30;
        const opponentScoreWidth = this.player2_score.toString().length * 30;

        // Calculate the offsets to center the scores
        const playerScoreOffset = -playerScoreWidth / 2 - 50;
        const opponentScoreOffset = -opponentScoreWidth / 2 + 50;

        // Update player score text
        this.updateScore(this.player1_score, playerScoreOffset, scoreMaterial, 'player');
        
        // Update opponent score text
        this.updateScore(this.player2_score, opponentScoreOffset, scoreMaterial, 'opponent');
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

    disableScrollOnGame() {
        window.addEventListener('keydown', this.preventArrowScroll);
    }

    enableScroll() {
        window.removeEventListener('keydown', this.preventArrowScroll);
    }

    preventArrowScroll(event) {
        const keysToPrevent = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
        if (keysToPrevent.includes(event.key)) {
            event.preventDefault();
        }
    }

    handleScores() {
        throw new Error('Método handleScores deve ser implementado');
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
}
