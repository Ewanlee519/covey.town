import { Box, Container, Heading, SimpleGrid } from '@chakra-ui/react';
import React, { useEffect, useState } from 'react';
import { GameArea, TicTacToeGameState } from '../../../../types/CoveyTownSocket';
import TicTacToeAreaController, {
  TicTacToeCell,
} from '../../../../classes/interactable/TicTacToeAreaController';
import TownController from '../../../../classes/TownController';
import QuantumTicTacToeAreaController from '../../../../classes/interactable/QuantumTicTacToeAreaController';
import TicTacToeBoard from '../TicTacToe/TicTacToeBoard';

export type QuantumTicTacToeGameProps = {
  gameAreaController: QuantumTicTacToeAreaController;
};

class QuantumBoardProxyController extends TicTacToeAreaController {
  private _quantumController: QuantumTicTacToeAreaController;

  private _boardProxy: 'A' | 'B' | 'C';

  constructor(
    quantumController: QuantumTicTacToeAreaController,
    board: 'A' | 'B' | 'C',
    townController: TownController,
  ) {
    // This is a mock model, the TicTacToeBoard will get its state from our property overrides
    const mockModel: GameArea<TicTacToeGameState> = {
      id: `proxy-${board}`,
      type: 'TicTacToeArea',
      game: {
        id: `proxy-${board}`,
        players: [],
        state: {
          status: 'IN_PROGRESS',
          moves: [],
        },
      },
      history: [],
      occupants: [],
    };
    super(`proxy-${board}`, mockModel, townController);
    this._quantumController = quantumController;
    this._boardProxy = board;
  }

  get board(): TicTacToeCell[][] {
    return this._quantumController.boards[this._boardProxy];
  }

  get isOurTurn(): boolean {
    return this._quantumController.isOurTurn;
  }

  get isPlayer(): boolean {
    return this._quantumController.isPlayer;
  }

  async makeMove(row: 0 | 1 | 2, col: 0 | 1 | 2): Promise<void> {
    return this._quantumController.makeMove(this._boardProxy, row, col);
  }
}

export default function QuantumTicTacToeBoard({
  gameAreaController,
}: QuantumTicTacToeGameProps): JSX.Element {
  const [boardProxies, setBoardProxies] = useState<QuantumBoardProxyController[]>([]);

  useEffect(() => {
    const proxies = (['A', 'B', 'C'] as const).map(
      board =>
        new QuantumBoardProxyController(
          gameAreaController,
          board,
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - we know that _townController is on the controller, but it's protected
          gameAreaController._townController,
        ),
    );
    setBoardProxies(proxies);
    const boardChanged = () => {
      proxies.forEach(p => p.emit('boardChanged', p.board));
    };
    const turnChanged = (isOurTurn: boolean) => {
      proxies.forEach(p => p.emit('turnChanged', isOurTurn));
    };
    gameAreaController.addListener('boardChanged', boardChanged);
    gameAreaController.addListener('turnChanged', turnChanged);
    return () => {
      gameAreaController.removeListener('boardChanged', boardChanged);
      gameAreaController.removeListener('turnChanged', turnChanged);
    };
  }, [gameAreaController]);

  return (
    <Container>
      <SimpleGrid columns={1} spacing={5}>
        {boardProxies.map((proxy, index) => (
          <Box key={proxy.id}>
            <Heading as='h3' size='md' textAlign='center'>
              Board {String.fromCharCode('A'.charCodeAt(0) + index)}
            </Heading>
            <TicTacToeBoard gameAreaController={proxy} />
          </Box>
        ))}
      </SimpleGrid>
    </Container>
  );
}
