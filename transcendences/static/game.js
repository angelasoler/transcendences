// static/your_app/js/base_game.js

export class BaseGame {
    constructor(canvas) {
        if (!canvas) {
            throw new Error("Canvas element not found");
        }

        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(40, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
        this.camera.position.z = 60;
        this.camera.position.y = -5;
        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
        this.renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            antialias: true
        });
        this.renderer.shadowMap.enabled = true;

        this.fieldWidth = 60;
        this.fieldHeight = 40;
        
        // Game properties
        this.paddleSpeed = 0.12;
        this.ballSpeed = 0.15;
        this.paddleHeight = 4;
        this.paddleWidth = 1;
        this.ballRadius = 1.5;
        
        // Initial ball direction
        this.ballDirection = new THREE.Vector3(1, 1, 0);
        
        this.lastScoredSide = 'left';

        // Scores
        this.leftScore = 0;
        this.rightScore = 0;

        // Player names
        this.leftPlayerName = "Player 1";
        this.rightPlayerName = "Player 2";
        
        this.initScene();
        this.createPaddles();
        this.createBall();
        this.createScoreboard();
        this.animate();

        // Set up event listeners
        this.setupEventListeners();
    }

    initScene() {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        this.scene.add(ambientLight);

        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 20);
        directionalLight.position.set(0, 5, 50); // Position behind the camera
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        directionalLight.shadow.camera.left = -this.fieldWidth / 2;
        directionalLight.shadow.camera.right = this.fieldWidth / 2;
        directionalLight.shadow.camera.top = this.fieldHeight / 2;
        directionalLight.shadow.camera.bottom = -this.fieldHeight / 2;

        // Add a simple plane as the game field
        const planeGeometry = new THREE.PlaneGeometry(this.fieldWidth, this.fieldHeight);
        const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x4B0082, side: THREE.DoubleSide });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.position.z = -5;
        plane.receiveShadow = true;
        this.scene.add(plane);
    }

    createPaddles() {
        const paddleGeometry = new THREE.BoxGeometry(this.paddleWidth, this.paddleHeight, 0.5);
        const paddleMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });

        this.leftPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
        this.leftPaddle.position.x = -this.fieldWidth / 2; // Adjusted paddle position
        this.leftPaddle.position.y = 5;
        this.leftPaddle.castShadow = true;
        this.leftPaddle.receiveShadow = true;
        this.scene.add(this.leftPaddle);
        
        this.rightPaddle = new THREE.Mesh(paddleGeometry, paddleMaterial);
        this.rightPaddle.position.x = this.fieldWidth / 2; // Adjusted paddle position
        this.rightPaddle.position.y = 5;
        this.leftPaddle.castShadow = true;
        this.leftPaddle.receiveShadow = true;
        this.scene.add(this.rightPaddle);
    }

    createBall() {
        const cylinderGeometry = new THREE.CylinderGeometry(this.ballRadius, this.ballRadius, 1, 16, 1);
        const cylinderMaterial = new THREE.MeshStandardMaterial({ color: 0x006B6B });
        this.ball = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
        this.ball.castShadow = true;
        this.ball.rotation.x = Math.PI / 2;
        this.resetBall();
        this.scene.add(this.ball);
    }

    createScoreboard() {
        this.leftPlayerText = new SpriteText(this.leftPlayerName, 3, 'white');
        this.leftPlayerText.position.set(-this.fieldWidth / 8, this.fieldHeight / 2, 0);
        this.scene.add(this.leftPlayerText);

        this.rightPlayerText = new SpriteText(this.rightPlayerName, 3, 'white');
        this.rightPlayerText.position.set(this.fieldWidth / 8, this.fieldHeight / 2, 0);
        this.scene.add(this.rightPlayerText);

        this.leftScoreText = new SpriteText(this.leftScore.toString(), 6, 'white');
        this.leftScoreText.position.set(-this.fieldWidth / 8, this.fieldHeight / 2 - 4.5, 0);
        this.scene.add(this.leftScoreText);

        this.rightScoreText = new SpriteText(this.rightScore.toString(), 6, 'white');
        this.rightScoreText.position.set(this.fieldWidth / 8, this.fieldHeight / 2 - 4.5, 0);
        this.scene.add(this.rightScoreText);

        const scoreboardGeometry = new THREE.PlaneGeometry(30, 15);
        const scoreboardMaterial = new THREE.MeshBasicMaterial({ color: 0x0000FF, opacity: 0.5, transparent: true });
        this.scoreboard = new THREE.Mesh(scoreboardGeometry, scoreboardMaterial);
        this.scoreboard.position.set(0, 20, -1);
        this.scoreboard.rotation.x = Math.PI / 5;
        this.scene.add(this.scoreboard);
    }

    animate() {
        this.renderer.setAnimationLoop(() => {
            this.update();
            this.renderer.render(this.scene, this.camera);
        });
    }

    setupEventListeners() {
        this.keys = {
            w: false,
            s: false,
            ArrowUp: false,
            ArrowDown: false
        };

        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    handleKeyDown(e) {
        if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            this.keys[e.key] = true;
        }
    }

    handleKeyUp(e) {
        if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
            this.keys[e.key] = false;
        }
    }

    update() {
        // Update paddle positions based on keyboard input
        this.updatePaddlePositions();
        this.updateBallPosition();
        this.checkCollisions();
        this.checkGameEnd();
    }

    updatePaddlePositions() {
        if (this.keys.w) {
            this.updatePaddlePosition('left', this.leftPaddle.position.y + this.paddleSpeed);
        }
        if (this.keys.s) {
            this.updatePaddlePosition('left', this.leftPaddle.position.y - this.paddleSpeed);
        }
        if (this.keys.ArrowUp) {
            this.updatePaddlePosition('right', this.rightPaddle.position.y + this.paddleSpeed);
        }
        if (this.keys.ArrowDown) {
            this.updatePaddlePosition('right', this.rightPaddle.position.y - this.paddleSpeed);
        }
    }

    updatePaddlePosition(side, newY) {
        let paddle = side === 'left' ? this.leftPaddle : this.rightPaddle;
        paddle.position.y = Math.max(-this.fieldHeight / 2, Math.min(this.fieldHeight / 2, newY));
    }

    updateBallPosition() {
        if (this.ball) {
            this.ball.position.x += this.ballSpeed * this.ballDirection.x;
            this.ball.position.y += this.ballSpeed * this.ballDirection.y;
        }
    }

    updateScoreboard() {
        this.leftScoreText.text = this.leftScore.toString();
        this.rightScoreText.text = this.rightScore.toString();
    }

    checkCollisions() {
        if (!this.ball) return;

        // Collision with walls
        if (this.ball.position.y > (this.fieldHeight / 2) - this.ballRadius || this.ball.position.y < -(this.fieldHeight / 2) + this.ballRadius) {
            this.ballDirection.y *= -1;
        }

        // Collision with paddles
        const paddleCollision = (paddle) => {
            return this.ball.position.x + this.ballRadius >= paddle.position.x - this.paddleWidth / 2 &&
               this.ball.position.x - this.ballRadius <= paddle.position.x + this.paddleWidth / 2 &&
               this.ball.position.y + this.ballRadius >= paddle.position.y - this.paddleHeight / 2 &&
               this.ball.position.y - this.ballRadius <= paddle.position.y + this.paddleHeight / 2;
        };

        if (paddleCollision(this.leftPaddle) || paddleCollision(this.rightPaddle)) {
            this.ballDirection.x *= -1;
        }

        // Ball out of bounds
        if (this.ball.position.x < -this.fieldWidth / 2) {
            this.rightScore++;
            this.lastScoredSide = 'right'; // Right side scored
            this.updateScoreboard();
            this.checkGameEnd();
            this.resetBall();
        } else if (this.ball.position.x > this.fieldWidth / 2) {
            this.leftScore++;
            this.lastScoredSide = 'left'; // Left side scored
            this.updateScoreboard();
            this.checkGameEnd();
            this.resetBall();
        }
    }

    resetBall() {
        if (this.ball) {
            this.ball.position.set(0, 0, 0);
            // Randomize ball direction within +/-30 degrees from the x axis
            const angle = (Math.random() * 60 - 30) * (Math.PI / 180); // Convert degrees to radians
            const directionX = this.lastScoredSide === 'left' ? 1 : -1;
            const directionY = Math.tan(angle);
            this.ballDirection = new THREE.Vector3(directionX, directionY, 0).normalize();
        }
    }

    checkGameEnd() {
        if (this.leftScore >= 10 || this.rightScore >= 10) {
            this.endGame();
        }
    }

    endGame() {
        this.renderer.setAnimationLoop(null);
        alert(`Game Over! ${this.leftScore >= 10 ? this.leftPlayerName : this.rightPlayerName} wins!`);
    }

    dispose() {
        // Clean up resources
        this.renderer.dispose();
        this.scene = null;
        this.camera = null;
        this.renderer = null;
    }
}