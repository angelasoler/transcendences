import { PongGame } from './game.js';


// export class LocalMovementStrategy extends MovementStrategy {
//     constructor() {
//         super();

//         this.keys = {
//             w: false,
//             s: false,
//             ArrowUp: false,
//             ArrowDown: false
//         };
//       }
      
//       handleKeyDown(e) {
//         if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
//             this.keys[e.key] = true;
//         }
//       }

//       handleKeyUp(e) {
//         if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
//             this.keys[e.key] = false;
//         }
//       }

//       update() {
//         // calculo paddle esquerdo
//         if (this.keys.w && !this.keys.s)
//             this.leftPaddle.speed = -this.paddleSpeed;
//         else if (this.keys.s && !this.keys.w)
//             this.leftPaddle.speed = this.paddleSpeed;
//         else
//             this.leftPaddle.speed = 0;

//         // calculo paddle direito
//         if (this.keys.ArrowUp && !this.keys.ArrowDown)
//            this.rightPaddle.speed = -this.paddleSpeed;
//         else if (this.keys.ArrowDown && !this.keys.ArrowUp)
//             this.rightPaddle.speed = this.paddleSpeed;
//         else
//         this.rightPaddle.speed = 0;
    
//         // Atualiza posição dos paddles
//         this.leftPaddle.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, this.leftPaddle.y + this.leftPaddle.speed));
//         this.rightPaddle.y = Math.max(0, Math.min(this.canvas.height - this.paddleHeight, this.rightPaddle.y + this.rightPaddle.speed));


//         this.ball.x += this.ball.speedX;
//         this.ball.y += this.ball.speedY;
        
//         // Colisão com as paredes superior e inferior
//         if (this.ball.y <= 0 || this.ball.y >= this.canvas.height) {
//           this.ball.speedY = -this.ball.speedY;
//         }

//         if (this.checkPaddleCollision(this.leftPaddle, true) || 
//             this.checkPaddleCollision(this.rightPaddle, false)) {
//           this.ball.speedX = -this.ball.speedX;
//         }

//         if (this.ball.x < 0 || this.ball.x > this.canvas.width) {
//             this.resetBall();
//         }
//     }

//     closeGame() {
//         console.log('Game closed');
//         this.isRunning = false;
//         if (this.animationFrameId) {
//           cancelAnimationFrame(this.animationFrameId);
//         }
//         document.removeEventListener('keydown', this.handleKeyDown);
//         document.removeEventListener('keyup', this.handleKeyUp);
//     }
// }

export class LocalPlay {
  constructor(canvas) {
      this.game = new PongGame(canvas);
      this.keys = {
          w: false,
          s: false,
          ArrowUp: false,
          ArrowDown: false
      };

      this.setupInputHandlers();
  }

  setupInputHandlers() {
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
      // Update ball position
      // Check for collisions
      // Reset ball if necessary

      this.game.updatePaddlePosition('left', this.getLeftPaddleY());
      this.game.updatePaddlePosition('right', this.getRightPaddleY());
      this.game.updateBallPosition(this.getBallX(), this.getBallY());

      this.game.checkCollisions();
  }

getLeftPaddleY() {
        if (this.keys.w && !this.keys.s) {
                return this.game.leftPaddle.y - this.game.paddleSpeed;
        } else if (this.keys.s && !this.keys.w) {
                return this.game.leftPaddle.y + this.game.paddleSpeed;
        } else {
                return this.game.leftPaddle.y;
        }
}

getRightPaddleY() {
        if (this.keys.ArrowUp && !this.keys.ArrowDown) {
                return this.game.rightPaddle.y - this.game.paddleSpeed;
        } else if (this.keys.ArrowDown && !this.keys.ArrowUp) {
                return this.game.rightPaddle.y + this.game.paddleSpeed;
        } else {
                return this.game.rightPaddle.y;
        }
}

getBallX() {
        return this.game.ball.x;
}

getBallY() {
        return this.game.ball.y;
}

  startGame() {
      this.game.start = true;
      setInterval(() => this.update(), 16); // 60 FPS
  }

  endGame() {
      this.game.start = false;
  }
}