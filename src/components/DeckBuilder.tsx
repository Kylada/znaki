import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';

interface DeckBuilderProps {
  playerId: string;
  onClose: () => void;
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({ playerId, onClose }) => {
  const { cardTemplates, loadDeck, shuffleDeck, sealCard, drawCard, players, decks, setDecks } = useGameStore();
  const playerName = players[playerId]?.name || playerId;
  
  const mainDeck = decks[playerId]?.main || [];
  const signDeck = decks[playerId]?.sign || [];

  const updateDeck = (newMain: string[], newSign: string[]) => {
    setDecks({
      ...decks,
      [playerId]: { main: newMain, sign: newSign }
    });
  };

  const [filter, setFilter] = useState('');
  const [importText, setImportText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  const filteredTemplates = cardTemplates.filter(t =>
    t.name.toLowerCase().includes(filter.toLowerCase()) ||
    t.type.toLowerCase().includes(filter.toLowerCase()) ||
    t.element.toLowerCase().includes(filter.toLowerCase())
  );

  const addToMain = (id: string) => {
    const count = mainDeck.filter(d => d === id).length;
    if (count < 3 && mainDeck.length < 60) {
      updateDeck([...mainDeck, id], signDeck);
    }
  };

  const addToSign = (id: string) => {
    if (signDeck.length >= 6) return;
    const tmpl = cardTemplates.find(t => t.id === id);
    const isBasic = !tmpl?.effectText?.trim();
    if (!isBasic && signDeck.includes(id)) return;
    updateDeck(mainDeck, [...signDeck, id]);
  };

  const removeFromMain = (idx: number) => {
    updateDeck(mainDeck.filter((_, i) => i !== idx), signDeck);
  };

  const removeFromSign = (idx: number) => {
    updateDeck(mainDeck, signDeck.filter((_, i) => i !== idx));
  };

  const handleLoadDeck = () => {
    if (!window.confirm('Загрузка новой колоды заменит текущую и сбросит состояние поля. Продолжить?')) {
      return;
    }
    loadDeck(playerId, mainDeck, false, true);
    loadDeck(playerId, signDeck, true, false);
    shuffleDeck(playerId, false);
    shuffleDeck(playerId, true);

    setTimeout(() => {
      for (let i = 0; i < 6; i++) {
        drawCard(playerId);
      }
      const player = useGameStore.getState().players[playerId];
      if (player) {
        const deckCards = player.cards
          .filter(c => c.zone === 'mainDeck')
          .sort((a, b) => a.order - b.order);
        const crystalsCount = player.crystals.filter(c => !c.destroyed).length;
        for (let i = 0; i < Math.min(crystalsCount, deckCards.length); i++) {
          sealCard(deckCards[i].instanceId, i, playerId);
        }
      }
    }, 100);

    onClose();
  };

  const exportDeck = () => {
    const mainCounts: Record<string, number> = {};
    mainDeck.forEach(id => {
      const name = cardTemplates.find(t => t.id === id)?.name || 'Unknown';
      mainCounts[name] = (mainCounts[name] || 0) + 1;
    });
    const mainStr = Object.entries(mainCounts).map(([name, count]) => `${name} x${count}`).join(', ');

    const signCounts: Record<string, number> = {};
    signDeck.forEach(id => {
      const name = cardTemplates.find(t => t.id === id)?.name || 'Unknown';
      signCounts[name] = (signCounts[name] || 0) + 1;
    });
    const signStr = Object.entries(signCounts).map(([name, count]) => `${name} x${count}`).join(', ');

    const fullExport = `Main Deck: ${mainStr}\nSign Deck: ${signStr}`;
    
    const blob = new Blob([fullExport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${playerName}_deck.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportText = () => {
    try {
      const lines = importText.split('\n');
      const newMain: string[] = [];
      const newSign: string[] = [];

      lines.forEach(line => {
        if (line.startsWith('Main Deck:')) {
          const cardsPart = line.replace('Main Deck:', '').trim();
          if (cardsPart) {
            cardsPart.split(',').forEach(cardStr => {
              const [name, countStr] = cardStr.split(' x');
              const count = parseInt(countStr) || 1;
              const tmpl = cardTemplates.find(t => t.name.trim().toLowerCase() === name.trim().toLowerCase());
              if (tmpl) {
                for (let i = 0; i < count; i++) newMain.push(tmpl.id);
              }
            });
          }
        } else if (line.startsWith('Sign Deck:')) {
          const cardsPart = line.replace('Sign Deck:', '').trim();
          if (cardsPart) {
            cardsPart.split(',').forEach(cardStr => {
              const [name, countStr] = cardStr.split(' x');
              const count = parseInt(countStr) || 1;
              const tmpl = cardTemplates.find(t => t.name.trim().toLowerCase() === name.trim().toLowerCase() && t.type === 'sign');
              if (tmpl) {
                for (let i = 0; i < count; i++) newSign.push(tmpl.id);
              }
            });
          }
        }
      });

      if (newMain.length === 0 && newSign.length === 0) {
        alert('Не удалось найти подходящие карты в тексте импорта.');
        return;
      }

      updateDeck(newMain, newSign);
      setShowImportModal(false);
      setImportText('');
    } catch (e) {
      alert('Ошибка при импорте. Проверьте формат файла.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-600 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">🃏 Сборка колоды — {playerName}</h2>
          <button className="text-gray-400 hover:text-white text-xl" onClick={onClose}>✕</button>
        </div>

        <div className="p-4 grid grid-cols-2 gap-4">
          {/* Card pool */}
          <div>
            <h3 className="text-sm font-bold text-gray-200 mb-2">Доступные карты ({filteredTemplates.length})</h3>
            <input
              type="text"
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-1.5 text-white text-sm mb-2"
              placeholder="Поиск..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <div className="space-y-1 max-h-[50vh] overflow-y-auto">
              {filteredTemplates.map(t => (
                <div key={t.id} className="flex items-center justify-between bg-gray-800 rounded p-2 text-xs">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {t.imageUrl && <img src={t.imageUrl} className="w-8 h-8 rounded object-cover flex-shrink-0" crossOrigin="anonymous" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-200 truncate">{t.name}</div>
                      <div className="text-gray-500">{t.type} | {t.element} | 💰{t.cost}{t.attack !== undefined ? ` | ⚔${t.attack}` : ''}{t.health !== undefined ? ` | ♥${t.health}` : ''}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <button className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-[10px]" onClick={() => addToMain(t.id)}>
                      +Колода
                    </button>
                    {t.type === 'sign' && (
                      <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded text-[10px]" onClick={() => addToSign(t.id)}>
                        +Знаки
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {filteredTemplates.length === 0 && (
                <div className="text-gray-600 text-center py-4">
                  {cardTemplates.length === 0 ? 'Сначала импортируйте карты' : 'Ничего не найдено'}
                </div>
              )}
            </div>
          </div>

          {/* Deck lists */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 rounded font-bold" onClick={exportDeck}>
                📤 Экспортировать .txt
              </button>
              <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-2 rounded font-bold" onClick={() => setShowImportModal(true)}>
                📥 Импортировать .txt
              </button>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-200 mb-1">
                Основная колода ({mainDeck.length}/60, мин. 35)
              </h3>
              <div className="bg-gray-800 rounded-lg p-2 max-h-[30vh] overflow-y-auto space-y-0.5">
                {mainDeck.length === 0 ? (
                  <div className="text-gray-600 text-xs text-center py-2">Пусто</div>
                ) : (
                  mainDeck.map((id, idx) => {
                    const t = cardTemplates.find(c => c.id === id);
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs text-gray-300 py-0.5">
                        <span>{t?.name || id}</span>
                        <button className="text-red-400 hover:text-red-300 px-1" onClick={() => removeFromMain(idx)}>✕</button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-200 mb-1">
                Колода Знаков ({signDeck.length}/6)
              </h3>
              <div className="bg-gray-800 rounded-lg p-2 max-h-[20vh] overflow-y-auto space-y-0.5">
                {signDeck.length === 0 ? (
                  <div className="text-gray-600 text-xs text-center py-2">Пусто</div>
                ) : (
                  signDeck.map((id, idx) => {
                    const t = cardTemplates.find(c => c.id === id);
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs text-gray-300 py-0.5">
                        <span>{t?.name || id}</span>
                        <button className="text-red-400 hover:text-red-300 px-1" onClick={() => removeFromSign(idx)}>✕</button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button
              className={`w-full py-3 rounded-lg font-bold text-sm ${
                mainDeck.length >= 35 && signDeck.length === 6
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : mainDeck.length > 0 || signDeck.length > 0
                  ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
              onClick={handleLoadDeck}
              disabled={mainDeck.length === 0 && signDeck.length === 0}
            >
              {mainDeck.length >= 35 && signDeck.length === 6
                ? '✅ Загрузить колоду и начать'
                : `📦 Загрузить (${mainDeck.length} + ${signDeck.length})`
              }
            </button>
          </div>
        </div>
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-600 rounded-xl w-full max-w-lg p-4 space-y-4">
            <h3 className="text-lg font-bold text-white">📥 Импорт колоды из текста</h3>
            <p className="text-gray-400 text-xs">
              Формат:<br/>
              Main Deck: Карта 1 x3, Карта 2 x1...<br/>
              Sign Deck: Знак 1 x1...
            </p>
            <textarea
              className="w-full h-64 bg-gray-800 border border-gray-600 rounded p-2 text-white text-sm font-mono"
              placeholder="Вставьте текст колоды сюда..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="flex gap-2">
              <button className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded font-bold" onClick={handleImportText}>Загрузить</button>
              <button className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded font-bold" onClick={() => setShowImportModal(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
