import React, { useState, useEffect } from 'react';
import { networkManager } from '../networking/peer';
import { useGameStore } from '../store/gameStore';
import { v4 as uuidv4 } from 'uuid';
import { CardMakerModal } from './CardMakerModal';

interface LobbyProps {
  onGameStart: () => void;
}

/* ------------------------------------------------------------------ */
/*  Modal wrapper                                                      */
/* ------------------------------------------------------------------ */
const InfoModal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
    <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
        <h2 className="text-lg font-bold text-yellow-400">{title}</h2>
        <button className="text-gray-400 hover:text-white text-xl leading-none" onClick={onClose}>✕</button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 text-gray-300 text-sm leading-relaxed space-y-4">
        {children}
      </div>
      <div className="px-5 py-3 border-t border-gray-700 flex justify-end">
        <button className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg text-sm" onClick={onClose}>Закрыть</button>
      </div>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Help                                                               */
/* ------------------------------------------------------------------ */
const HelpContent: React.FC = () => (
  <>
    <h3 className="text-yellow-400 font-bold text-base">🎮 Локальная игра / соло</h3>
    <ol className="list-decimal list-inside space-y-1 pl-2">
      <li>Введите имя на главном экране.</li>
      <li>Нажмите <b>«Локальная игра / Соло»</b> — симулятор создаст два места за столом, которыми можно управлять с одного экрана.</li>
      <li>На верхней панели используйте <b>«📋 Импорт»</b>, чтобы загрузить базу карт из Excel/CSV/ODS или из публичной Google Sheets.</li>
      <li>Откройте <b>«🃏 Моя Колода»</b> и <b>«🃏 Колода Оппонента»</b>, чтобы собрать колоды из импортированных карт.</li>
      <li><b>«Начать заново»</b> пересоздаёт игру из сохранённых списков колод, не стирая сами списки.</li>
    </ol>

    <h3 className="text-green-400 font-bold text-base mt-4">🌐 Сетевая игра</h3>
    <ol className="list-decimal list-inside space-y-1 pl-2">
      <li><b>Хост</b> нажимает <b>«Создать комнату (Хост)»</b>, копирует появившийся ID и отправляет его оппоненту.</li>
      <li><b>Гость</b> нажимает <b>«Присоединиться»</b>, вставляет ID комнаты и жмёт <b>«🔗 Подключиться»</b>.</li>
      <li>После статуса <b>«Подключен!»</b> оба игрока могут нажать <b>«✅ Начать игру»</b>.</li>
      <li>В мультиплеере синхронизируется всё состояние стола: карты, кристаллы, лог, цепь и ручные действия.</li>
    </ol>

    <h3 className="text-amber-400 font-bold text-base mt-4">🖼 Конструктор карт</h3>
    <ol className="list-decimal list-inside space-y-1 pl-2">
      <li>На главном экране нажмите <b>«🖼 Создать Карту»</b>.</li>
      <li>Заполните тип, элемент, название, подтип, статы и текст.</li>
      <li>Добавьте изображение с устройства или по ссылке, затем перетащите его внутри окна арта или отрегулируйте ползунками.</li>
      <li>Нажмите <b>«Скачать PNG»</b>, чтобы получить готовую карточку.</li>
      <li>В пакетном режиме можно загрузить таблицу в формате основной базы карт: завершённые строки скачиваются автоматически, а неполные открываются для ручного дозаполнения по одной.</li>
    </ol>

    <h3 className="text-cyan-400 font-bold text-base mt-4">💡 Полезные подсказки</h3>
    <ul className="list-disc list-inside space-y-1 pl-2">
      <li><b>ПКМ по карте</b> — открывает меню действий: перемещение, статы, счётчики, передача контроля и т.д.</li>
      <li><b>ЛКМ по карте</b> — выделяет её; выделенная карта имеет приоритет в окне предпросмотра.</li>
      <li><b>Перетаскивание по полю</b> — у карт на поле есть верхняя и нижняя зоны-наводки для наложения «над» или «под» другую карту.</li>
      <li>Если карта с прикреплениями покидает поле в не-полевую зону, прикреплённые карты автоматически отправляются на кладбище.</li>
      <li><b>Клик по Кристаллу Жизни</b> открывает его редактирование, разрушение и список запечатанных карт.</li>
    </ul>
  </>
);

/* ------------------------------------------------------------------ */
/*  Rules                                                              */
/* ------------------------------------------------------------------ */
const RulesContent: React.FC = () => (
  <>
    <h3 className="text-yellow-400 font-bold text-lg">📜 Актуальные правила «Знаков» — краткая памятка</h3>

    <h4 className="text-amber-300 font-bold mt-2">Введение</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li>Цель игры — довести здоровье противника до нуля.</li>
      <li>Основная Колода: <b>35–60 карт</b>, обычно не более <b>3 копий</b> одной карты.</li>
      <li>Колода Знаков: <b>6 карт</b>, обычно не более <b>1 копии</b> каждого небазового Знака.</li>
      <li>В начале партии каждый игрок берёт 6 карт и кладёт по 1 карте под каждый из 6 Кристаллов Жизни.</li>
    </ul>

    <h4 className="text-amber-300 font-bold mt-3">Поле</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li><b>Зона Монстров</b> — максимум 6 карт.</li>
      <li><b>Зона Заклятий и Артефактов</b> — максимум 6 карт.</li>
      <li><b>Зона Знаков</b> — максимум 6 карт.</li>
      <li><b>Кладбище</b> — уничтоженные / использованные карты, <b>Пустота</b> — развоплощённые карты.</li>
    </ul>

    <h4 className="text-amber-300 font-bold mt-3">Ход</h4>
    <p className="font-semibold text-gray-200 mt-1">🌅 Начало хода</p>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li>Возьмите 1 карту из Основной Колоды, если это возможно.</li>
      <li>Начертайте столько Знаков с верха Колоды Знаков, сколько у вас Кристаллов Жизни.</li>
      <li>Активируйте эффекты «в начале хода»; приоритет сначала у ходящего игрока.</li>
    </ul>

    <p className="font-semibold text-gray-200 mt-1">⚔️ Фаза действий</p>
    <p><b>Истощающие действия</b>: взять карту, сменить позицию монстра, объявить атаку, разыграть карту. Для каждого такого действия нужно истощить 1 свой Знак.</p>
    <p><b>Неистощающие действия</b>: активировать уже разыгранные эффекты, защищаться, разыгрывать распечатанные карты при соблюдении условий.</p>

    <p className="font-semibold text-gray-200 mt-1">🌙 Конец хода</p>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li>Монстры и артефакты восстанавливают здоровье до максимума.</li>
      <li>Срабатывают эффекты «в конце хода»; эффекты «до конца хода» заканчиваются.</li>
      <li>Игроки с 9+ картами сбрасывают до 8.</li>
      <li>Оппонент ходящего возвращает все свои Знаки в Колоду Знаков и перемешивает её.</li>
    </ul>

    <h4 className="text-amber-300 font-bold mt-3">Розыгрыш карт</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li>Нужно истощить Знак нужного Элемента. Для многоэлементных карт — по Знаку каждого Элемента. Для карт без Элемента — любой Знак.</li>
      <li>Цена платится здоровьем, начиная с самого левого Кристалла Жизни.</li>
      <li>Монстр при розыгрыше может сразу войти в атакующей или защитной позиции.</li>
      <li>Карты не меняют взаимный порядок на поле сами по себе, если только эффект карты не говорит обратного.</li>
    </ul>

    <h4 className="text-amber-300 font-bold mt-3">Атака и защита</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li>Для атаки нужно истощить Знак, выбрать цель и выбрать атакующего монстра в атакующей позиции.</li>
      <li>Каждый монстр обычно может атаковать только 1 раз за ход. Первая атака первого игрока на первом ходу запрещена.</li>
      <li>После выбора цели оппонент может перенаправить атаку в своих монстров в защитной позиции.</li>
      <li>Боевой урон атакующему и его цели наносится <b>одновременно</b>.</li>
    </ul>

    <h4 className="text-amber-300 font-bold mt-3">Кристаллы Жизни</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li>У каждого Кристалла фиксированное максимальное здоровье: <b>6</b>.</li>
      <li>Урон и цена всегда начинают списываться с самого левого Кристалла, если карта не говорит иного.</li>
      <li>При разрушении Кристалла запечатанная под ним карта распечатывается: в руку — если Кристалл сломался от собственной цены / эффекта / урона себе; бесплатно в розыгрыш или в руку — если Кристалл разбил оппонент.</li>
      <li><b>Второе Дыхание</b>: если в начале своего хода у игрока остался 1 Кристалл, он выставляет все 6 Знаков и может разыграть без платы здоровьем количество карт, равное разнице между 6 и текущими жизнями. Один раз за игру.</li>
    </ul>

    <h4 className="text-amber-300 font-bold mt-3">Типы и подтипы</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li><b>Монстры</b> — имеют атаку и здоровье, могут атаковать и защищать.</li>
      <li><b>Артефакты</b> — имеют только здоровье; делятся на <b>монументы</b> и <b>экипировки</b>. Если цель экипировки покидает игру, экипировка возвращается в руку владельца.</li>
      <li><b>Заклятья</b> — обычные, длительные и быстрые.</li>
      <li><b>Знаки</b> — базовые и продвинутые; находятся только в Колоде Знаков / Зоне Знаков.</li>
    </ul>

    <h4 className="text-amber-300 font-bold mt-3">Формат эффектов</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li><b>Продолжительные</b> эффекты действуют всё время, пока источник на поле, если не указано иное.</li>
      <li><b>Активируемые</b> эффекты записываются в формате <code>{'{условие}'}[цена]: эффект</code>.</li>
      <li><b>Срабатывающие</b> эффекты — это активируемые эффекты с условием, отличным от «Быстро», «Раз в ход» и т.п.</li>
    </ul>

    <h4 className="text-amber-300 font-bold mt-3">Цепь и приоритет</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li>Цепь начинается при действии, активации эффекта или переходе между фазами.</li>
      <li>Быстрые и срабатывающие эффекты могут присоединяться как Звено 2 и выше.</li>
      <li>Когда все игроки подряд отказываются добавлять звенья, Цепь разрешается с последнего Звена к первому.</li>
      <li>Во время разрешения Цепи новые звенья добавлять нельзя.</li>
    </ul>

    <h4 className="text-amber-300 font-bold mt-3">Токены и контроль</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li><b>Токены</b> не могут покидать поле: если должны его покинуть, они исчезают.</li>
      <li>Если карта сменила контроль и потом покидает поле, она уходит в соответствующую зону <b>владельца</b>, если карта не говорит обратного.</li>
    </ul>

    <h4 className="text-amber-300 font-bold mt-3">Золотые правила</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li><b>Текст карты важнее правил</b>, если между ними есть конфликт.</li>
      <li>Если эффект нельзя выполнить полностью, он выполняется настолько, насколько возможно.</li>
      <li>Если возникает бесконечный цикл обязательных эффектов, все карты из цикла развоплощаются.</li>
    </ul>
  </>
);

/* ------------------------------------------------------------------ */
/*  About                                                              */
/* ------------------------------------------------------------------ */
const AboutContent: React.FC = () => (
  <>
    <h3 className="text-yellow-400 font-bold text-lg">🛠️ О проекте</h3>
    <p>
      <b>«Знаки — Симулятор»</b> — это браузерный virtual tabletop для игры «Знаки». Он не авторазыгрывает эффекты за игрока,
      а даёт общий стол, ручное управление картами, кристаллами, колодами, цепью и контекстными действиями.
    </p>

    <h4 className="text-cyan-400 font-bold mt-3">Что умеет текущая версия</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li>Локальная игра / соло и сетевая игра через <b>PeerJS + WebRTC</b>.</li>
      <li><b>Полная синхронизация состояния стола</b> между игроками, а не только чата.</li>
      <li>Импорт карт из Excel / CSV / ODS и из публичных Google Sheets.</li>
      <li>Конструктор колод, предпросмотр карт, журнал игры, цепь и ручное редактирование статов.</li>
      <li>Новый <b>конструктор карт</b> с загрузкой изображения, кадрированием и экспортом PNG.</li>
      <li>Пакетная генерация карт по таблице в формате базы карт.</li>
    </ul>

    <h4 className="text-cyan-400 font-bold mt-3">Архитектура</h4>
    <div className="bg-gray-800/50 rounded-lg p-3 font-mono text-xs leading-relaxed whitespace-pre">{
`src/
├─ App.tsx                 — переключение Lobby / GameBoard
├─ components/
│  ├─ Lobby.tsx            — главное меню, помощь, правила, about, вход в игру
│  ├─ GameBoard.tsx        — основной стол и панели
│  ├─ CardMakerModal.tsx   — конструктор одиночных и пакетных карточек
│  ├─ Card.tsx             — рендер игровых карт на столе
│  ├─ PlayerField.tsx      — зоны поля и наложение карт
│  ├─ CardContextMenu.tsx  — контекстные действия по ПКМ
│  └─ ...
├─ store/gameStore.ts      — единый Zustand-стор и логика игры
├─ networking/peer.ts      — подключение peer-to-peer
├─ utils/importCards.ts    — импорт базы карт
└─ types.ts                — общие типы игры`}
    </div>

    <h4 className="text-cyan-400 font-bold mt-3">Сознательные ограничения</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li>Это именно симулятор стола: спорные и сложные эффекты игроки всё ещё разрешают вручную.</li>
      <li>Пакетная генерация карт из внешних ссылок зависит от CORS-политики сайта с изображениями.</li>
      <li>Для больших пакетов браузер может попросить разрешить несколько скачиваний подряд.</li>
    </ul>

    <div className="mt-4 pt-3 border-t border-gray-700 text-xs text-gray-500 text-center">
      Знаки — Barebone Simulator · React + Vite + Tailwind + Zustand + PeerJS + SheetJS
    </div>
  </>
);

/* ------------------------------------------------------------------ */
/*  Lobby component                                                    */
/* ------------------------------------------------------------------ */
export const Lobby: React.FC<LobbyProps> = ({ onGameStart }) => {
  const [mode, setMode] = useState<'menu' | 'host' | 'join' | 'solo'>('menu');
  const [modal, setModal] = useState<'help' | 'rules' | 'about' | 'card-maker' | null>(null);
  const [peerId, setPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [playerName, setPlayerName] = useState('Игрок 1');
  const [status, setStatus] = useState('');
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  const { initPlayer, setLocalPlayerId, setRemotePlayerId, setOnSendAction, addChat, applyFullState } = useGameStore();

  const startSoloOrLocal = () => {
    const p1Id = uuidv4();
    const p2Id = uuidv4();
    setLocalPlayerId(p1Id);
    initPlayer(p1Id, playerName || 'Игрок 1');
    initPlayer(p2Id, 'Игрок 2 (Оппонент)');
    applyFullState({ currentTurnPlayerId: p1Id, priorityPlayerId: p1Id });
    onGameStart();
  };

  const startHost = async () => {
    setError('');
    setStatus('Загрузка PeerJS...');
    try {
      const id = await networkManager.init();
      setPeerId(id);
      setStatus('Ожидание подключения оппонента...');

      const p1Id = uuidv4();

      // When guest connects, the host receives the connection
      networkManager.onConnected = (remotePeerId) => {
        console.log('[Host] Guest connected, peer:', remotePeerId);
        setStatus('Оппонент подключился! Обмен данными...');
      };

      // Listen for the guest's "hello" message, then respond with "ready"
      networkManager.onMessage = (msg) => {
        console.log('[Host] Received:', msg.type);
        if (msg.type === 'chat') {
          addChat(msg.data.sender, msg.data.text);
        } else if (msg.type === 'state-sync') {
          useGameStore.getState().applyBoardState(msg.data);
        } else if ((msg as any).type === 'hello') {
          // Guest says hello — now we know data channel works both ways
          const guestName = (msg as any).data?.name || 'Гость';
          const p2Id = uuidv4();

          setLocalPlayerId(p1Id);
          setRemotePlayerId(p2Id);
          initPlayer(p1Id, playerName || 'Хост');
          initPlayer(p2Id, guestName);
          applyFullState({ currentTurnPlayerId: p1Id, priorityPlayerId: p1Id });

          setOnSendAction((action: any) => {
            networkManager.send(action);
          });

          // Send ready back to guest
          networkManager.send({
            type: 'ready',
            data: { hostId: p1Id, guestId: p2Id, hostName: playerName || 'Хост' }
          });

          setConnected(true);
          setStatus(`Подключен! (${guestName})`);
        }
      };
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения');
      setStatus('');
    }
  };

  const startJoin = async () => {
    if (!remotePeerId.trim()) return;
    setError('');
    setStatus('Загрузка PeerJS...');
    try {
      // Listen for the host's "ready" response
      networkManager.onMessage = (msg) => {
        console.log('[Guest] Received:', msg.type);
        if (msg.type === 'ready') {
          const { hostId, guestId, hostName } = msg.data;
          console.log('[Guest] Got ready! hostId:', hostId, 'guestId:', guestId);

          setLocalPlayerId(guestId);
          setRemotePlayerId(hostId);
          initPlayer(hostId, hostName || 'Хост');
          initPlayer(guestId, playerName || 'Гость');
          applyFullState({ currentTurnPlayerId: hostId, priorityPlayerId: hostId });

          setOnSendAction((action: any) => {
            networkManager.send(action);
          });

          setConnected(true);
          setStatus('Подключен к ' + (hostName || 'Хосту') + '!');
        } else if (msg.type === 'chat') {
          addChat(msg.data.sender, msg.data.text);
        } else if (msg.type === 'state-sync') {
          useGameStore.getState().applyBoardState(msg.data);
        }
      };

      setStatus('Подключение к серверу...');
      await networkManager.init();

      setStatus('Подключение к оппоненту...');
      await networkManager.connect(remotePeerId.trim());

      // Connection open! Send "hello" to host so they know we're ready to receive
      setStatus('Соединение установлено! Подтверждение...');
      networkManager.send({
        type: 'hello' as any,
        data: { name: playerName || 'Гость' }
      });
      console.log('[Guest] Sent hello to host');

    } catch (err: any) {
      setError(err.message || 'Ошибка подключения');
      setStatus('');
    }
  };

  useEffect(() => {
    return () => {};
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">
            ✦ ЗНАКИ ✦
          </h1>
          <p className="text-gray-400 text-sm">Симулятор карточной игры</p>
        </div>

        {mode === 'menu' && (
          <div className="space-y-3">
            <input
              type="text"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white text-center"
              placeholder="Ваше имя"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <button
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-3 rounded-lg font-bold text-lg transition-all"
              onClick={() => startSoloOrLocal()}
            >
              🎮 Локальная игра / Соло
            </button>
            <button
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white py-3 rounded-lg font-bold text-lg transition-all"
              onClick={() => { setMode('host'); startHost(); }}
            >
              🌐 Создать комнату (Хост)
            </button>
            <button
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white py-3 rounded-lg font-bold text-lg transition-all"
              onClick={() => setMode('join')}
            >
              🔗 Присоединиться
            </button>
            <button
              className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black py-3 rounded-lg font-bold text-lg transition-all"
              onClick={() => setModal('card-maker')}
            >
              🖼 Создать Карту
            </button>

            {/* Info buttons */}
            <div className="flex gap-2 pt-1">
              <button
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg text-sm font-semibold transition-colors border border-gray-700"
                onClick={() => setModal('help')}
              >
                ❓ Помощь
              </button>
              <button
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg text-sm font-semibold transition-colors border border-gray-700"
                onClick={() => setModal('rules')}
              >
                📜 Правила
              </button>
              <button
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg text-sm font-semibold transition-colors border border-gray-700"
                onClick={() => setModal('about')}
              >
                ℹ️ О проекте
              </button>
            </div>
          </div>
        )}

        {mode === 'host' && (
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-lg p-4 text-center space-y-2">
              <p className="text-gray-400 text-sm">{status}</p>
              {peerId && (
                <>
                  <p className="text-xs text-gray-500">Ваш ID для подключения:</p>
                  <div className="bg-gray-900 rounded-lg p-3 font-mono text-green-400 text-sm break-all select-all cursor-pointer"
                    onClick={() => navigator.clipboard.writeText(peerId)}
                    title="Нажмите, чтобы скопировать"
                  >
                    {peerId}
                  </div>
                  <p className="text-[10px] text-gray-600">Нажмите, чтобы скопировать</p>
                </>
              )}
            </div>
            {connected && (
              <button
                className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-bold text-lg"
                onClick={onGameStart}
              >
                ✅ Начать игру
              </button>
            )}
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button className="w-full text-gray-500 hover:text-gray-300 text-sm" onClick={() => setMode('menu')}>
              ← Назад
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-3">
            <input
              type="text"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white text-center font-mono"
              placeholder="ID комнаты хоста"
              value={remotePeerId}
              onChange={(e) => setRemotePeerId(e.target.value)}
            />
            <button
              className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg font-bold text-lg"
              onClick={startJoin}
            >
              🔗 Подключиться
            </button>
            {status && <p className="text-gray-400 text-sm text-center">{status}</p>}
            {connected && (
              <button
                className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-bold text-lg"
                onClick={onGameStart}
              >
                ✅ Начать игру
              </button>
            )}
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button className="w-full text-gray-500 hover:text-gray-300 text-sm" onClick={() => setMode('menu')}>
              ← Назад
            </button>
          </div>
        )}

        {/* Version info */}
        <div className="text-center text-[10px] text-gray-700">
          Знаки — Barebone Simulator v1.0
        </div>
      </div>

      {/* Modals */}
      {modal === 'help' && (
        <InfoModal title="❓ Помощь" onClose={() => setModal(null)}>
          <HelpContent />
        </InfoModal>
      )}
      {modal === 'rules' && (
        <InfoModal title="📜 Правила игры «Знаки»" onClose={() => setModal(null)}>
          <RulesContent />
        </InfoModal>
      )}
      {modal === 'about' && (
        <InfoModal title="ℹ️ О проекте" onClose={() => setModal(null)}>
          <AboutContent />
        </InfoModal>
      )}
      {modal === 'card-maker' && <CardMakerModal onClose={() => setModal(null)} />}
    </div>
  );
};
