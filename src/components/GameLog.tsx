import React, { useRef, useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';

export const GameLog: React.FC = () => {
  const { log, chatMessages, addChat, localPlayerId, players, onSendAction } = useGameStore();
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState<'log' | 'chat'>('log');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log, chatMessages]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const name = players[localPlayerId]?.name || 'Вы';
    addChat(name, chatInput.trim());
    if (onSendAction) {
      onSendAction({ type: 'chat', data: { sender: name, text: chatInput.trim() } });
    }
    setChatInput('');
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          className={`flex-1 py-1.5 text-xs font-bold ${activeTab === 'log' ? 'bg-gray-800 text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
          onClick={() => setActiveTab('log')}
        >
          📜 Лог
        </button>
        <button
          className={`flex-1 py-1.5 text-xs font-bold ${activeTab === 'chat' ? 'bg-gray-800 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
          onClick={() => setActiveTab('chat')}
        >
          💬 Чат
        </button>
      </div>

      {/* Content */}
      <div ref={logRef} className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0">
        {activeTab === 'log' ? (
          log.length === 0 ? (
            <div className="text-gray-600 text-xs text-center py-2">Лог пуст</div>
          ) : (
            log.map((entry, i) => (
              <div key={i} className={`text-[11px] ${entry.startsWith('---') ? 'text-yellow-500 font-bold' : entry.includes('⚡') ? 'text-purple-400' : 'text-gray-400'}`}>
                {entry}
              </div>
            ))
          )
        ) : (
          chatMessages.length === 0 ? (
            <div className="text-gray-600 text-xs text-center py-2">Нет сообщений</div>
          ) : (
            chatMessages.map((msg, i) => (
              <div key={i} className="text-[11px]">
                <span className="text-blue-400 font-bold">{msg.sender}:</span>{' '}
                <span className="text-gray-300">{msg.text}</span>
              </div>
            ))
          )
        )}
      </div>

      {/* Chat input */}
      {activeTab === 'chat' && (
        <div className="p-1 border-t border-gray-700 flex gap-1">
          <input
            type="text"
            className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs"
            placeholder="Сообщение..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
          />
          <button
            className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
            onClick={handleSendChat}
          >
            ➤
          </button>
        </div>
      )}
    </div>
  );
};
