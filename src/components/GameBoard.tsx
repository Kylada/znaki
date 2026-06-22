import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { PlayerField } from './PlayerField';
import { Hand } from './Hand';
import { LifeCrystals } from './LifeCrystals';
import { ChainVisualizer } from './ChainVisualizer';
import { SidePanel } from './SidePanel';
import { CardPreview } from './CardPreview';
import { CardContextMenu } from './CardContextMenu';
import { TurnControls } from './TurnControls';
import { GameLog } from './GameLog';
import { ImportDialog } from './ImportDialog';
import { DeckBuilder } from './DeckBuilder';

export const GameBoard: React.FC = () => {
  const { players, localPlayerId, gameStatus, setGameStatus, resetGame } = useGameStore();
  const [showImport, setShowImport] = useState(false);
  const [deckBuilderPlayerId, setDeckBuilderPlayerId] = useState<string | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const playerIds = Object.keys(players);
  const opponentId = playerIds.find(id => id !== localPlayerId) || '';

  return (
    <div className="h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex flex-col overflow-hidden text-white">
      {/* Game Over Overlay */}
      {gameStatus !== 'playing' && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl">
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-yellow-400">
                {gameStatus === 'conceded' && '🏳️ Сдались'}
                {gameStatus === 'tie-proposed' && '🤝 Предложена ничья'}
                {gameStatus === 'ended' && '🏁 Игра окончена'}
              </h2>
              <p className="text-gray-400 text-sm">
                {gameStatus === 'conceded' && 'Один из игроков признал поражение.'}
                {gameStatus === 'tie-proposed' && 'Оппонент предложил закончить игру вничью.'}
                {gameStatus === 'ended' && 'Матч завершен.'}
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              {gameStatus === 'tie-proposed' && (
                <button 
                  className="bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg font-bold transition-colors"
                  onClick={() => { setGameStatus('ended'); }}
                >
                  Принять ничью
                </button>
              )}
              <button 
                className="bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-bold transition-colors"
                onClick={() => { resetGame(); }}
              >
                Начать заново
              </button>
              {gameStatus === 'tie-proposed' && (
                <button 
                  className="bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-bold transition-colors"
                  onClick={() => { setGameStatus('playing'); }}
                >
                  Отменить
                </button>
              )}
              <button 
                className="bg-gray-800 hover:bg-gray-700 text-gray-400 py-2 rounded-lg font-bold transition-colors"
                onClick={() => { window.location.reload(); }}
              >
                Выйти в меню
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-2 py-1 bg-gray-900/80 border-b border-gray-800 flex-shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-yellow-400 font-bold text-sm">✦ ЗНАКИ</span>
          <button
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs"
            onClick={() => setShowImport(true)}
          >
            📋 Импорт
          </button>
          <button
            className="bg-blue-900 hover:bg-blue-800 text-blue-200 px-2 py-0.5 rounded text-xs"
            onClick={() => setDeckBuilderPlayerId(localPlayerId)}
          >
            🃏 Моя Колода
          </button>
          {opponentId && (
            <button
              className="bg-red-900 hover:bg-red-800 text-red-200 px-2 py-0.5 rounded text-xs"
              onClick={() => setDeckBuilderPlayerId(opponentId)}
            >
              🃏 Колода Оппонента
            </button>
          )}
          <div className="flex items-center gap-1 ml-2 border-l border-gray-700 pl-2">
            <button
              className="bg-gray-700 hover:bg-red-900 text-gray-300 hover:text-white px-2 py-0.5 rounded text-xs transition-colors"
              onClick={() => { if(window.confirm('Выйти из игры?')) window.location.reload(); }}
            >
              🚪 Выйти
            </button>
            <button
              className="bg-gray-700 hover:bg-orange-900 text-gray-300 hover:text-white px-2 py-0.5 rounded text-xs transition-colors"
              onClick={() => { if(window.confirm('Сдаться?')) useGameStore.getState().executeAction('concede', { playerId: localPlayerId }); }}
            >
              🏳️ Сдаться
            </button>
            <button
              className="bg-gray-700 hover:bg-green-900 text-gray-300 hover:text-white px-2 py-0.5 rounded text-xs transition-colors"
              onClick={() => { if(window.confirm('Предложить ничью?')) useGameStore.getState().executeAction('proposeTie', { playerId: localPlayerId }); }}
            >
              🤝 Ничья
            </button>
          </div>
          <button
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs"
            onClick={() => setLeftPanelOpen(!leftPanelOpen)}
          >
            {leftPanelOpen ? '◀' : '▶'}
          </button>
          <button
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs"
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
          >
            {rightPanelOpen ? '▶' : '◀'}
          </button>
        </div>
        <TurnControls />
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel */}
        {leftPanelOpen && (
          <div className="w-[230px] flex-shrink-0 border-r border-gray-800 overflow-y-auto p-1.5 space-y-2 bg-gray-950/50">
            <CardPreview />
            {opponentId && (
              <div>
                <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                  {players[opponentId]?.name || 'Оппонент'}
                </div>
                <SidePanel playerId={opponentId} isOpponent={true} />
              </div>
            )}
            <div>
              <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                {players[localPlayerId]?.name || 'Вы'}
              </div>
              <SidePanel playerId={localPlayerId} isOpponent={false} />
            </div>
          </div>
        )}

        {/* Game field */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Opponent hand */}
          {opponentId && (
            <div className="flex-shrink-0 bg-red-950/10 border-b border-gray-800">
              <div className="flex items-center justify-between px-2 py-0.5">
                <span className="text-xs text-red-400 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                  {players[opponentId]?.name || 'Оппонент'}
                </span>
                <LifeCrystals playerId={opponentId} isOpponent={true} />
              </div>
              <Hand playerId={opponentId} isOpponent={true} />
            </div>
          )}

          {/* Field area */}
          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1 min-h-0">
            {opponentId && (
              <div className="pb-1">
                <PlayerField playerId={opponentId} isOpponent={true} />
              </div>
            )}

            <div className="flex items-center gap-2 py-0.5">
              <div className="flex-1 border-t border-dashed border-gray-700/50" />
              <span className="text-gray-600 text-xs">⚔️ Поле боя</span>
              <div className="flex-1 border-t border-dashed border-gray-700/50" />
            </div>

            <PlayerField playerId={localPlayerId} isOpponent={false} />
          </div>

          {/* Player hand */}
          <div className="flex-shrink-0 bg-blue-950/10 border-t border-gray-800">
            <div className="flex items-center justify-between px-2 py-0.5">
              <span className="text-xs text-blue-400 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                {players[localPlayerId]?.name || 'Вы'}
              </span>
              <LifeCrystals playerId={localPlayerId} isOpponent={false} />
            </div>
            <Hand playerId={localPlayerId} isOpponent={false} />
          </div>
        </div>

        {/* Right panel */}
        {rightPanelOpen && (
          <div className="w-[250px] flex-shrink-0 border-l border-gray-800 flex flex-col p-1.5 space-y-2 bg-gray-950/50">
            <ChainVisualizer />
            <div className="flex-1 min-h-0">
              <GameLog />
            </div>
          </div>
        )}
      </div>

      {/* Context menu */}
      <CardContextMenu />

      {/* Dialogs */}
      {showImport && <ImportDialog onClose={() => setShowImport(false)} />}
      {deckBuilderPlayerId && (
        <DeckBuilder
          playerId={deckBuilderPlayerId}
          onClose={() => setDeckBuilderPlayerId(null)}
        />
      )}
    </div>
  );
};
