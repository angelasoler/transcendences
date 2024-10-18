import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
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

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
        this.renderer.setSize(this.canvas.width, this.canvas.height);

        // Create floor
        const floorGeometry = new THREE.PlaneGeometry(this.canvas.width, this.canvas.height);
        const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x990033 });
        const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        this.scene.add(floorMesh);

        // Create paddles
        const paddleGeometry = new THREE.BoxGeometry(this.paddleWidth, this.paddleHeight, 10);
        const paddleMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

        this.leftPaddleMesh = new THREE.Mesh(paddleGeometry, paddleMaterial);
        this.leftPaddleMesh.position.x = -this.canvas.width / 2 + this.paddleWidth / 2;
        this.scene.add(this.leftPaddleMesh);

        this.rightPaddleMesh = new THREE.Mesh(paddleGeometry, paddleMaterial);
        this.rightPaddleMesh.position.x = this.canvas.width / 2 - this.paddleWidth / 2;
        this.scene.add(this.rightPaddleMesh);

        // Create ball
        const ballGeometry = new THREE.SphereGeometry(this.ballRadius, 32, 32);
        const ballMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
        this.scene.add(this.ballMesh);
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
    }


    handleBallCollision() {
        if (this.ball.pos.y <= 0 || this.ball.pos.y >= this.canvas.height) {
            const normal = new THREE.Vector2(0, 1);
            const dotProduct = this.ball.speed.dot(normal);
            const reflection = normal.clone().multiplyScalar(2 * dotProduct);
            this.ball.speed.sub(reflection);
        }
        if (this.ball.pos.x < 0 || this.ball.pos.x > this.canvas.width) {
            if (this.ball.x < 0) {
                this.opponent_score += 1;
            } else if (this.ball.x > this.canvas.width) {
                this.my_score += 1;
            }
            this.resetBall();
            
        }
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
