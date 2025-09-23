import {
  GAME_FULL_MESSAGE,
  INVALID_MOVE_MESSAGE,
  MOVE_NOT_YOUR_TURN_MESSAGE,
  PLAYER_ALREADY_IN_GAME_MESSAGE,
  PLAYER_NOT_IN_GAME_MESSAGE,
} from '../../lib/InvalidParametersError';
import Player from '../../lib/Player';
import { GameMove } from '../../types/CoveyTownSocket';
import QuantumTicTacToeGame from './QuantumTicTacToeGame';
import { createPlayerForTesting } from '../../TestUtils';

describe('QuantumTicTacToeGame', () => {
  let game: QuantumTicTacToeGame;
  let player1: Player;
  let player2: Player;

  beforeEach(() => {
    game = new QuantumTicTacToeGame();
    player1 = createPlayerForTesting();
    player2 = createPlayerForTesting();
  });

  describe('_join', () => {
    it('should add the first player as X, second as O', () => {
      game.join(player1);
      expect(game.state.x).toBe(player1.id);
      expect(game.state.o).toBeUndefined();
      expect(game.state.status).toBe('WAITING_TO_START');
      game.join(player2);
      expect(game.state.x).toBe(player1.id);
      expect(game.state.o).toBe(player2.id);
      expect(game.state.status).toBe('IN_PROGRESS');
    });
    it('should not allow player to join twice', () => {
      game.join(player1);
      game.join(player2);
      expect(() => game.join(player1)).toThrowError(PLAYER_ALREADY_IN_GAME_MESSAGE);
      expect(() => game.join(player2)).toThrowError(PLAYER_ALREADY_IN_GAME_MESSAGE);
    });
    it('should throw an error if game is already full', () => {
      game.join(player1);
      game.join(player2);
      const player3: Player = createPlayerForTesting();
      expect(game.state.x).toBe(player1.id);
      expect(game.state.o).toBe(player2.id);
      expect(() => game.join(player3)).toThrow(GAME_FULL_MESSAGE);
    });
    it('sets game status to IN_PROGRESS', () => {
      game.join(player1);
      game.join(player2);
      expect(game.state.status).toEqual('IN_PROGRESS');
      expect(game.state.winner).toBeUndefined();
      expect(game.state.moves).toHaveLength(0);
    });
  });

  describe('_leave', () => {
    it('should throw an error if player not in game', () => {
      expect(() => game.leave(player1)).toThrowError(PLAYER_NOT_IN_GAME_MESSAGE);
      game.join(player1);
      expect(() => game.leave(player2)).toThrowError(PLAYER_NOT_IN_GAME_MESSAGE);
    });

    it('should set game to WAITING_TO_START if game not in progress', () => {
      game.join(player1);
      expect(game.state.x).toEqual(player1.id);
      expect(game.state.o).toBeUndefined();
      expect(game.state.status).toEqual('WAITING_TO_START');
      game.leave(player1);
      expect(game.state.x).toBeUndefined();
      expect(game.state.o).toBeUndefined();
      expect(game.state.status).toEqual('WAITING_TO_START');
      expect(game.state.winner).toBeUndefined();
    });

    describe('when two players are in the game', () => {
      beforeEach(() => {
        game.join(player1);
        game.join(player2);
      });

      it('should set the game to OVER and declare the other player the winner', () => {
        game.leave(player1);
        expect(game.state.status).toBe('OVER');
        expect(game.state.winner).toBe(player2.id);
      });
    });
  });

  describe('applyMove', () => {
    beforeEach(() => {
      game.join(player1);
      game.join(player2);
    });

    const makeMove = (player: Player, board: 'A' | 'B' | 'C', row: 0 | 1 | 2, col: 0 | 1 | 2) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const move: GameMove<any> = {
        playerID: player.id,
        gameID: game.id,
        move: { board, row, col },
      };
      game.applyMove(move);
    };

    describe('should throw an error if it not the player turn', () => {
      it('stops O from going first', () => {
        expect(() => makeMove(player2, 'A', 0, 0)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
      });
      it('stops players from going twice in a row', () => {
        makeMove(player1, 'A', 0, 0);
        expect(() => makeMove(player1, 'A', 1, 1)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
        makeMove(player2, 'B', 0, 0);
        expect(() => makeMove(player2, 'B', 1, 1)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
      });
    });

    describe('should handle a collision by losing the second players turn', () => {
      it('should switch turns for a collision', () => {
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'A', 0, 0); // O collision
        expect(game.state.publiclyVisible.A[0][0]).toBe(true);
        expect(game.state.moves.length % 2).toBe(0);
        expect(() => makeMove(player2, 'B', 0, 0)).toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
        expect(() => makeMove(player1, 'B', 0, 0)).not.toThrowError(MOVE_NOT_YOUR_TURN_MESSAGE);
      });
      it('should allow collisions on only tied games', () => {});
      it('should allow collisions on only non-revealed and opposite pieces', () => {
        makeMove(player1, 'A', 1, 1); // X
        makeMove(player2, 'A', 1, 1); // O collapse
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'A', 2, 2); // O
        makeMove(player1, 'A', 2, 2); // X collapse
        makeMove(player2, 'A', 0, 0); // O collapse
        makeMove(player1, 'A', 0, 2); // X
        makeMove(player2, 'A', 0, 2); // O collapse
        // @ts-expect-error - private property
        expect(game._games.A._board[0][2]).toBe('X');
        expect(game.state.moves.length).toBe(8);
        expect(game.state.publiclyVisible.A[0][2]).toBe(true);
      });
    });

    it('should throw an error if a player tries to play on their own piece', () => {
      makeMove(player1, 'A', 0, 0); // X
      makeMove(player2, 'B', 0, 0); // O
      makeMove(player1, 'A', 2, 2); // X
      makeMove(player2, 'A', 0, 0); // O reveals X
      // X can not place on an X piece
      expect(() => makeMove(player1, 'A', 0, 0)).toThrowError(INVALID_MOVE_MESSAGE);
      expect(game.state.publiclyVisible.A[0][0]).toBe(true);
      expect(() => makeMove(player1, 'A', 2, 2)).toThrowError(INVALID_MOVE_MESSAGE);
      expect(game.state.publiclyVisible.A[2][2]).toBe(false);
      makeMove(player1, 'C', 0, 0); // X
      makeMove(player2, 'C', 2, 2); // O
      makeMove(player1, 'B', 0, 0); // X reveals O
      // O can not place on an O piece
      expect(() => makeMove(player2, 'B', 0, 0)).toThrowError(INVALID_MOVE_MESSAGE);
      expect(game.state.publiclyVisible.B[0][0]).toBe(true);
      expect(() => makeMove(player2, 'C', 2, 2)).toThrowError(INVALID_MOVE_MESSAGE);
      expect(game.state.publiclyVisible.C[2][2]).toBe(false);
      expect(game.state.moves.length).toBe(7);
    });

    it('should place a piece on an empty square', () => {
      makeMove(player1, 'A', 0, 0);
      // @ts-expect-error - private property
      expect(game._games.A._board[0][0]).toBe('X');
      expect(game.state.moves.length).toBe(1);
    });

    describe('scoring and game end', () => {
      it('should award a point when a player gets three-in-a-row', () => {
        // X gets a win on board A
        makeMove(player1, 'A', 0, 0); // X
        makeMove(player2, 'B', 0, 0); // O
        makeMove(player1, 'A', 0, 1); // X
        makeMove(player2, 'B', 0, 1); // O
        makeMove(player1, 'A', 0, 2); // X -> scores 1 point

        expect(game.state.xScore).toBe(1);
        expect(game.state.oScore).toBe(0);
      });
    });
  });
});
