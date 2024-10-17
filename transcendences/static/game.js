export { MovementStrategy };

export function initGame(mvStrategy) {
    // Salva a atual instancia de MovementStrategy globalmente
    // para que possamos chamar closeGame() quando mudar de view
    window.currentMovementStrategy = mvStrategy;
    gameLoop(mvStrategy);
}

export const gameLoop = (mvStrategy) => {
    // console.log('Game loop');
    if (!mvStrategy.isRunning) {
        console.log('Game loop stopped.');
        return;
    }
    if (mvStrategy.start) {
        mvStrategy.update();
        mvStrategy.draw();
    }
    mvStrategy.animationFrameId = requestAnimationFrame(() => gameLoop(mvStrategy));
};

class MovementStrategy {
    constructor() {
        this.start = true;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.my_score = 0;
        this.opponent_score = 0;

        this.isRunning = true;
        this.animationFrameId = null;

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
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            speedX: 3,
            speedY: 3
        };

        this.boundHandleKeyDown = this.handleKeyDown.bind(this);
        this.boundHandleKeyUp = this.handleKeyUp.bind(this);
        this.boundCloseGame = this.closeGame.bind(this);

        document.addEventListener('keydown', this.boundHandleKeyDown);
        document.addEventListener('keyup', this.boundHandleKeyUp);
        window.addEventListener('beforeunload', this.boundCloseGame);
        window.addEventListener('popstate', this.boundCloseGame);

    }

    handleKeyUp() {
        throw new Error('Método handleKeyUp deve ser implementado');
    }

    handleKeyDown() {
        throw new Error('Método handleKeyDown deve ser implementado');
    }

    closeGame() {
        throw new Error('Método close deve ser implementado');
    }

    displayWinnerMessage() {
        throw new Error('Método displayWinnerMessage deve ser implementado');
    }

    handlePlayAgain() {
        throw new Error('Método handlePlayAgain deve ser implementado');
    }

    resetGame() {
        throw new Error('Método resetGame deve ser implementado');
    }

    update() {
        throw new Error('Método update deve ser implementado');
    }

    draw () {
        if (!this.ball) {
            console.warn('Ball is undefined. Skipping draw.');
            return;
        }
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
        this.ctx.fillStyle = 'green';
    
        this.ctx.fillRect(0, this.leftPaddle.y, this.paddleWidth, this.paddleHeight);
    
        this.ctx.fillRect(this.canvas.width - this.paddleWidth, this.rightPaddle.y, this.paddleWidth, this.paddleHeight);
    
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ballRadius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    checkPaddleCollision(paddle, isLeft) {
        const paddleX = isLeft ? this.paddleWidth : this.canvas.width - this.paddleWidth;

        return this.ball.y >= paddle.y && 
               this.ball.y <= paddle.y + this.paddleHeight &&
               (isLeft ? 
                 this.ball.x <= paddleX + this.paddleWidth && this.ball.x >= paddleX :
                 this.ball.x >= paddleX - this.paddleWidth && this.ball.x <= paddleX);
    }

    resetBall() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        this.ball.speedX = -this.ball.speedX;
    }
}
