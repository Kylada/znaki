import React from 'react';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import type { Zone } from '../types';

interface PlayerFieldProps {
  playerId: string;
  isOpponent: boolean;
}

const ZoneSlot: React.FC<{
  zone: Zone;
  playerId: string;
  label: string;
  isOpponent: boolean;
  onDropCard?: (cardId: string, fromZone: string) => void;
}> = ({ zone, playerId, label, isOpponent, onDropCard }) => {
  const { players, openContextMenu } = useGameStore();
  const player = players[playerId];
  if (!player) return null;

  const cards = player.cards
    .filter(c => c.zone === zone)
    .sort((a, b) => a.order - b.order);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('ring-2', 'ring-cyan-500/50');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('ring-2', 'ring-cyan-500/50');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('ring-2', 'ring-cyan-500/50');
    const cardId = e.dataTransfer.getData('cardInstanceId');
    const fromZone = e.dataTransfer.getData('fromZone');
    if (cardId && onDropCard) {
      onDropCard(cardId, fromZone);
    }
  };

  // Check if any cards are in defense position for extra padding
  const hasDefense = zone === 'monsterZone' && cards.some(c => c.position === 'defense');

  return (
    <div
      className="border border-gray-700/50 rounded-lg p-1.5 transition-colors"
      style={{ minHeight: hasDefense ? 160 : 145 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="text-[9px] text-gray-500 mb-1 text-center uppercase tracking-wider">{label} ({cards.length}/6)</div>
      <div className="flex flex-wrap gap-3 justify-center items-center" style={{ minHeight: hasDefense ? 135 : 130 }}>
        {cards.map(card => (
          <div
            key={card.instanceId}
            className={card.position === 'defense' ? 'mx-3 my-2' : ''}
          >
            <Card
              card={card}
              isOpponent={isOpponent}
              draggable={!isOpponent}
              onContextMenu={(e) => {
                e.preventDefault();
                openContextMenu(card.instanceId, e.clientX, e.clientY);
              }}
            />
          </div>
        ))}
        {cards.length === 0 && (
          <div className="w-[90px] h-[130px] border border-dashed border-gray-700/50 rounded-lg flex items-center justify-center text-gray-700 text-xs">
            Пусто
          </div>
        )}
      </div>
    </div>
  );
};

export const PlayerField: React.FC<PlayerFieldProps> = ({ playerId, isOpponent }) => {
  const { moveCard, players } = useGameStore();
  const player = players[playerId];

  if (!player) return null;

  const handleDropToZone = (zone: Zone) => (cardId: string, _fromZone: string) => {
    const faceDown = zone === 'mainDeck' || zone === 'signDeck';
    moveCard(cardId, zone, faceDown);
  };

  if (isOpponent) {
    return (
      <div className="space-y-1 flex flex-col-reverse">
        <ZoneSlot zone="signZone" playerId={playerId} label="Знаки" isOpponent={isOpponent} />
        <ZoneSlot zone="spellArtifactZone" playerId={playerId} label="Заклятья / Артефакты" isOpponent={isOpponent} />
        <ZoneSlot zone="monsterZone" playerId={playerId} label="Монстры" isOpponent={isOpponent} />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <ZoneSlot
        zone="monsterZone" playerId={playerId} label="Монстры" isOpponent={isOpponent}
        onDropCard={handleDropToZone('monsterZone')}
      />
      <ZoneSlot
        zone="spellArtifactZone" playerId={playerId} label="Заклятья / Артефакты" isOpponent={isOpponent}
        onDropCard={handleDropToZone('spellArtifactZone')}
      />
      <ZoneSlot
        zone="signZone" playerId={playerId} label="Знаки" isOpponent={isOpponent}
        onDropCard={handleDropToZone('signZone')}
      />
    </div>
  );
};
