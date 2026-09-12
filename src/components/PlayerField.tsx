import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import type { CardInstance, Zone } from '../types';

interface PlayerFieldProps {
  playerId: string;
  isOpponent: boolean;
}

type StackDropPosition = 'above' | 'below';

const HOTSPOT_TOP_RATIO = 0.25;
const HOTSPOT_BOTTOM_RATIO = 0.75;
const STACK_OFFSET_X = 14;
const STACK_OFFSET_Y = 14;
const MAX_VISIBLE_PEEKS = 5;

const hasCardPayload = (e: React.DragEvent) =>
  Array.from(e.dataTransfer.types).includes('application/x-znaki-card') ||
  Array.from(e.dataTransfer.types).includes('cardInstanceId');

const getHotspotPosition = (e: React.DragEvent): StackDropPosition | null => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const offsetY = e.clientY - rect.top;

  if (offsetY <= rect.height * HOTSPOT_TOP_RATIO) return 'above';
  if (offsetY >= rect.height * HOTSPOT_BOTTOM_RATIO) return 'below';
  return null;
};

const FieldStackCard: React.FC<{
  card: CardInstance;
  isOpponent: boolean;
  activeHotspot: { cardId: string; position: StackDropPosition } | null;
  onCardClick: (cardId: string) => void;
  onCardDragOver: (e: React.DragEvent, cardId: string) => void;
  onCardDragLeave: (e: React.DragEvent, cardId: string) => void;
  onCardDrop: (e: React.DragEvent, cardId: string) => void;
}> = ({ card, isOpponent, activeHotspot, onCardClick, onCardDragOver, onCardDragLeave, onCardDrop }) => {
  const { combatState, draggingCardId, getStackedCards, openContextMenu } = useGameStore();

  const collectAttachedCards = (parentId: string): CardInstance[] => {
    const directChildren = getStackedCards(parentId);
    return directChildren.flatMap(child => [child, ...collectAttachedCards(child.instanceId)]);
  };

  const flattenedAttachedCards = collectAttachedCards(card.instanceId);

  const visiblePeeks = flattenedAttachedCards.slice(0, MAX_VISIBLE_PEEKS);
  const isAttacker = combatState.attackerId === card.instanceId;
  const isTarget = combatState.targetIds.includes(card.instanceId);
  const isDefender = combatState.defenderIds.includes(card.instanceId);
  const showHotspots = !!draggingCardId && draggingCardId !== card.instanceId;
  const topHotspotActive = activeHotspot?.cardId === card.instanceId && activeHotspot.position === 'above';
  const bottomHotspotActive = activeHotspot?.cardId === card.instanceId && activeHotspot.position === 'below';

  return (
    <div
      className="relative inline-block"
      style={{
        paddingRight: visiblePeeks.length * STACK_OFFSET_X,
        paddingBottom: visiblePeeks.length * STACK_OFFSET_Y,
      }}
    >
      {visiblePeeks.map((attachedCard, index) => (
        <div
          key={attachedCard.instanceId}
          className="absolute"
          style={{
            top: (index + 1) * STACK_OFFSET_Y,
            left: (index + 1) * STACK_OFFSET_X,
            zIndex: index + 1,
          }}
        >
          <Card
            card={attachedCard}
            isOpponent={attachedCard.controllerId !== useGameStore.getState().localPlayerId}
            draggable={false}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openContextMenu(attachedCard.instanceId, e.clientX, e.clientY);
            }}
          />
        </div>
      ))}

      <div
        className={`relative transition-all ${card.position === 'defense' ? 'mx-3 my-2' : ''}
          ${isAttacker ? 'ring-4 ring-red-500 scale-105 z-10' : ''}
          ${isTarget ? 'ring-4 ring-yellow-500 scale-105 z-10' : ''}
          ${isDefender ? 'ring-4 ring-blue-500 scale-105 z-10' : ''}`}
        style={{ zIndex: 20 }}
        onDragOver={(e) => onCardDragOver(e, card.instanceId)}
        onDragLeave={(e) => onCardDragLeave(e, card.instanceId)}
        onDrop={(e) => onCardDrop(e, card.instanceId)}
      >
        <Card
          card={card}
          isOpponent={isOpponent}
          draggable={!isOpponent}
          onClick={() => onCardClick(card.instanceId)}
          onContextMenu={(e) => {
            e.preventDefault();
            openContextMenu(card.instanceId, e.clientX, e.clientY);
          }}
        />

        {showHotspots && (
          <>
            <div
              className={`pointer-events-none absolute inset-x-0 top-0 h-1/4 rounded-t-lg border border-dashed transition-colors ${
                topHotspotActive
                  ? 'border-cyan-300 bg-cyan-400/30 shadow-[0_0_12px_rgba(34,211,238,0.45)]'
                  : 'border-cyan-400/40 bg-cyan-500/10'
              }`}
            >
              <div className="absolute inset-x-0 top-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-cyan-100/90">
                Над
              </div>
            </div>
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-0 h-1/4 rounded-b-lg border border-dashed transition-colors ${
                bottomHotspotActive
                  ? 'border-purple-300 bg-purple-400/30 shadow-[0_0_12px_rgba(192,132,252,0.45)]'
                  : 'border-purple-400/40 bg-purple-500/10'
              }`}
            >
              <div className="absolute inset-x-0 bottom-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-purple-100/90">
                Под
              </div>
            </div>
          </>
        )}

        {flattenedAttachedCards.length > 0 && (
          <div className="absolute -bottom-2 -right-2 z-30 rounded-full border border-gray-500 bg-gray-900/95 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300 shadow-lg">
            +{flattenedAttachedCards.length}
          </div>
        )}
        {isAttacker && (
          <div className="absolute -top-2 -left-2 bg-red-600 text-white text-[10px] px-1 rounded font-bold z-30">⚔️</div>
        )}
        {isTarget && (
          <div className="absolute -top-2 -right-2 bg-yellow-600 text-white text-[10px] px-1 rounded font-bold z-30">🎯</div>
        )}
        {isDefender && (
          <div className="absolute -top-2 -left-2 bg-blue-600 text-white text-[10px] px-1 rounded font-bold z-30">🛡</div>
        )}
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
  const {
    players,
    combatState,
    setCombatAttacker,
    addCombatTarget,
    removeCombatTarget,
    addCombatDefender,
    removeCombatDefender,
    stackCardOnCard,
  } = useGameStore();

  const [activeHotspot, setActiveHotspot] = useState<{ cardId: string; position: StackDropPosition } | null>(null);

  const player = players[playerId];
  if (!player) return null;

  const cards = player.cards.filter(card => card.zone === zone);
  const topLevelCards = cards
    .filter(card => !card.fieldStackedUnder)
    .sort((a, b) => a.order - b.order);

  const hasDefense = zone === 'monsterZone' && cards.some(card => card.position === 'defense');

  const handleDragOverZone = (e: React.DragEvent) => {
    if (!hasCardPayload(e) || !onDropCard) return;
    e.preventDefault();
    e.currentTarget.classList.add('ring-2', 'ring-cyan-500/50');
  };

  const handleDragLeaveZone = (e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as Node | null;
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) return;
    e.currentTarget.classList.remove('ring-2', 'ring-cyan-500/50');
    setActiveHotspot(null);
  };

  const handleDropToZone = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('ring-2', 'ring-cyan-500/50');
    setActiveHotspot(null);
    if (!onDropCard) return;

    e.preventDefault();
    const cardId = e.dataTransfer.getData('cardInstanceId');
    const fromZone = e.dataTransfer.getData('fromZone');
    if (cardId) {
      onDropCard(cardId, fromZone);
    }
  };

  const handleCardDragOver = (e: React.DragEvent, cardId: string) => {
    if (!hasCardPayload(e)) return;

    const position = getHotspotPosition(e);
    if (!position) {
      if (activeHotspot?.cardId === cardId) {
        setActiveHotspot(null);
      }
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    if (activeHotspot?.cardId !== cardId || activeHotspot.position !== position) {
      setActiveHotspot({ cardId, position });
    }
  };

  const handleCardDragLeave = (e: React.DragEvent, cardId: string) => {
    const relatedTarget = e.relatedTarget as Node | null;
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) return;
    if (activeHotspot?.cardId === cardId) {
      setActiveHotspot(null);
    }
  };

  const handleDropOnCard = (e: React.DragEvent, cardId: string) => {
    if (!hasCardPayload(e)) return;

    const position = getHotspotPosition(e);
    if (!position) {
      setActiveHotspot(null);
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    setActiveHotspot(null);

    const movingCardId = e.dataTransfer.getData('cardInstanceId');
    if (!movingCardId || movingCardId === cardId) return;
    stackCardOnCard(movingCardId, cardId, position);
  };

  const handleCardClick = (cardId: string) => {
    if (combatState.mode === 'attacking') {
      if (!combatState.attackerId) {
        setCombatAttacker(cardId);
      } else if (combatState.attackerId !== cardId) {
        if (combatState.targetIds.includes(cardId)) {
          removeCombatTarget(cardId);
        } else {
          addCombatTarget(cardId);
        }
      }
    } else if (combatState.mode === 'defending') {
      if (combatState.defenderIds.includes(cardId)) {
        removeCombatDefender(cardId);
      } else {
        addCombatDefender(cardId);
      }
    }
  };

  return (
    <div
      className="border border-gray-700/50 rounded-lg p-1.5 transition-colors"
      style={{ minHeight: hasDefense ? 160 : 145 }}
      onDragOver={handleDragOverZone}
      onDragLeave={handleDragLeaveZone}
      onDrop={handleDropToZone}
    >
      <div className="text-[9px] text-gray-500 mb-1 text-center uppercase tracking-wider">
        {label} ({cards.length}/6)
      </div>
      <div className="flex flex-wrap gap-3 justify-center items-start" style={{ minHeight: hasDefense ? 135 : 130 }}>
        {topLevelCards.map(card => (
          <FieldStackCard
            key={card.instanceId}
            card={card}
            isOpponent={isOpponent}
            activeHotspot={activeHotspot}
            onCardClick={handleCardClick}
            onCardDragOver={handleCardDragOver}
            onCardDragLeave={handleCardDragLeave}
            onCardDrop={handleDropOnCard}
          />
        ))}
        {topLevelCards.length === 0 && (
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
        zone="monsterZone"
        playerId={playerId}
        label="Монстры"
        isOpponent={isOpponent}
        onDropCard={handleDropToZone('monsterZone')}
      />
      <ZoneSlot
        zone="spellArtifactZone"
        playerId={playerId}
        label="Заклятья / Артефакты"
        isOpponent={isOpponent}
        onDropCard={handleDropToZone('spellArtifactZone')}
      />
      <ZoneSlot
        zone="signZone"
        playerId={playerId}
        label="Знаки"
        isOpponent={isOpponent}
        onDropCard={handleDropToZone('signZone')}
      />
    </div>
  );
};
