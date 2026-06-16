import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';

interface LifeCrystalsProps {
  playerId: string;
  isOpponent: boolean;
}

export const LifeCrystals: React.FC<LifeCrystalsProps> = ({ playerId, isOpponent }) => {
  const { players, setCrystalHealth, destroyCrystal, addCrystal, removeCrystal, unsealCard, getCard } = useGameStore();
  const player = players[playerId];
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState(6);

  if (!player) return null;

  const activeCrystals = player.crystals.filter(c => !c.destroyed);
  const totalHP = activeCrystals.reduce((s, c) => s + c.currentHealth, 0);

  return (
    <div className="flex items-center gap-1.5">
      <div className="text-xs text-gray-400 mr-1 font-mono">
        ♥ {totalHP}/{activeCrystals.length * 6}
      </div>
      {player.crystals.map((crystal, idx) => {
        if (crystal.destroyed) {
          return (
            <div key={idx} className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-700 text-xs opacity-40" title={`Кристалл ${idx + 1} — Разрушен`}>
              💔
            </div>
          );
        }

        const healthPercent = crystal.currentHealth / crystal.maxHealth;
        const color = healthPercent > 0.6 ? 'from-cyan-400 to-blue-600' : healthPercent > 0.3 ? 'from-yellow-400 to-orange-600' : 'from-red-400 to-red-700';
        const sealedCount = crystal.sealedCardIds.length;

        return (
          <div key={idx} className="relative group">
            <div
              className={`w-9 h-9 rounded-lg bg-gradient-to-b ${color} border-2 border-white/30 flex flex-col items-center justify-center text-white font-bold cursor-pointer shadow-lg hover:scale-110 transition-transform`}
              onClick={() => {
                if (!isOpponent) {
                  setEditingIdx(editingIdx === idx ? null : idx);
                  setEditValue(crystal.currentHealth);
                }
              }}
              title={`Кристалл ${idx + 1}: ${crystal.currentHealth}/${crystal.maxHealth}${sealedCount > 0 ? ` | ${sealedCount} запечатано` : ''}`}
            >
              <span className="text-sm leading-none">{crystal.currentHealth}</span>
            </div>

            {/* Sealed card indicator */}
            {sealedCount > 0 && (
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-[8px] px-1 rounded-full font-bold min-w-[14px] text-center leading-[14px]" title={`${sealedCount} запечатанных карт`}>
                {sealedCount}
              </div>
            )}

            {/* Edit popup */}
            {editingIdx === idx && !isOpponent && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setEditingIdx(null)} />
                <div className="fixed bg-gray-900 border border-gray-600 rounded-lg p-2 z-40 min-w-[160px] max-h-[80dvh] overflow-y-auto space-y-1.5 shadow-xl"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}>
                  <div className="text-xs text-gray-400 font-bold">Кристалл {idx + 1}</div>

                  {/* Health controls */}
                  <div className="flex items-center gap-1">
                    <button
                      className="bg-red-700 hover:bg-red-600 text-white w-7 h-7 rounded text-sm font-bold"
                      onClick={() => { const nv = Math.max(0, editValue - 1); setEditValue(nv); setCrystalHealth(playerId, idx, nv); }}
                    >−</button>
                    <input
                      type="number"
                      className="bg-gray-800 border border-gray-600 rounded px-1 py-0.5 w-12 text-white text-center text-sm"
                      value={editValue}
                      onChange={(e) => { const v = Number(e.target.value); setEditValue(v); setCrystalHealth(playerId, idx, v); }}
                      min={0} max={6}
                    />
                    <button
                      className="bg-green-700 hover:bg-green-600 text-white w-7 h-7 rounded text-sm font-bold"
                      onClick={() => { const nv = Math.min(6, editValue + 1); setEditValue(nv); setCrystalHealth(playerId, idx, nv); }}
                    >+</button>
                  </div>

                  <button
                    className="w-full bg-red-600 hover:bg-red-500 text-white py-1 rounded text-xs"
                    onClick={() => { destroyCrystal(playerId, idx); setEditingIdx(null); }}
                  >
                    💥 Разрушить
                  </button>
                  <button
                    className="w-full bg-gray-700 hover:bg-gray-600 text-white py-1 rounded text-xs"
                    onClick={() => { removeCrystal(playerId, idx); setEditingIdx(null); }}
                  >
                    🗑 Удалить
                  </button>

                  {/* Sealed cards list */}
                  {sealedCount > 0 && (
                    <div className="border-t border-gray-700 pt-1 space-y-0.5">
                      <div className="text-[10px] text-gray-500 font-semibold">Запечатанные карты:</div>
                      {crystal.sealedCardIds.map(cardId => {
                        const sealedCard = getCard(cardId);
                        return (
                          <div key={cardId} className="flex items-center justify-between">
                            <span className="text-[10px] text-gray-300 truncate flex-1">
                              {sealedCard?.template.name || '???'}
                            </span>
                            <button
                              className="bg-purple-600 hover:bg-purple-500 text-white px-1.5 py-0.5 rounded text-[9px] ml-1"
                              onClick={() => unsealCard(cardId)}
                            >
                              📜
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}

      {/* Add crystal button */}
      {!isOpponent && player.crystals.filter(c => !c.destroyed).length < 6 && (
        <button
          className="w-9 h-9 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center text-gray-500 hover:border-cyan-400 hover:text-cyan-400 transition-colors text-lg"
          onClick={() => addCrystal(playerId)}
          title="Добавить Кристалл"
        >
          +
        </button>
      )}
    </div>
  );
};
