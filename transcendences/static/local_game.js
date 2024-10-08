import {MovementStrategy, canvas, context} from './game.js'


export class LocalMovementStrategy extends MovementStrategy {
    constructor() {
        super();
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.paddleHeight = 100;
        this.paddleWidth = 10;
        this.ballRadius = 8;
        
        this.leftPaddle = {
          y: this.canvas.height / 2 - this.paddleHeight / 2,
          speed: 0
        };
        
        this.rightPaddle = {
          y: this.canvas.height / 2 - this.paddleHeight / 2,
          speed: 0
        };

        this.keys = {
            w: false,
            s: false,
            ArrowUp: false,
            ArrowDown: false
        };
        
        this.ball = {
          x: this.canvas.width / 2,
          y: this.canvas.height / 2,
          speedX: 5,
          speedY: 5
        };
        
        this.paddleSpeed = 5;
        
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        this.animate();
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
        // calculo paddle esquerdo
        if (this.keys.w && !this.keys.s)
            this.leftPaddle.speed = -this.paddleSpeed;
        else if (this.keys.s && !this.keys.w)
            this.leftPaddle.speed = this.paddleSpeed;
        else
            this.leftPaddle.speed = 0;

        // calculo paddle direito
        if (this.keys.ArrowUp && !this.keys.ArrowDown)
           this.rightPaddle.speed = -this.paddleSpeed;
        else if (this.keys.ArrowDown && !this.keys.ArrowUp)
            this.rightPaddle.speed = this.paddleSpeed;
        else
        this.rightPaddle.speed = 0;
    
        // Atualiza posição dos paddles
        this.leftPaddle.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, this.leftPaddle.y + this.leftPaddle.speed));
        this.rightPaddle.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, this.rightPaddle.y + this.rightPaddle.speed));


        this.ball.x += this.ball.speedX;
        this.ball.y += this.ball.speedY;
        
        // Colisão com as paredes superior e inferior
        if (this.ball.y <= 0 || this.ball.y >= this.canvas.height) {
          this.ball.speedY = -this.ball.speedY;
        }

        if (this.checkPaddleCollision(this.leftPaddle, true) || 
            this.checkPaddleCollision(this.rightPaddle, false)) {
          this.ball.speedX = -this.ball.speedX;
        }

        if (this.ball.x < 0 || this.ball.x > this.canvas.width) {
            this.resetBall();
        }
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
      
    draw() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = 'green';

        this.ctx.fillRect(0, this.leftPaddle.y, this.paddleWidth, this.paddleHeight);

        this.ctx.fillRect(this.canvas.width - this.paddleWidth, this.rightPaddle.y, this.paddleWidth, this.paddleHeight);

        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ballRadius, 0, Math.PI * 2);
        this.ctx.fill();
    }
      
    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(this.animate.bind(this));
    }
}

