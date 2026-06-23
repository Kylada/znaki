import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import type { Zone } from '../types';
import { TokenCreator } from './tokens/TokenCreator';

interface ZoneViewerProps {
  playerId: string;
  zone: Zone;
  label: string;
  isOpponent: boolean;
}

const ZoneViewer: React.FC<ZoneViewerProps> = ({ playerId, zone, label, isOpponent }) => {
  const [open, setOpen] = useState(false);
  const { players, openContextMenu, moveCard } = useGameStore();
  const player = players[playerId];
  if (!player) return null;

  const cards = player.cards.filter(c => c.zone === zone).sort((a, b) => a.order - b.order);

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
    if (cardId) {
      moveCard(cardId, zone);
    }
  };

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      <button
        className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm flex justify-between items-center"
        onClick={() => setOpen(!open)}
      >
        <span>{label}</span>
        <span className="text-gray-500">{cards.length}</span>
      </button>
      {open && (
        <div className="p-2 bg-gray-900 flex flex-wrap gap-1 max-h-[300px] overflow-y-auto">
          {cards.length === 0 ? (
            <div className="text-gray-600 text-xs p-2">Пусто</div>
          ) : (
            cards.map(card => (
              <Card
                key={card.instanceId}
                card={{ ...card, faceDown: isOpponent && zone !== 'graveyard' && zone !== 'void' ? card.faceDown : false }}
                isOpponent={false}
                small
                draggable={!isOpponent}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openContextMenu(card.instanceId, e.clientX, e.clientY);
                }}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const SidePanel: React.FC<{ playerId: string; isOpponent: boolean }> = ({ playerId, isOpponent }) => {
  const { drawCard, shuffleDeck, inscribeSigns, returnSigns, players } = useGameStore();
  const player = players[playerId];
  if (!player) return null;

  const deckCount = player.cards.filter(c => c.zone === 'mainDeck').length;
  const signDeckCount = player.cards.filter(c => c.zone === 'signDeck').length;
  const activeCrystals = player.crystals.filter(c => !c.destroyed).length;

  return (
    <div className="space-y-1 text-xs">
      {/* Deck actions */}
      {!isOpponent && (
        <div className="space-y-1">
          <div className="flex gap-1">
            <button
              className="flex-1 bg-blue-700 hover:bg-blue-600 text-white py-1.5 rounded text-xs"
              onClick={() => drawCard(playerId)}
            >
              📤 Взять ({deckCount})
            </button>
            <button
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-1.5 rounded text-xs"
              onClick={() => shuffleDeck(playerId, false)}
            >
              🔀 Перемешать
            </button>
          </div>
          <div className="flex gap-1">
            <button
              className="flex-1 bg-indigo-700 hover:bg-indigo-600 text-white py-1.5 rounded text-xs"
              onClick={() => inscribeSigns(playerId, activeCrystals)}
            >
              ✦ Начертать ({signDeckCount})
            </button>
            <button
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-1.5 rounded text-xs"
              onClick={() => returnSigns(playerId)}
            >
              ↩ Вернуть знаки
            </button>
          </div>
        </div>
      )}

      {/* Zone viewers */}
      <ZoneViewer playerId={playerId} zone="mainDeck" label={`📚 Колода (${deckCount})`} isOpponent={isOpponent} />
      <ZoneViewer playerId={playerId} zone="signDeck" label={`✦ Колода Знаков (${signDeckCount})`} isOpponent={isOpponent} />
      <ZoneViewer playerId={playerId} zone="graveyard" label="⚰️ Кладбище" isOpponent={isOpponent} />
      <ZoneViewer playerId={playerId} zone="void" label="🕳️ Пустота" isOpponent={isOpponent} />

      {/* Token creator */}
      {!isOpponent && <TokenCreator playerId={playerId} />}
    </div>
  );
};
