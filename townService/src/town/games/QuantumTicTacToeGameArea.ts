import InvalidParametersError, {
  GAME_ID_MISSMATCH_MESSAGE,
  GAME_NOT_IN_PROGRESS_MESSAGE,
  INVALID_COMMAND_MESSAGE,
} from '../../lib/InvalidParametersError';
import Player from '../../lib/Player';
import {
  GameInstance,
  InteractableCommand,
  InteractableCommandReturnType,
  InteractableType,
  QuantumTicTacToeGameState,
} from '../../types/CoveyTownSocket';
import GameArea from './GameArea';
import QuantumTicTacToeGame from './QuantumTicTacToeGame';

/**
 * A QuantumTicTacToeGameArea is a GameArea that hosts a QuantumTicTacToeGame.
 * @see QuantumTicTacToeGame
 * @see GameArea
 */
export default class QuantumTicTacToeGameArea extends GameArea<QuantumTicTacToeGame> {
  protected getType(): InteractableType {
    return 'QuantumTicTacToeArea';
  }

  private _stateUpdated(updatedState: GameInstance<QuantumTicTacToeGameState>) {
    if (updatedState.state.status === 'OVER') {
      // If we haven't yet recorded the outcome, do so now.
      const gameID = this._game?.id;
      if (gameID && !this._history.find(eachResult => eachResult.gameID === gameID)) {
        const { x, o, xScore, oScore } = updatedState.state;
        if (x && o) {
          const xName = this._occupants.find(eachPlayer => eachPlayer.id === x)?.userName || x;
          const oName = this._occupants.find(eachPlayer => eachPlayer.id === o)?.userName || o;
          this._history.push({
            gameID,
            scores: {
              [xName]: xScore,
              [oName]: oScore,
            },
          });
        }
      }
    }
    this._emitAreaChanged();
  }

  /**
   * Handle a command from a player in this game area.
   * Supported commands:
   * - JoinGame (joins the game `this._game`, or creates a new one if none is in progress)
   * - GameMove (applies a move to the game)
   * - LeaveGame (leaves the game)
   *
   * If the command is successful (does not throw an error), calls this._emitAreaChanged (necessary
   * to notify any listeners of a state update)
   * If the command is unsuccessful (throws an error), the error is propagated to the caller
   */
  public handleCommand<CommandType extends InteractableCommand>(
    command: CommandType,
    player: Player,
  ): InteractableCommandReturnType<CommandType> {
    // TODO: implement this based on the similar method in TicTacToeGameArea
    // I think I'll need the _stateUpdated helper method, above.
    if (command.type === 'GameMove') {
      const game = this._game;
      if (!game) {
        throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
      }
      if (this.game?.id !== command.gameID) {
        throw new InvalidParametersError(GAME_ID_MISSMATCH_MESSAGE);
      }
      if (!('board' in command.move)) {
        throw new InvalidParametersError(INVALID_COMMAND_MESSAGE);
      }
      game.applyMove({
        gameID: command.gameID,
        playerID: player.id,
        move: command.move,
      });
      this._stateUpdated(game.toModel());
      return undefined as InteractableCommandReturnType<CommandType>;
    }
    if (command.type === 'JoinGame') {
      let game = this._game;
      if (!game || game.state.status === 'OVER') {
        game = new QuantumTicTacToeGame();
        this._game = game;
      }
      game.join(player);
      this._stateUpdated(game.toModel());
      return { gameID: game.id } as InteractableCommandReturnType<CommandType>;
    }
    if (command.type === 'LeaveGame') {
      const game = this._game;
      if (!game) {
        throw new InvalidParametersError(GAME_NOT_IN_PROGRESS_MESSAGE);
      }
      if (this.game?.id !== command.gameID) {
        throw new InvalidParametersError(GAME_ID_MISSMATCH_MESSAGE);
      }
      game.leave(player);
      this._stateUpdated(game.toModel());
      return undefined as InteractableCommandReturnType<CommandType>;
    }
    throw new InvalidParametersError(INVALID_COMMAND_MESSAGE);
  }
}
