import React from 'react';
import { useGameStore } from '../store/gameStore';

export const TurnControls: React.FC = () => {
  const {
    currentTurnPlayerId, phase, turnNumber, players,
    setPhase, nextTurn, localPlayerId
  } = useGameStore();

  const currentPlayerName = players[currentTurnPlayerId]?.name || '?';
  const isMyTurn = currentTurnPlayerId === localPlayerId;

  const phaseLabels = {
    start: '🌅 Начало Хода',
    action: '⚔️ Фаза Действий',
    end: '🌙 Конец Хода',
  };

  return (
    <div className="bg-gray-900/90 border border-gray-700 rounded-lg px-3 py-2 flex items-center gap-3 flex-wrap">
      {/* Turn info */}
      <div className="text-xs">
        <span className="text-gray-500">Ход</span>{' '}
        <span className="text-yellow-400 font-bold">{turnNumber}</span>
      </div>

      <div className="text-xs">
        <span className="text-gray-500">Ходит:</span>{' '}
        <span className={`font-bold ${isMyTurn ? 'text-green-400' : 'text-red-400'}`}>
          {currentPlayerName}
        </span>
      </div>

      {/* Phase indicator */}
      <div className="flex gap-1">
        {(['start', 'action', 'end'] as const).map(p => (
          <button
            key={p}
            className={`px-2 py-1 rounded text-xs font-bold transition-colors ${
              phase === p
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
            }`}
            onClick={() => setPhase(p)}
          >
            {phaseLabels[p]}
          </button>
        ))}
      </div>

      {/* Next turn */}
      <button
        className="bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-bold ml-auto"
        onClick={nextTurn}
      >
        ⏭ Следующий ход
      </button>
    </div>
  );
};
