import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { CardType, Element, Zone } from '../../types';

interface TokenCreatorProps {
  playerId: string;
}

export const TokenCreator: React.FC<TokenCreatorProps> = ({ playerId }) => {
  const { createToken } = useGameStore();
  const [show, setShow] = useState(false);
  const [name, setName] = useState('Токен');
  const [type, setType] = useState<CardType>('monster');
  const [zone, setZone] = useState<Zone>('monsterZone');
  const [atk, setAtk] = useState(0);
  const [hp, setHp] = useState(1);
  const [element, setElement] = useState<Element>('Нет');
  const [imageUrl, setImageUrl] = useState('');

  const handleCreate = () => {
    createToken(playerId, zone, {
      name, type, element, imageUrl,
      attack: type === 'monster' ? atk : undefined,
      health: type === 'monster' || type === 'artifact' ? hp : undefined,
    });
  };

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        className="w-full text-left px-3 py-2 bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 text-sm"
        onClick={() => setShow(!show)}
      >
        🪄 Создать Токен
      </button>
      {show && (
        <div className="p-2 bg-gray-900 space-y-1">
          <input className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs" placeholder="Имя" value={name} onChange={e => setName(e.target.value)} />
          <div className="flex gap-1">
            <select className="bg-gray-800 border border-gray-600 rounded px-1 py-1 text-white text-xs flex-1" value={type} onChange={e => setType(e.target.value as CardType)}>
              <option value="monster">Монстр</option>
              <option value="artifact">Артефакт</option>
              <option value="spell">Заклятье</option>
            </select>
            <select className="bg-gray-800 border border-gray-600 rounded px-1 py-1 text-white text-xs flex-1" value={zone} onChange={e => setZone(e.target.value as Zone)}>
              <option value="monsterZone">Зона Монстров</option>
              <option value="spellArtifactZone">Зона Заклятий</option>
            </select>
          </div>
          <select className="w-full bg-gray-800 border border-gray-600 rounded px-1 py-1 text-white text-xs" value={element} onChange={e => setElement(e.target.value as Element)}>
            <option value="Нет">Нет элемента</option>
            <option value="Свет">☀️ Свет</option>
            <option value="Тьма">🌑 Тьма</option>
            <option value="Хаос">🔥 Хаос</option>
            <option value="Порядок">❄️ Порядок</option>
            <option value="Жизнь">🌿 Жизнь</option>
            <option value="Смерть">💀 Смерть</option>
          </select>
          {type === 'monster' && (
            <div className="flex gap-1">
              <div className="flex-1">
                <label className="text-[10px] text-gray-500">ATK</label>
                <input type="number" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs" value={atk} onChange={e => setAtk(Number(e.target.value))} />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-500">HP</label>
                <input type="number" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs" value={hp} onChange={e => setHp(Number(e.target.value))} />
              </div>
            </div>
          )}
          {type === 'artifact' && (
            <div>
              <label className="text-[10px] text-gray-500">HP</label>
              <input type="number" className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs" value={hp} onChange={e => setHp(Number(e.target.value))} />
            </div>
          )}
          <input className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs" placeholder="URL изображения" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
          <button className="w-full bg-purple-600 hover:bg-purple-500 text-white py-1.5 rounded text-xs font-bold" onClick={handleCreate}>
            Создать
          </button>
        </div>
      )}
    </div>
  );
};
