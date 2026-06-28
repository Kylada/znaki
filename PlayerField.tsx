import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import type { Zone } from '../types';

interface PlayerFieldProps {
  playerId: string;
  isOpponent: boolean;
}

/** Modal asking whether to place a dragged card above or below a target card */
const StackDialog: React.FC<{
  movingCardName: string;
  targetCardName: string;
  onAbove: () => void;
  onBelow: () => void;
  onCancel: () => void;
}> = ({ movingCardName, targetCardName, onAbove, onBelow, onCancel }) => (
  <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
    <div className="bg-gray-900 border border-gray-600 rounded-xl p-5 max-w-xs w-full space-y-4 shadow-2xl">
      <div className="text-sm text-gray-200 text-center">
        Поместить <span className="text-yellow-300 font-bold">«{movingCardName}»</span> над или под{' '}
        <span className="text-yellow-300 font-bold">«{targetCardName}»</span>?
      </div>
      <div className="flex flex-col gap-2">
        <button
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-bold"
          onClick={onAbove}
        >
          Над картой
        </button>
        <button
          className="w-full bg-purple-700 hover:bg-purple-600 text-white py-2 rounded-lg text-sm font-bold"
          onClick={onBelow}
        >
          Под картой
        </button>
        <button
          className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm"
          onClick={onCancel}
        >
          Отмена
        </button>
      </div>
    </div>
  </div>
);

/** A single card on the field, with its stacked-under cards shown as a pile */
const FieldCardStack: React.FC<{
  topCardId: string;
  isOpponent: boolean;
  onCardClick: (cardId: string) => void;
  onDragOverCard: (e: React.DragEvent, cardId: string) => void;
  onDragLeaveCard: (e: React.DragEvent) => void;
  onDropOnCard: (e: React.DragEvent, cardId: string) => void;
  combatAttackerId: string | null;
  combatTargetIds: string[];
  combatDefenderIds: string[];
}> = ({ topCardId, isOpponent, onCardClick, onDragOverCard, onDragLeaveCard, onDropOnCard, combatAttackerId, combatTargetIds, combatDefenderIds }) => {
  const players = useGameStore(s => s.players);

  // Find the top card across all players
  let topCard = null;
  for (const p of Object.values(players)) {
    const c = p.cards.find(c => c.instanceId === topCardId);
    if (c) { topCard = c; break; }
  }
  if (!topCard) return null;

  // Find cards stacked directly under this one (across all players)
  const stackedCards: typeof topCard[] = [];
  for (const p of Object.values(players)) {
    for (const c of p.cards) {
      if (c.fieldStackedUnder === topCardId) stackedCards.push(c);
    }
  }

  const isAttacker = combatAttackerId === topCard.instanceId;
  const isTarget = combatTargetIds.includes(topCard.instanceId);
  const isDefender = combatDefenderIds.includes(topCard.instanceId);

  return (
    <div
      className="relative"
      style={{ marginBottom: stackedCards.length > 0 ? stackedCards.length * 6 + 'px' : undefined }}
    >
      {/* Stacked cards peeking below */}
      {stackedCards.map((sc, i) => (
        <div
          key={sc.instanceId}
          className="absolute left-0 right-0"
          style={{ top: (i + 1) * 8, zIndex: stackedCards.length - i }}
          title={sc.template.name}
        >
          {/* Tiny peek showing the stacked card */}
          <div
            className="w-full rounded border border-gray-600 bg-gray-800/80 text-center text-[8px] text-gray-400 py-0.5 px-1 truncate cursor-pointer"
            onClick={() => useGameStore.getState().openContextMenu(sc.instanceId, 0, 0)}
            onContextMenu={(e) => { e.preventDefault(); useGameStore.getState().openContextMenu(sc.instanceId, e.clientX, e.clientY); }}
          >
            {sc.template.name || '???'}
          </div>
        </div>
      ))}

      {/* Top card — rendered on top */}
      <div
        className={`relative z-10 transition-all ${topCard.position === 'defense' ? 'mx-3 my-2' : ''}
          ${isAttacker ? 'ring-4 ring-red-500 scale-105' : ''}
          ${isTarget ? 'ring-4 ring-yellow-500 scale-105' : ''}
          ${isDefender ? 'ring-4 ring-blue-500 scale-105' : ''}
        `}
        onDragOver={(e) => onDragOverCard(e, topCard!.instanceId)}
        onDragLeave={onDragLeaveCard}
        onDrop={(e) => onDropOnCard(e, topCard!.instanceId)}
      >
        <Card
          card={topCard}
          isOpponent={isOpponent}
          draggable={!isOpponent}
          onClick={() => onCardClick(topCard!.instanceId)}
          onContextMenu={(e) => {
            e.preventDefault();
            useGameStore.getState().openContextMenu(topCard!.instanceId, e.clientX, e.clientY);
          }}
        />
        {stackedCards.length > 0 && (
          <div className="absolute -bottom-1 -right-1 bg-gray-700 border border-gray-500 text-white text-[9px] px-1.5 rounded-full font-bold z-20">
            +{stackedCards.length}
          </div>
        )}
        {isAttacker && <div className="absolute -top-2 -left-2 bg-red-600 text-white text-[10px] px-1 rounded font-bold z-20">⚔️</div>}
        {isTarget && <div className="absolute -top-2 -right-2 bg-yellow-600 text-white text-[10px] px-1 rounded font-bold z-20">🎯</div>}
        {isDefender && <div className="absolute -top-2 -left-2 bg-blue-600 text-white text-[10px] px-1 rounded font-bold z-20">🛡</div>}
      </div>
    </div>
  );
};

const ZoneSlot: React.FC<{
  zone: Zone;
  playerId: string;
  label: string;
  isOpponent: boolean;
  onDropCard?: (cardId: string, fromZone: string) => void;
}> = ({ zone, playerId, label, isOpponent, onDropCard }) => {
  const players = useGameStore(s => s.players);
  const combatState = useGameStore(s => s.combatState);

  // Stack dialog state
  const [stackDialog, setStackDialog] = useState<{
    movingCardId: string;
    movingCardName: string;
    targetCardId: string;
    targetCardName: string;
  } | null>(null);

  const player = players[playerId];
  if (!player) return null;

  // Only show TOP-LEVEL cards (no fieldStackedUnder) in this zone
  const topCards = player.cards
    .filter(c => c.zone === zone && !c.fieldStackedUnder)
    .sort((a, b) => a.order - b.order);

  // Also collect top cards from opponent for zones that have cross-player stacks
  const allZoneTopCards = (() => {
    const result = [...topCards];
    for (const [pid, p] of Object.entries(players)) {
      if (pid === playerId) continue;
      for (const c of p.cards) {
        if (c.zone === zone && !c.fieldStackedUnder) result.push(c);
      }
    }
    return result;
  })();

  const FIELD_ZONES: Zone[] = ['monsterZone', 'spellArtifactZone', 'signZone'];
  const isFieldZone = FIELD_ZONES.includes(zone);

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

  const handleDragOverCard = (e: React.DragEvent, targetCardId: string) => {
    if (!isFieldZone) return;
    e.preventDefault();
    e.stopPropagation(); // Don't bubble to zone
    (e.currentTarget as HTMLElement).classList.add('ring-2', 'ring-orange-400');
  };

  const handleDragLeaveCard = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove('ring-2', 'ring-orange-400');
  };

  const handleDropOnCard = (e: React.DragEvent, targetCardId: string) => {
    if (!isFieldZone) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).classList.remove('ring-2', 'ring-orange-400');

    const movingCardId = e.dataTransfer.getData('cardInstanceId');
    if (!movingCardId || movingCardId === targetCardId) return;

    // Find card names for the dialog
    let movingCardName = movingCardId;
    let targetCardName = targetCardId;
    for (const p of Object.values(players)) {
      for (const c of p.cards) {
        if (c.instanceId === movingCardId) movingCardName = c.template.name || movingCardId;
        if (c.instanceId === targetCardId) targetCardName = c.template.name || targetCardId;
      }
    }

    setStackDialog({ movingCardId, movingCardName, targetCardId, targetCardName });
  };

  const handleCardClick = (cardId: string) => {
    const store = useGameStore.getState();
    const cs = store.combatState;
    if (cs.mode === 'attacking') {
      if (!cs.attackerId) {
        store.setCombatAttacker(cardId);
      } else if (cs.attackerId !== cardId) {
        if (cs.targetIds.includes(cardId)) {
          store.removeCombatTarget(cardId);
        } else {
          store.addCombatTarget(cardId);
        }
      }
    } else if (cs.mode === 'defending') {
      if (cs.defenderIds.includes(cardId)) {
        store.removeCombatDefender(cardId);
      } else {
        store.addCombatDefender(cardId);
      }
    }
  };

  const hasDefense = zone === 'monsterZone' && topCards.some(c => c.position === 'defense');

  return (
    <>
      {stackDialog && (
        <StackDialog
          movingCardName={stackDialog.movingCardName}
          targetCardName={stackDialog.targetCardName}
          onAbove={() => {
            useGameStore.getState().stackCardOnCard(stackDialog.movingCardId, stackDialog.targetCardId, 'above');
            setStackDialog(null);
          }}
          onBelow={() => {
            useGameStore.getState().stackCardOnCard(stackDialog.movingCardId, stackDialog.targetCardId, 'below');
            setStackDialog(null);
          }}
          onCancel={() => setStackDialog(null)}
        />
      )}

      <div
        className="border border-gray-700/50 rounded-lg p-1.5 transition-colors"
        style={{ minHeight: hasDefense ? 160 : 145 }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-[9px] text-gray-500 mb-1 text-center uppercase tracking-wider">
          {label} ({topCards.length}/6)
        </div>
        <div className="flex flex-wrap gap-3 justify-center items-start" style={{ minHeight: hasDefense ? 135 : 130 }}>
          {allZoneTopCards.map(card => (
            <FieldCardStack
              key={card.instanceId}
              topCardId={card.instanceId}
              isOpponent={isOpponent}
              onCardClick={handleCardClick}
              onDragOverCard={handleDragOverCard}
              onDragLeaveCard={handleDragLeaveCard}
              onDropOnCard={handleDropOnCard}
              combatAttackerId={combatState.attackerId}
              combatTargetIds={combatState.targetIds}
              combatDefenderIds={combatState.defenderIds}
            />
          ))}
          {allZoneTopCards.length === 0 && (
            <div className="w-[90px] h-[130px] border border-dashed border-gray-700/50 rounded-lg flex items-center justify-center text-gray-700 text-xs">
              Пусто
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export const PlayerField: React.FC<PlayerFieldProps> = ({ playerId, isOpponent }) => {
  const moveCard = useGameStore(s => s.moveCard);
  const players = useGameStore(s => s.players);
  const player = players[playerId];

  if (!player) return null;

  const handleDropToZone = (zone: Zone) => (cardId: string, _fromZone: string) => {
    const faceDown = zone === 'mainDeck' || zone === 'signDeck';
    moveCard(cardId, zone, faceDown);
  };

  if (isOpponent) {
    return (
      <div className="space-y-1">
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
