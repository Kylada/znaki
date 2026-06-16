import React, { useState, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { importFromFile, importFromGoogleSheets } from '../utils/importCards';
import type { CardTemplate } from '../types';

interface ImportDialogProps {
  onClose: () => void;
}

export const ImportDialog: React.FC<ImportDialogProps> = ({ onClose }) => {
  const { importCardTemplates, cardTemplates } = useGameStore();
  const [googleUrl, setGoogleUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imported, setImported] = useState<CardTemplate[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const templates = await importFromFile(file);
      importCardTemplates(templates);
      setImported(templates);
    } catch (err: any) {
      setError(err.message || 'Ошибка импорта');
    }
    setLoading(false);
  };

  const handleGoogleImport = async () => {
    if (!googleUrl) return;
    setLoading(true);
    setError('');
    try {
      const templates = await importFromGoogleSheets(googleUrl);
      importCardTemplates(templates);
      setImported(templates);
    } catch (err: any) {
      setError(err.message || 'Ошибка импорта');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-600 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">📋 Импорт карт</h2>
          <button className="text-gray-400 hover:text-white text-xl" onClick={onClose}>✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Instructions */}
          <div className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300 space-y-1">
            <p className="font-bold text-yellow-400">Формат таблицы:</p>
            <p>Первая строка — заголовки. Поддерживаемые столбцы:</p>
            <p><b>Name/Имя</b>, <b>Card Type/Тип</b> (Monster/Spell/Artifact/Sign),
            <b> Subtype/Подтип</b>, <b>Cost/Цена</b>, <b>Element/Element decyph</b> (Chaos/Order/Life/Light/Death/Darkness или A-F),
            <b> Attack/Атака</b>, <b>Health/Здоровье</b>, <b>Effect/Эффект</b>,
            <b> imgbb/Image</b> (URL изображения), <b>Number/ID</b></p>
            <p className="text-gray-500 mt-1">Для Google Sheets: таблица должна быть доступна по ссылке (Файл → Поделиться → Все, у кого есть ссылка).</p>
          </div>

          {/* File import */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-1">Из файла (Excel, CSV):</label>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,.ods"
              onChange={handleFileImport}
              className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
            />
          </div>

          {/* Google Sheets import */}
          <div>
            <label className="block text-sm font-semibold text-gray-200 mb-1">Из Google Sheets (публичная ссылка):</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={googleUrl}
                onChange={(e) => setGoogleUrl(e.target.value)}
              />
              <button
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold"
                onClick={handleGoogleImport}
                disabled={loading}
              >
                {loading ? '⏳' : '📥'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-2 text-red-300 text-sm">
              ❌ {error}
            </div>
          )}

          {/* Import result */}
          {imported.length > 0 && (
            <div className="bg-green-900/30 border border-green-700 rounded-lg p-2">
              <p className="text-green-300 text-sm font-bold mb-1">✅ Импортировано {imported.length} карт ({imported.filter(t => t.imageUrl).length} с изображениями)</p>
              <div className="max-h-[200px] overflow-y-auto space-y-1">
                {imported.map(t => (
                  <div key={t.id} className="flex items-center gap-2 text-xs text-gray-300">
                    {t.imageUrl && <img src={t.imageUrl} className="w-6 h-6 rounded object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                    <span className="font-semibold">{t.name}</span>
                    <span className="text-gray-500">{t.type}</span>
                    {t.attack !== undefined && <span className="text-red-400">⚔{t.attack}</span>}
                    {t.health !== undefined && <span className="text-green-400">♥{t.health}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing templates */}
          {cardTemplates.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-200 mb-1">Загруженные шаблоны ({cardTemplates.length}):</p>
              <div className="bg-gray-800 rounded-lg p-2 max-h-[150px] overflow-y-auto space-y-1">
                {cardTemplates.map(t => (
                  <div key={t.id} className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="font-semibold text-gray-200">{t.name}</span>
                    <span>{t.type}</span>
                    <span>{t.element}</span>
                    <span>💰{t.cost}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
