import { LocalMovementStrategy } from './local_game.js';
import { displayMatchups } from './tournament.js';

class TournamentGame extends LocalMovementStrategy {
  constructor(tournamentId, currentMatchup) {
      super();
      this.tournamentId = tournamentId;
      this.currentMatchup = currentMatchup;
  }

  handleScores() {
      if (this.ball.pos.x < 0) {
          this.player2_score += 1;
      } else if (this.ball.pos.x > this.canvas.width) {
          this.player1_score += 1;
      }
      console.log('Pontos:', this.player1_score, this.player2_score);
      this.updateScoreboard();
      this.resetBall();
      this.checkGameEnd();
  }

  checkGameEnd() {
      if (this.player1_score >= WINNING_SCORE) {
          this.updateBracket('player1');
          this.displayWinnerMessage('win', 'Congratulations! You won the game.');
          this.isRunning = false;
      } else if (this.player2_score >= WINNING_SCORE) {
          this.updateBracket('player2');
          this.displayWinnerMessage('lose', 'Sorry! You lost the game.');
          this.isRunning = false;
      }
  }

  updateBracket(winner) {
      fetch(`/api/update_bracket/${this.tournamentId}/`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCookie('csrftoken'),
          },
          body: JSON.stringify({ winner: this.currentMatchup[winner] })
      })
      .then(response => response.json())
      .then(data => {
          if (data.error) {
              alert(data.error);
          } else {
              displayMatchups(this.tournamentId);
          }
      })
      .catch(error => {
          console.error('Error updating bracket:', error);
      });
  }
}

export { TournamentGame };