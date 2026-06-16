import React from 'react';
import type { CardInstance } from '../types';
import { useGameStore } from '../store/gameStore';

interface CardProps {
  card: CardInstance;
  small?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  draggable?: boolean;
  isOpponent?: boolean;
}

export const Card: React.FC<CardProps> = ({ card, small, onClick, onContextMenu, draggable, isOpponent }) => {
  const { selectedCardId, selectCard, hoverCard } = useGameStore();
  const isSelected = selectedCardId === card.instanceId;
  const isDefense = card.position === 'defense';

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('cardInstanceId', card.instanceId);
    e.dataTransfer.setData('fromZone', card.zone);
  };

  const handleClick = (e: React.MouseEvent) => {
    selectCard(isSelected ? null : card.instanceId);
    if (onClick) onClick(e);
  };

  const baseW = small ? 56 : 90;  // px
  const baseH = small ? 80 : 130; // px

  const wrapperStyle: React.CSSProperties = {
    width: baseW,
    height: baseH,
    transform: isDefense ? 'rotate(90deg)' : undefined,
    transformOrigin: 'center center',
    flexShrink: 0,
  };

  const selectionClass = isSelected ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/40' : '';
  const exhaustedClass = card.exhausted ? 'opacity-50 grayscale' : '';

  // Face down card
  if (card.faceDown) {
    const showName = !isOpponent; // Show name hint to owner only
    return (
      <div
        className={`relative rounded-lg cursor-pointer select-none flex flex-col items-center justify-center overflow-hidden ${selectionClass}`}
        style={{
          ...wrapperStyle,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          border: '1px solid #333',
        }}
        onClick={handleClick}
        onContextMenu={onContextMenu}
        draggable={draggable}
        onDragStart={handleDragStart}
        onMouseEnter={() => hoverCard(card.instanceId)}
        onMouseLeave={() => hoverCard(null)}
      >
        <div className="text-2xl opacity-30">🂠</div>
        {showName && <div className="text-[7px] text-gray-400 mt-1 text-center px-1 truncate w-full">{card.template.name}</div>}
        {card.isToken && <div className="absolute top-0 right-0 bg-purple-500 text-white text-[8px] px-1 rounded-bl">T</div>}
      </div>
    );
  }

  const hasImage = !!card.template.imageUrl;
  const countersArr = Object.entries(card.counters);

  // Card WITH image: render the image as the entire card (since images already have borders)
  if (hasImage) {
    return (
      <div
        className={`relative cursor-pointer select-none overflow-hidden rounded-md ${selectionClass} ${exhaustedClass}`}
        style={wrapperStyle}
        onClick={handleClick}
        onContextMenu={onContextMenu}
        draggable={draggable}
        onDragStart={handleDragStart}
        onMouseEnter={() => hoverCard(card.instanceId)}
        onMouseLeave={() => hoverCard(null)}
      >
        <img
          src={card.template.imageUrl}
          alt={card.template.name}
          className="w-full h-full object-cover"
          loading="lazy"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // If image fails, hide it and fall through to the non-image render
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />

        {/* Overlay indicators */}
        {/* Stat modifications */}
        {card.template.type === 'monster' && (card.currentAttack !== card.template.attack || card.currentHealth !== card.template.health) && (
          <div className="absolute bottom-0 left-0 right-0 bg-black/70 flex justify-between px-1 py-0.5">
            <span className={`font-bold ${small ? 'text-[8px]' : 'text-[10px]'} ${(card.currentAttack ?? 0) > (card.template.attack ?? 0) ? 'text-green-400' : (card.currentAttack ?? 0) < (card.template.attack ?? 0) ? 'text-red-400' : 'text-white'}`}>
              ⚔{card.currentAttack ?? card.template.attack ?? 0}
            </span>
            <span className={`font-bold ${small ? 'text-[8px]' : 'text-[10px]'} ${(card.currentHealth ?? 0) > (card.template.health ?? 0) ? 'text-green-400' : (card.currentHealth ?? 0) < (card.template.health ?? 0) ? 'text-red-400' : 'text-white'}`}>
              ♥{card.currentHealth ?? card.template.health ?? 0}
            </span>
          </div>
        )}

        {card.template.type === 'artifact' && card.currentHealth !== card.template.health && (
          <div className="absolute bottom-0 right-0 bg-black/70 px-1 py-0.5 rounded-tl">
            <span className={`font-bold ${small ? 'text-[8px]' : 'text-[10px]'} ${(card.currentHealth ?? 0) < (card.template.health ?? 0) ? 'text-red-400' : 'text-green-400'}`}>
              ♥{card.currentHealth ?? card.template.health ?? 0}
            </span>
          </div>
        )}

        {/* Counters */}
        {countersArr.length > 0 && (
          <div className="absolute top-0 left-0 flex flex-wrap gap-0.5 p-0.5 pointer-events-none">
            {countersArr.map(([name, count]) => (
              <span key={name} className="bg-blue-600/90 text-white text-[7px] px-1 rounded-full font-bold shadow">
                {name}: {count}
              </span>
            ))}
          </div>
        )}

        {/* Token indicator */}
        {card.isToken && (
          <div className="absolute top-0 right-0 bg-purple-500/90 text-white text-[7px] px-1 rounded-bl font-bold">T</div>
        )}

        {/* Attacked/defended indicator */}
        {card.attackedThisTurn && (
          <div className="absolute top-0 left-0 bg-red-600/90 text-white text-[6px] px-1 rounded-br font-bold">ATK</div>
        )}
        {card.defendedThisTurn && (
          <div className="absolute top-0 left-0 bg-blue-600/90 text-white text-[6px] px-1 rounded-br font-bold">DEF</div>
        )}

        {/* Control change indicator */}
        {card.ownerId !== card.controllerId && (
          <div className="absolute bottom-0 right-0 bg-yellow-500/90 text-black text-[7px] px-1 rounded-tl font-bold">⇄</div>
        )}
      </div>
    );
  }

  // Card WITHOUT image: render with generated layout
  const elementColors: Record<string, string> = {
    'Свет': '#FFD700', 'Тьма': '#6A0DAD', 'Хаос': '#DC143C',
    'Порядок': '#1E90FF', 'Жизнь': '#228B22', 'Смерть': '#2F4F4F', 'Нет': '#808080',
  };
  const elementIcons: Record<string, string> = {
    'Свет': '☀️', 'Тьма': '🌑', 'Хаос': '🔥',
    'Порядок': '❄️', 'Жизнь': '🌿', 'Смерть': '💀', 'Нет': '⬡',
  };

  const elem = card.template.element || 'Нет';
  const borderColor = elementColors[elem] || '#808080';

  return (
    <div
      className={`relative rounded-lg border-2 cursor-pointer select-none overflow-hidden flex flex-col ${selectionClass} ${exhaustedClass}`}
      style={{
        ...wrapperStyle,
        borderColor,
        background: '#1c1c1c',
      }}
      onClick={handleClick}
      onContextMenu={onContextMenu}
      draggable={draggable}
      onDragStart={handleDragStart}
      onMouseEnter={() => hoverCard(card.instanceId)}
      onMouseLeave={() => hoverCard(null)}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-1" style={{ background: borderColor, minHeight: small ? 12 : 16 }}>
        <span className={`font-bold text-black ${small ? 'text-[8px]' : 'text-[10px]'}`}>{card.template.cost}</span>
        <span className={small ? 'text-[8px]' : 'text-[10px]'}>{elementIcons[elem]}</span>
      </div>

      {/* Icon placeholder */}
      <div className={`bg-gray-800 flex items-center justify-center text-gray-500 ${small ? 'h-7 text-sm' : 'h-[45px] text-xl'}`}>
        {card.template.type === 'monster' ? '🐉' : card.template.type === 'spell' ? '✨' : card.template.type === 'artifact' ? '🏛️' : '🔮'}
      </div>

      {/* Name */}
      <div className={`px-1 text-white font-semibold truncate ${small ? 'text-[6px]' : 'text-[8px]'}`}>
        {card.template.name}
      </div>

      {/* Subtype */}
      {card.template.subtype && !small && (
        <div className="px-1 text-gray-400 text-[7px] truncate -mt-0.5">{card.template.subtype}</div>
      )}

      {/* Effect text */}
      {!small && card.template.effectText && (
        <div className="px-1 text-gray-300 text-[6px] leading-tight overflow-hidden flex-grow" style={{ maxHeight: 22 }}>
          {card.template.effectText}
        </div>
      )}

      {/* Bottom stats */}
      {(card.template.type === 'monster' || card.template.type === 'artifact') && (
        <div className="flex justify-between items-center px-1 mt-auto" style={{ background: 'rgba(0,0,0,0.5)', minHeight: small ? 12 : 16 }}>
          {card.template.type === 'monster' && (
            <span className={`text-red-400 font-bold ${small ? 'text-[8px]' : 'text-[10px]'}`}>
              ⚔{card.currentAttack ?? card.template.attack ?? 0}
            </span>
          )}
          <span className={`text-green-400 font-bold ${small ? 'text-[8px]' : 'text-[10px]'} ${card.template.type === 'artifact' ? 'ml-auto' : ''}`}>
            ♥{card.currentHealth ?? card.template.health ?? 0}
          </span>
        </div>
      )}

      {/* Counters */}
      {countersArr.length > 0 && (
        <div className="absolute top-4 left-0 flex flex-wrap gap-0.5 p-0.5 pointer-events-none">
          {countersArr.map(([name, count]) => (
            <span key={name} className="bg-blue-600/90 text-white text-[7px] px-1 rounded-full">
              {name}: {count}
            </span>
          ))}
        </div>
      )}

      {card.isToken && <div className="absolute top-3 right-0 bg-purple-500 text-white text-[7px] px-1 rounded-l font-bold">T</div>}
      {card.attackedThisTurn && <div className="absolute top-0 left-0 bg-red-600 text-white text-[6px] px-0.5 rounded-br">ATK</div>}
      {card.defendedThisTurn && <div className="absolute top-0 left-0 bg-blue-600 text-white text-[6px] px-0.5 rounded-br">DEF</div>}
      {card.ownerId !== card.controllerId && <div className="absolute bottom-0 right-0 bg-yellow-600 text-black text-[6px] px-0.5 rounded-tl font-bold">⇄</div>}
    </div>
  );
};
