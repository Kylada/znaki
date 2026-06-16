import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';

interface HandProps {
  playerId: string;
  isOpponent: boolean;
}

export const Hand: React.FC<HandProps> = ({ playerId, isOpponent }) => {
  const { players, openContextMenu, moveCard } = useGameStore();
  const player = players[playerId];
  if (!player) return null;

  const handCards = player.cards
    .filter(c => c.zone === 'hand')
    .sort((a, b) => a.order - b.order);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isOpponent) {
      e.currentTarget.classList.add('ring-2', 'ring-cyan-500/30');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('ring-2', 'ring-cyan-500/30');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('ring-2', 'ring-cyan-500/30');
    if (!isOpponent) {
      const cardId = e.dataTransfer.getData('cardInstanceId');
      if (cardId) {
        moveCard(cardId, 'hand', false);
      }
    }
  };

  return (
    <div
      className="flex items-center gap-1 flex-wrap justify-center py-1 px-2 min-h-[40px] transition-all"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isOpponent ? (
        <>
          <span className="text-gray-500 text-xs mr-1">Рука: {handCards.length}</span>
          {handCards.map(card => (
            <div key={card.instanceId} className="w-10 h-14 bg-gradient-to-br from-gray-800 to-gray-900 rounded border border-gray-600 flex items-center justify-center text-lg opacity-70">
              🂠
            </div>
          ))}
        </>
      ) : (
        handCards.map(card => (
          <Card
            key={card.instanceId}
            card={card}
            draggable
            onContextMenu={(e) => {
              e.preventDefault();
              openContextMenu(card.instanceId, e.clientX, e.clientY);
            }}
          />
        ))
      )}
      {handCards.length === 0 && !isOpponent && (
        <div className="text-gray-600 text-sm italic">Рука пуста — перетащите карту сюда или возьмите из колоды</div>
      )}
    </div>
  );
};
