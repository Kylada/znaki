import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';

export const ChainVisualizer: React.FC = () => {
  const { 
    chain, chainActive, addChainLink, resolveLastLink, resolveChain, clearChain, 
    localPlayerId, players, resolutionPending, confirmResolution, cancelResolution 
  } = useGameStore();

  const [showAddLink, setShowAddLink] = useState(false);
  const [linkDesc, setLinkDesc] = useState('');
  const [linkCardName, setLinkCardName] = useState('');

  const handleAddLink = () => {
    if (linkDesc) {
      addChainLink({
        cardInstanceId: null,
        cardName: linkCardName || '',
        description: linkDesc,
        playerId: localPlayerId
      });
      setLinkDesc('');
      setLinkCardName('');
    }
  };

  const unresolvedCount = chain.filter(l => !l.resolved).length;

  return (
    <div className="bg-gray-900/90 border border-gray-700 rounded-lg p-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-1">
          ⛓️ Цепь
          {chainActive && <span className="text-green-400 text-xs animate-pulse">(активна: {unresolvedCount})</span>}
        </h3>
        <button
          className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-2 py-1 rounded"
          onClick={() => setShowAddLink(!showAddLink)}
        >
          + Звено
        </button>
      </div>

      {/* Action buttons */}
      {chain.length > 0 && (
        <div className="flex gap-1 mb-2">
          {!resolutionPending ? (
            <>
              <button
                className="flex-1 bg-amber-700 hover:bg-amber-600 text-white text-xs px-2 py-1.5 rounded font-bold"
                onClick={resolveLastLink}
                disabled={unresolvedCount === 0}
              >
                ✓ Разрешить последнее
              </button>
              <button
                className="flex-1 bg-green-700 hover:bg-green-600 text-white text-xs px-2 py-1.5 rounded font-bold"
                onClick={resolveChain}
                disabled={unresolvedCount === 0}
              >
                ✓✓ Разрешить всё
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 flex-1 bg-gray-800 p-2 rounded border border-yellow-600/50">
              {resolutionPending.initiatorId === localPlayerId ? (
                <div className="text-center text-gray-400 text-[10px] italic animate-pulse">
                  Ваш оппонент должен подтвердить разрешение...
                </div>
              ) : (
                <>
                  <div className="text-center text-yellow-400 text-[10px] font-bold">
                    {resolutionPending.type === 'link' 
                      ? 'Ваш оппонент предлагает разрешить последнее звено цепи' 
                      : 'Ваш оппонент предлагает разрешить всю цепь'}
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white text-xs px-2 py-1.5 rounded font-bold animate-pulse"
                      onClick={() => confirmResolution(localPlayerId)}
                    >
                      Подтвердить
                    </button>
                    <button
                      className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1.5 rounded"
                      onClick={cancelResolution}
                    >
                      ✕
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          <button
            className="bg-red-700 hover:bg-red-600 text-white text-xs px-2 py-1.5 rounded"
            onClick={clearChain}
            title="Очистить цепь"
          >
            ✕
          </button>
        </div>
      )}

      {showAddLink && (
        <div className="space-y-1 mb-2">
          <input
            type="text"
            className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs"
            placeholder="Имя карты (необязательно)"
            value={linkCardName}
            onChange={(e) => setLinkCardName(e.target.value)}
          />
          <div className="flex gap-1">
            <input
              type="text"
              className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs"
              placeholder="Описание звена..."
              value={linkDesc}
              onChange={(e) => setLinkDesc(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
              autoFocus
            />
            <button className="bg-purple-600 text-white text-xs px-2 py-1 rounded" onClick={handleAddLink}>✓</button>
          </div>
        </div>
      )}

      {chain.length === 0 ? (
        <div className="text-gray-600 text-xs text-center py-2">Нет активных звеньев</div>
      ) : (
        <div className="space-y-1">
          {unresolvedCount > 1 && (
            <div className="text-center text-gray-500 text-[10px] mb-1">
              ↓ Разрешается снизу вверх ↓
            </div>
          )}

          {chain.map((link) => (
            <div
              key={link.linkNumber}
              className={`flex items-start gap-2 p-1.5 rounded text-xs transition-all ${
                link.resolved
                  ? 'bg-green-900/30 border border-green-800/50 opacity-60'
                  : 'bg-gray-800 border border-purple-700/50'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                link.resolved ? 'bg-green-700' : 'bg-purple-600'
              }`}>
                {link.linkNumber}
              </div>
              <div className="flex-1 min-w-0">
                {link.cardName && (
                  <div className="text-yellow-300 font-semibold truncate">{link.cardName}</div>
                )}
                <div className="text-gray-200 break-words">{link.description}</div>
                <div className="text-gray-500 text-[10px]">
                  {players[link.playerId]?.name || link.playerId}
                  {link.resolved && ' — ✓ Разрешено'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
