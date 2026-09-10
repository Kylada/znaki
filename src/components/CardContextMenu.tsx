import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from '../store/gameStore';
import { Card } from './Card';
import type { CardInstance, Zone } from '../types';

const StackTreeNode: React.FC<{
  card: CardInstance;
  localPlayerId: string;
  selectedCardId: string;
  getChildren: (cardId: string) => CardInstance[];
  openCardMenu: (cardId: string) => void;
  depth?: number;
}> = ({ card, localPlayerId, selectedCardId, getChildren, openCardMenu, depth = 0 }) => {
  const children = getChildren(card.instanceId);
  const isSelected = selectedCardId === card.instanceId;

  return (
    <div className="space-y-1" style={{ marginLeft: depth * 12 }}>
      <button
        type="button"
        className={`flex w-full items-center gap-2 rounded-lg border p-1 text-left transition-colors ${
          isSelected
            ? 'border-cyan-400 bg-cyan-900/30'
            : 'border-gray-800 bg-black/20 hover:border-gray-700 hover:bg-gray-800/60'
        }`}
        onClick={() => openCardMenu(card.instanceId)}
      >
        <Card
          card={card}
          small
          isOpponent={card.controllerId !== localPlayerId}
          draggable={false}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            openCardMenu(card.instanceId);
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-gray-100">{card.template.name || 'Карта'}</div>
          <div className="text-[10px] text-gray-500">
            {card.zone}
            {children.length > 0 && ` · +${children.length}`}
          </div>
        </div>
      </button>

      {children.length > 0 && (
        <div className="space-y-1">
          {children.map(child => (
            <StackTreeNode
              key={child.instanceId}
              card={child}
              localPlayerId={localPlayerId}
              selectedCardId={selectedCardId}
              getChildren={getChildren}
              openCardMenu={openCardMenu}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const CardContextMenu: React.FC = () => {
  const {
    contextMenuCardId,
    contextMenuPosition,
    closeContextMenu,
    openContextMenu,
    getCard,
    getStackedCards,
    moveCard,
    changePosition,
    flipCard,
    exhaustSign,
    restoreSign,
    activateEffect,
    addCounter,
    removeCounter,
    setCardAttack,
    setCardHealth,
    removeToken,
    setAttacked,
    setDefended,
    localPlayerId,
    giveControl,
    players,
    sealCard,
  } = useGameStore();

  const [showCounterInput, setShowCounterInput] = useState(false);
  const [counterName, setCounterName] = useState('');
  const [counterAmount, setCounterAmount] = useState(1);
  const [showStatInput, setShowStatInput] = useState<'attack' | 'health' | null>(null);
  const [statValue, setStatValue] = useState(0);
  const [showSealPicker, setShowSealPicker] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });

  if (!contextMenuCardId || !contextMenuPosition) return null;
  const card = getCard(contextMenuCardId);
  if (!card) return null;

  const opponentId = Object.keys(players).find(id => id !== localPlayerId) || '';
  const cardPlayerId = Object.keys(players).find(pid => players[pid].cards.some(c => c.instanceId === contextMenuCardId)) || '';
  const player = players[cardPlayerId];

  const zones: { label: string; zone: Zone; faceDown?: boolean }[] = [
    { label: '→ Руку', zone: 'hand' },
    { label: '→ Зону Монстров', zone: 'monsterZone' },
    { label: '→ Зону Заклятий/Артефактов', zone: 'spellArtifactZone' },
    { label: '→ Зону Знаков', zone: 'signZone' },
    { label: '→ Колоду (верх)', zone: 'mainDeck', faceDown: true },
    { label: '→ Колоду Знаков', zone: 'signDeck', faceDown: true },
    { label: '→ Кладбище', zone: 'graveyard' },
    { label: '→ Пустоту', zone: 'void' },
  ];

  const stackRoot = useMemo(() => {
    let current = card;
    while (current.fieldStackedUnder) {
      const parent = getCard(current.fieldStackedUnder);
      if (!parent) break;
      current = parent;
    }
    return current;
  }, [card, getCard, players]);

  const stackHasRelations = !!card.fieldStackedUnder || getStackedCards(card.instanceId).length > 0 || getStackedCards(stackRoot.instanceId).length > 0;

  const openCardMenu = (cardId: string) => {
    openContextMenu(cardId, contextMenuPosition.x, contextMenuPosition.y);
  };

  const handleMove = (zone: Zone, faceDown?: boolean) => {
    moveCard(contextMenuCardId, zone, faceDown);
    closeContextMenu();
  };

  const handleCounterSubmit = (add: boolean) => {
    if (counterName) {
      if (add) addCounter(contextMenuCardId, counterName, counterAmount);
      else removeCounter(contextMenuCardId, counterName, counterAmount);
    }
    setShowCounterInput(false);
    setCounterName('');
    setCounterAmount(1);
  };

  const handleStatSubmit = () => {
    if (showStatInput === 'attack') setCardAttack(contextMenuCardId, statValue);
    if (showStatInput === 'health') setCardHealth(contextMenuCardId, statValue);
    setShowStatInput(null);
  };

  const handleSeal = (crystalIndex: number) => {
    sealCard(contextMenuCardId, crystalIndex, cardPlayerId);
    setShowSealPicker(false);
    closeContextMenu();
  };

  useLayoutEffect(() => {
    const updatePosition = () => {
      if (!menuRef.current) return;

      const handBoundaryTop = document.querySelector('[data-menu-lower-bound="true"]')?.getBoundingClientRect().top ?? window.innerHeight - 10;
      const menuWidth = menuRef.current.offsetWidth || 250;
      const naturalMenuHeight = menuRef.current.offsetHeight || 400;
      const maxHeight = Math.max(140, handBoundaryTop - 20);
      const effectiveMenuHeight = Math.min(naturalMenuHeight, maxHeight);
      const maxLeft = window.innerWidth - menuWidth - 10;
      const maxTopFromHand = handBoundaryTop - effectiveMenuHeight - 8;
      const maxTopFromViewport = window.innerHeight - effectiveMenuHeight - 10;

      setMenuStyle({
        left: Math.max(10, Math.min(contextMenuPosition.x, maxLeft)),
        top: Math.max(10, Math.min(contextMenuPosition.y, maxTopFromHand, maxTopFromViewport)),
        maxHeight,
        visibility: 'visible',
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [
    contextMenuPosition.x,
    contextMenuPosition.y,
    contextMenuCardId,
    showCounterInput,
    counterName,
    counterAmount,
    showStatInput,
    statValue,
    showSealPicker,
    stackHasRelations,
    players,
  ]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={closeContextMenu} />
      <div
        ref={menuRef}
        className="fixed z-[9999] bg-gray-900 border-2 border-gray-600 rounded-lg shadow-2xl py-1 min-w-[260px] overflow-y-auto overscroll-contain text-sm scrollbar-thin scrollbar-thumb-gray-600"
        style={menuStyle}
      >
        <div className="px-3 py-1.5 text-yellow-400 font-bold border-b border-gray-700 text-xs truncate">
          {card.template.name || 'Карта'} {card.isToken && '(Токен)'}
        </div>

        <button
          className="w-full text-left px-3 py-1.5 hover:bg-purple-700 text-purple-300 flex items-center gap-2"
          onClick={() => { activateEffect(contextMenuCardId); closeContextMenu(); }}
        >
          ⚡ Активировать эффект
        </button>

        <button
          className="w-full text-left px-3 py-1.5 hover:bg-gray-700 text-gray-200"
          onClick={() => { flipCard(contextMenuCardId); closeContextMenu(); }}
        >
          🔄 Перевернуть
        </button>

        {stackHasRelations && (
          <>
            <div className="border-t border-gray-700 my-1" />
            <div className="px-3 py-1 text-[10px] text-gray-500 font-semibold uppercase">Стек</div>
            <div className="px-2 py-1 space-y-1">
              <StackTreeNode
                card={stackRoot}
                localPlayerId={localPlayerId}
                selectedCardId={contextMenuCardId}
                getChildren={getStackedCards}
                openCardMenu={openCardMenu}
              />
            </div>
          </>
        )}

        {card.template.type === 'monster' && (card.zone === 'monsterZone' || card.zone === 'hand') && (
          <>
            <button
              className={`w-full text-left px-3 py-1.5 hover:bg-gray-700 ${card.position === 'attack' ? 'text-yellow-400' : 'text-gray-200'}`}
              onClick={() => { changePosition(contextMenuCardId, 'attack'); closeContextMenu(); }}
            >
              ⚔️ Атакующая позиция {card.position === 'attack' && '✓'}
            </button>
            <button
              className={`w-full text-left px-3 py-1.5 hover:bg-gray-700 ${card.position === 'defense' ? 'text-yellow-400' : 'text-gray-200'}`}
              onClick={() => { changePosition(contextMenuCardId, 'defense'); closeContextMenu(); }}
            >
              🛡️ Защитная позиция {card.position === 'defense' && '✓'}
            </button>
          </>
        )}

        {card.zone === 'signZone' && (
          card.exhausted ? (
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-gray-700 text-green-300"
              onClick={() => { restoreSign(contextMenuCardId); closeContextMenu(); }}
            >
              🔆 Восстановить Знак
            </button>
          ) : (
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-gray-700 text-orange-300"
              onClick={() => { exhaustSign(contextMenuCardId); closeContextMenu(); }}
            >
              ⤵️ Истощить Знак
            </button>
          )
        )}

        {card.template.type === 'monster' && card.zone === 'monsterZone' && (
          <>
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-gray-700 text-red-300"
              onClick={() => { setAttacked(contextMenuCardId, !card.attackedThisTurn); closeContextMenu(); }}
            >
              {card.attackedThisTurn ? '✕ Снять метку атаки' : '⚔ Отметить атаку'}
            </button>
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-gray-700 text-blue-300"
              onClick={() => { setDefended(contextMenuCardId, !card.defendedThisTurn); closeContextMenu(); }}
            >
              {card.defendedThisTurn ? '✕ Снять метку защиты' : '🛡 Отметить защиту'}
            </button>
          </>
        )}

        <div className="border-t border-gray-700 my-1" />

        {(card.template.type === 'monster' || card.template.type === 'artifact') && (
          <>
            {card.template.type === 'monster' && (
              <button
                className="w-full text-left px-3 py-1.5 hover:bg-gray-700 text-red-300"
                onClick={() => { setShowStatInput('attack'); setStatValue(card.currentAttack ?? card.template.attack ?? 0); }}
              >
                ⚔ Изменить атаку ({card.currentAttack ?? card.template.attack ?? 0})
              </button>
            )}
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-gray-700 text-green-300"
              onClick={() => { setShowStatInput('health'); setStatValue(card.currentHealth ?? card.template.health ?? 0); }}
            >
              ♥ Изменить здоровье ({card.currentHealth ?? card.template.health ?? 0})
            </button>
          </>
        )}

        {showStatInput && (
          <div className="px-3 py-2 flex gap-1 items-center">
            <input
              type="number"
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1 w-16 text-white text-xs"
              value={statValue}
              onChange={(e) => setStatValue(Number(e.target.value))}
              autoFocus
            />
            <button className="bg-green-600 text-white px-2 py-1 rounded text-xs" onClick={handleStatSubmit}>✓</button>
            <button className="bg-gray-600 text-white px-2 py-1 rounded text-xs" onClick={() => setShowStatInput(null)}>✕</button>
          </div>
        )}

        <div className="border-t border-gray-700 my-1" />

        <button
          className="w-full text-left px-3 py-1.5 hover:bg-gray-700 text-blue-300"
          onClick={() => setShowCounterInput(!showCounterInput)}
        >
          🔢 Счётчики {Object.keys(card.counters).length > 0 && `(${Object.keys(card.counters).length})`}
        </button>

        {Object.entries(card.counters).map(([name, count]) => (
          <div key={name} className="px-3 py-1 text-xs text-gray-300 flex justify-between items-center">
            <span>{name}: {count}</span>
            <div className="flex gap-1">
              <button className="bg-green-700 text-white px-1.5 rounded text-[10px]" onClick={() => addCounter(contextMenuCardId, name, 1)}>+</button>
              <button className="bg-red-700 text-white px-1.5 rounded text-[10px]" onClick={() => removeCounter(contextMenuCardId, name, 1)}>−</button>
            </div>
          </div>
        ))}

        {showCounterInput && (
          <div className="px-3 py-2 space-y-1">
            <input
              type="text"
              placeholder="Имя счётчика"
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1 w-full text-white text-xs"
              value={counterName}
              onChange={(e) => setCounterName(e.target.value)}
              autoFocus
            />
            <div className="flex gap-1">
              <input
                type="number"
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 w-12 text-white text-xs"
                value={counterAmount}
                onChange={(e) => setCounterAmount(Number(e.target.value))}
                min={1}
              />
              <button className="bg-green-600 text-white px-2 py-1 rounded text-xs flex-1" onClick={() => handleCounterSubmit(true)}>+ Добавить</button>
              <button className="bg-red-600 text-white px-2 py-1 rounded text-xs flex-1" onClick={() => handleCounterSubmit(false)}>− Убрать</button>
            </div>
          </div>
        )}

        <div className="border-t border-gray-700 my-1" />

        {card.zone !== 'sealed' && player && (
          <button
            className="w-full text-left px-3 py-1.5 hover:bg-gray-700 text-amber-300"
            onClick={() => setShowSealPicker(!showSealPicker)}
          >
            🔒 Запечатать под Кристалл
          </button>
        )}

        {showSealPicker && player && (
          <div className="px-3 py-2 flex gap-1 flex-wrap">
            {player.crystals.map((cr, idx) => (
              !cr.destroyed && (
                <button
                  key={idx}
                  className="bg-cyan-700 hover:bg-cyan-600 text-white w-8 h-8 rounded text-xs font-bold flex flex-col items-center justify-center"
                  onClick={() => handleSeal(idx)}
                  title={`Кристалл ${idx + 1} (${cr.sealedCardIds.length} запечатано)`}
                >
                  {idx + 1}
                  {cr.sealedCardIds.length > 0 && <span className="text-[8px]">({cr.sealedCardIds.length})</span>}
                </button>
              )
            ))}
          </div>
        )}

        {opponentId && cardPlayerId === localPlayerId && (
          <>
            <div className="border-t border-gray-700 my-1" />
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-gray-700 text-yellow-300"
              onClick={() => { giveControl(contextMenuCardId, opponentId); closeContextMenu(); }}
            >
              🤝 Передать контроль оппоненту
            </button>
          </>
        )}
        {opponentId && cardPlayerId === opponentId && (
          <>
            <div className="border-t border-gray-700 my-1" />
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-gray-700 text-yellow-300"
              onClick={() => { giveControl(contextMenuCardId, localPlayerId); closeContextMenu(); }}
            >
              🤝 Забрать контроль себе
            </button>
          </>
        )}

        <div className="border-t border-gray-700 my-1" />

        <div className="px-3 py-1 text-[10px] text-gray-500 font-semibold uppercase">Переместить:</div>
        {zones.map(z => (
          <button
            key={z.zone}
            className={`w-full text-left px-3 py-1 hover:bg-gray-700 text-gray-300 text-xs ${card.zone === z.zone ? 'text-gray-600' : ''}`}
            onClick={() => handleMove(z.zone, z.faceDown)}
            disabled={card.zone === z.zone}
          >
            {z.label}
          </button>
        ))}

        {card.isToken && (
          <>
            <div className="border-t border-gray-700 my-1" />
            <button
              className="w-full text-left px-3 py-1.5 hover:bg-red-900 text-red-400"
              onClick={() => { removeToken(contextMenuCardId); closeContextMenu(); }}
            >
              🗑️ Удалить токен
            </button>
          </>
        )}
      </div>
    </>,
    document.body,
  );
};
