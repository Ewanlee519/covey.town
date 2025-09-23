import InvalidParametersError, {
  GAME_FULL_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  BOARD_POSITION_NOT_EMPTY_MESSAGE,
  MOVE_NOT_YOUR_TURN_MESSAGE,
  PLAYER_ALREADY_IN_GAME_MESSAGE,
  PLAYER_NOT_IN_GAME_MESSAGE,
  INVALID_MOVE_MESSAGE,
} from '../../lib/InvalidParametersError';
import {
  GameMove,
  QuantumTicTacToeGameState,
  QuantumTicTacToeMove,
} from '../../types/CoveyTownSocket';
import Game from './Game';
import TicTacToeGame from './TicTacToeGame';
import Player from '../../lib/Player';

/**
 * A QuantumTicTacToeGame is a Game that implements the rules of the Tic-Tac-Toe variant described at https://www.smbc-comics.com/comic/tic.
 * This class acts as a controller for three underlying TicTacToeGame instances, orchestrating the "quantum" rules by taking
 * the role of the monitor.
 */
export default class QuantumTicTacToeGame extends Game<
  QuantumTicTacToeGameState,
  QuantumTicTacToeMove
> {
  private _games: { A: TicTacToeGame; B: TicTacToeGame; C: TicTacToeGame };

  private _xScore: number;

  private _oScore: number;

  private _moveCount: number;

  // New variable to keep track of if a game is finished (for tie cases)
  private _gameEnded: { A: boolean; B: boolean; C: boolean };

  // Initializes a QuantumTicTacToeGame
  public constructor() {
    super({
      moves: [],
      status: 'WAITING_TO_START',
      xScore: 0,
      oScore: 0,
      publiclyVisible: {
        A: [
          [false, false, false],
          [false, false, false],
          [false, false, false],
        ],
        B: [
          [false, false, false],
          [false, false, false],
          [false, false, false],
        ],
        C: [
          [false, false, false],
          [false, false, false],
          [false, false, false],
        ],
      },
    });

    this._games = {
      A: new TicTacToeGame(),
      B: new TicTacToeGame(),
      C: new TicTacToeGame(),
    };
    this._xScore = 0;
    this._oScore = 0;
    this._moveCount = 0;
    this._gameEnded = { A: false, B: false, C: false };
  }

  protected _join(player: Player): void {
    if (this.state.x === player.id || this.state.o === player.id) {
      throw new InvalidParametersError(PLAYER_ALREADY_IN_GAME_MESSAGE);
    }
    if (!this.state.x) {
      this.state = {
        ...this.state,
        x: player.id,
      };
    } else if (!this.state.o) {
      this.state = {
        ...this.state,
        o: player.id,
      };
    } else {
      throw new InvalidParametersError(GAME_FULL_MESSAGE);
    }
    if (this.state.x && this.state.o) {
      this.state = {
        ...this.state,
        status: 'IN_PROGRESS',
      };
    }
    // Join each sub game of the private array
    for (const game of Object.values(this._games)) {
      game.join(player);
    }
  }

  protected _leave(player: Player): void {
    if (this.state.x !== player.id && this.state.o !== player.id) {
      throw new InvalidParametersError(PLAYER_NOT_IN_GAME_MESSAGE);
    }
    // Leave each sub game of the private array so the player is no longer in the game
    for (const game of Object.values(this._games)) {
      if (game.state.x === player.id || game.state.o === player.id) {
        game.leave(player);
      }
    }
    // Handles case where the game has not started yet
    if (this.state.o === undefined) {
      this.state = {
        moves: [],
        status: 'WAITING_TO_START',
        xScore: 0,
        oScore: 0,
        publiclyVisible: {
          A: [
            [false, false, false],
            [false, false, false],
            [false, false, false],
          ],
          B: [
            [false, false, false],
            [false, false, false],
            [false, false, false],
          ],
          C: [
            [false, false, false],
            [false, false, false],
            [false, false, false],
          ],
        },
      };
      return;
    }
    if (this.state.x === player.id) {
      this.state = {
        ...this.state,
        status: 'OVER',
        winner: this.state.o,
      };
    } else {
      this.state = {
        ...this.state,
        status: 'OVER',
        winner: this.state.x,
      };
    }
  }

  /**
   * Checks that the given move is "valid": that the it's the right
   * player's turn, that the game is actually in-progress, etc.
   * @see TicTacToeGame#_validateMove
   */
  private _validateMove(move: GameMove<QuantumTicTacToeMove>): void {
    const { board, col, row, gamePiece } = move.move;

    // A move is valid if the sub-game is not over and there is no winner
    if (
      this._games[board].state.status === 'OVER' &&
      this._games[board].state.winner !== undefined
    ) {
      throw new InvalidParametersError(INVALID_MOVE_MESSAGE);
    }

    // A move is valid if the space is empty
    for (const m of this._games[board].state.moves) {
      if (m.col === col && m.row === row) {
        if (m.gamePiece === gamePiece) {
          throw new InvalidParametersError(INVALID_MOVE_MESSAGE);
        } else if (this.state.publiclyVisible[board][row][col]) {
          throw new InvalidParametersError(BOARD_POSITION_NOT_EMPTY_MESSAGE);
        } else {
          break;
        }
      }
    }

    // A move is only valid if it is the player's turn
    if (gamePiece === 'X' && this.state.moves.length % 2 === 1) {
      throw new InvalidParametersError(MOVE_NOT_YOUR_TURN_MESSAGE);
    } else if (gamePiece === 'O' && this._moveCount % 2 === 0) {
      throw new InvalidParametersError(MOVE_NOT_YOUR_TURN_MESSAGE);
    }

    // A move is valid only if game is in progress
    if (this.state.status !== 'IN_PROGRESS') {
      throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
    }
  }

  public applyMove(move: GameMove<QuantumTicTacToeMove>): void {
    const { board, row, col } = move.move;
    let gamePiece: 'X' | 'O';
    if (move.playerID === this.state.x) {
      gamePiece = 'X';
    } else {
      gamePiece = 'O';
    }
    // Creates a clean move to validate the move
    const cleanMove = {
      ...move,
      move: {
        ...move.move,
        gamePiece,
        col,
        row,
      },
    };
    this._validateMove(cleanMove);
    for (const m of this._games[board].state.moves) {
      if (m.gamePiece !== gamePiece && m.col === col && m.row === row) {
        // This move is a "collapse" move, revealing the position publicly
        this.state = {
          ...this.state,
          moves: [...this.state.moves, move.move],
        };
        // Reveals the move publicly
        this.state.publiclyVisible[board][row][col] = true;
        this._moveCount += 1;
        return;
      }
    }

    this._games[board]._quantumApplyMove(cleanMove.move);

    this.state = {
      ...this.state,
      moves: [...this.state.moves, move.move],
    };

    this._moveCount += 1;
    this._checkForWins();
    this._checkForGameEnding();
  }

  /**
   * Checks all three sub-games for any new three-in-a-row conditions.
   * Awards points and marks boards as "won" so they can't be played on.
   */
  private _checkForWins(): void {
    for (const boardKey of ['A', 'B', 'C'] as const) {
      const boardGame = this._games[boardKey];
      if (boardGame.state.status === 'OVER' && !this._gameEnded[boardKey]) {
        if (boardGame.state.winner === this.state.x) {
          this._xScore++;
          this._gameEnded[boardKey] = true;
        } else if (boardGame.state.winner === this.state.o) {
          this._oScore++;
          this._gameEnded[boardKey] = true;
        } else {
          this._gameEnded[boardKey] = false;
        }
      }
    }
    this.state = {
      ...this.state,
      xScore: this._xScore,
      oScore: this._oScore,
    };
  }

  /**
   * A Quantum Tic-Tac-Toe game ends when no more moves are possible.
   * This happens when all squares on all boards are either occupied or part of a won board.
   */
  private _checkForGameEnding(): void {
    // TODO: implement me
    let gameOverCount = 0;
    for (const boardKey of ['A', 'B', 'C'] as const) {
      if (this._games[boardKey].state.status === 'OVER') {
        gameOverCount++;
      }
    }

    if (gameOverCount === 3) {
      this.state = {
        ...this.state,
        status: 'OVER',
      };
      if (this._xScore > this._oScore) {
        this.state.winner = this.state.x;
      } else if (this._oScore > this._xScore) {
        this.state.winner = this.state.o;
      } else {
        this.state.winner = undefined;
      }
    }
  }
}
