import { LocalMovementStrategy } from './local_game.js';
import { WINNING_SCORE } from './game.js'
import { showModal } from './ui.js';
import { getCookie } from './utils.js';

export class TournamentGame extends LocalMovementStrategy {
  constructor(tournamentId, currentMatch) {
      super();
	  this.player1 = currentMatch.player1.length > 14 ? currentMatch.player1.substring(0, 11) + "..." : currentMatch.player1
	  this.player2 = currentMatch.player2.length > 14 ? currentMatch.player2.substring(0, 11) + "..." : currentMatch.player2;
      this.tournamentId = tournamentId;
      this.currentMatch = currentMatch;
      console.log('currentMatch: ', this.currentMatch);
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
          this.isRunning = false;
      } else if (this.player2_score >= WINNING_SCORE) {
          this.updateBracket('player2');
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
        body: JSON.stringify({ winner: this.currentMatch[winner] })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            showModal('tournament', this.currentMatch[winner], this.tournamentId);
        }
    })
    .catch(error => {
        console.error('Error updating bracket:', error);
    });
}
}