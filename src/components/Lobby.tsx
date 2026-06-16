import React, { useState, useEffect } from 'react';
import { networkManager } from '../networking/peer';
import { useGameStore } from '../store/gameStore';
import { v4 as uuidv4 } from 'uuid';

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
    <h3 className="text-yellow-400 font-bold text-base">🎮 Как начать локальную игру</h3>
    <ol className="list-decimal list-inside space-y-1 pl-2">
      <li>Введите своё имя в поле на главном экране.</li>
      <li>Нажмите <b>«Локальная игра / Соло»</b>. Будут созданы два игрока — вы управляете обоими на одном экране.</li>
      <li>Нажмите <b>«📋 Импорт»</b> на верхней панели, чтобы загрузить карты из Excel-файла или публичной Google-таблицы.</li>
      <li>После импорта нажмите <b>«🃏 Моя Колода»</b> (или <b>«🃏 Колода Оппонента»</b>), чтобы собрать колоду из загруженных карт и начать игру.</li>
      <li>При загрузке колоды автоматически берутся 6 карт в руку и по одной карте запечатывается под каждый Кристалл Жизни.</li>
    </ol>

    <h3 className="text-green-400 font-bold text-base mt-4">🌐 Как создать мультиплеерную комнату (Хост)</h3>
    <ol className="list-decimal list-inside space-y-1 pl-2">
      <li>Введите своё имя.</li>
      <li>Нажмите <b>«Создать комнату (Хост)»</b>.</li>
      <li>Дождитесь генерации вашего уникального <b>ID комнаты</b> — он появится зелёным текстом.</li>
      <li>Скопируйте этот ID (нажмите на него) и отправьте его вашему оппоненту.</li>
      <li>Дождитесь подключения оппонента — статус сменится на <b>«Подключен!»</b>.</li>
      <li>Нажмите <b>«✅ Начать игру»</b>.</li>
    </ol>

    <h3 className="text-purple-400 font-bold text-base mt-4">🔗 Как присоединиться к игре</h3>
    <ol className="list-decimal list-inside space-y-1 pl-2">
      <li>Введите своё имя.</li>
      <li>Нажмите <b>«Присоединиться»</b>.</li>
      <li>Вставьте <b>ID комнаты</b>, который вам прислал хост.</li>
      <li>Нажмите <b>«🔗 Подключиться»</b>.</li>
      <li>Дождитесь установки соединения — статус сменится на <b>«Подключен!»</b>.</li>
      <li>Нажмите <b>«✅ Начать игру»</b>.</li>
    </ol>

    <h3 className="text-cyan-400 font-bold text-base mt-4">💡 Полезные подсказки</h3>
    <ul className="list-disc list-inside space-y-1 pl-2">
      <li><b>Правый клик</b> на любой карте открывает меню действий: перемещение, активация эффектов, изменение позиции, счётчики, передача контроля и т.д.</li>
      <li><b>Перетаскивание (Drag & Drop)</b> — перетаскивайте карты между зонами.</li>
      <li><b>Клик на Кристалл Жизни</b> — открывает панель редактирования здоровья, уничтожения и просмотра запечатанных карт.</li>
      <li><b>Цепь</b> (правая панель) — добавляйте звенья вручную или активируйте эффекты карт (они автоматически добавляются в цепь).</li>
      <li>Мультиплеер использует <b>peer-to-peer</b> соединение через WebRTC (PeerJS). Оба игрока должны иметь доступ к интернету, но трафик идёт напрямую между вами.</li>
    </ul>
  </>
);

/* ------------------------------------------------------------------ */
/*  Rules                                                              */
/* ------------------------------------------------------------------ */
const RulesContent: React.FC = () => (
  <>
    <h3 className="text-yellow-400 font-bold text-lg">📜 Правила игры «Знаки»</h3>

    <h4 className="text-amber-300 font-bold mt-2">Введение</h4>
    <p>Цель игры: довести здоровье противника (всех противников, если вы играете втроём или вчетвером) до нуля.</p>
    <p>Каждый игрок должен иметь:</p>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li><b>Основную Колоду</b> из 35–60 карт (не более 3 копий каждой карты).</li>
      <li><b>Колоду Знаков</b> из 6 карт Знаков (не более 1 копии каждого не-базового Знака).</li>
      <li>Минимум <b>6 кубиков</b> для отсчёта Кристаллов Жизни.</li>
    </ul>
    <p><b>Перед началом игры:</b> Выставите 6 кубиков шестёрками вверх (Кристаллы Жизни). Перемешайте колоду, возьмите 6 карт. Поместите по одной карте под каждый Кристалл лицом вниз (запечатанные карты).</p>

    <h4 className="text-amber-300 font-bold mt-3">Поле</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li><b>Зона Монстров</b> — до 6 монстров.</li>
      <li><b>Зона Заклятий и Артефактов</b> — до 6 карт.</li>
      <li><b>Зона Знаков</b> — до 6 Знаков.</li>
      <li><b>Основная Колода</b> и <b>Колода Знаков</b>.</li>
      <li><b>Кладбище</b> — уничтоженные/использованные карты.</li>
      <li><b>Пустота</b> — развоплощённые карты.</li>
    </ul>

    <h4 className="text-amber-300 font-bold mt-3">Ход</h4>
    <p>Ход делится на 3 фазы:</p>

    <p className="font-semibold text-gray-200 mt-1">🌅 Начало хода</p>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li>Возьмите 1 карту с верха Основной Колоды.</li>
      <li>Выставьте столько Знаков с верха Колоды Знаков в зону Знаков, сколько у вас Кристаллов Жизни (начертание).</li>
      <li>Активируйте эффекты «в начале хода».</li>
    </ul>

    <p className="font-semibold text-gray-200 mt-1">⚔️ Фаза действий</p>
    <p><b>Истощающие действия</b> (требуют истощения Знака): взятие карты, смена позиции монстра, атака, розыгрыш карты.</p>
    <p><b>Неистощающие действия:</b> активация эффектов на поле, защита, розыгрыш запечатанных карт.</p>

    <p className="font-semibold text-gray-200 mt-1">🌙 Конец хода</p>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li>Монстры и артефакты восстанавливают здоровье.</li>
      <li>Активируются эффекты «в конце хода», прекращают действие эффекты «до конца хода».</li>
      <li>Игроки с 9+ картами сбрасывают до 8.</li>
      <li>Оппонент возвращает Знаки в Колоду Знаков и перемешивает её.</li>
    </ul>

    <h4 className="text-amber-300 font-bold mt-3">Розыгрыш карт</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li>Истощите Знак соответствующего Элемента.</li>
      <li>Оплатите цену карты здоровьем (начиная с самого левого Кристалла).</li>
      <li>Поместите карту в соответствующую зону. Монстров можно разместить в атакующей или защитной позиции.</li>
    </ul>

    <h4 className="text-amber-300 font-bold mt-3">Атака и защита</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li>Истощите Знак, выберите цель (монстр, артефакт или игрок) и атакующего монстра (только в атакующей позиции).</li>
      <li>Каждый монстр атакует раз за ход. Каждая атака требует истощения Знака.</li>
      <li>Оппонент может перенаправить атаку в своих монстров в защитной позиции (защита).</li>
      <li>Урон наносится одновременно: атакующий наносит урон равный своей атаке, цель — равный своей атаке.</li>
    </ul>

    <h4 className="text-amber-300 font-bold mt-3">Кристаллы Жизни</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li>6 кубиков, каждый с максимальным здоровьем 6.</li>
      <li>Урон наносится по самому левому Кристаллу. Если здоровье падает до 0 — он разрушается, остаток переносится на следующий.</li>
      <li>При разрушении Кристалла запечатанная карта распечатывается: в руку (если от своей цены/эффекта), или можно сразу разыграть бесплатно (если от урона оппонента).</li>
      <li><b>Второе Дыхание:</b> если в начале хода у вас 1 Кристалл — выставьте все 6 Знаков и разыграйте (6 − текущие жизни) карт бесплатно. Раз за игру.</li>
    </ul>

    <h4 className="text-amber-300 font-bold mt-3">Типы карт</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li><b>Монстры</b> — имеют атаку и здоровье, могут атаковать и защищать. При здоровье ≤ 0 → кладбище.</li>
      <li><b>Артефакты</b> — монументы (свободные) и экипировки (привязываются к монстру/игроку). Имеют только здоровье.</li>
      <li><b>Заклятья</b> — обычные (ваш ход, Звено 1, затем на кладбище), длительные (остаются на поле), быстрые (в любой момент, затем на кладбище).</li>
      <li><b>Знаки</b> — базовые (6 элементов, без эффектов) и продвинутые (с эффектом). Истощаются для действий.</li>
    </ul>

    <h4 className="text-amber-300 font-bold mt-3">Элементы</h4>
    <p>☀️ Свет &nbsp; 🌑 Тьма &nbsp; 🔥 Хаос &nbsp; ❄️ Порядок &nbsp; 🌿 Жизнь &nbsp; 💀 Смерть</p>

    <h4 className="text-amber-300 font-bold mt-3">Цепь и Приоритет</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li>Каждое действие начинает Цепь. Активация — Звено Цепи 1.</li>
      <li>Только быстрые/срабатывающие эффекты могут быть Звеном 2+.</li>
      <li>Приоритет чередуется между игроками. Когда все отказываются — цепь разрешается с последнего Звена к первому.</li>
    </ul>

    <h4 className="text-amber-300 font-bold mt-3">Токены</h4>
    <p>Карта, созданная эффектом. Не может покинуть поле — исчезает вместо этого. Если является копией — получает все свойства оригинала.</p>

    <h4 className="text-amber-300 font-bold mt-3">Золотые правила</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li><b>Превосходство карты:</b> текст карты побеждает правила.</li>
      <li><b>Переполнение:</b> если эффект нельзя выполнить полностью — выполняется максимально возможно.</li>
      <li><b>Бесконечные циклы:</b> все участвующие карты развоплощаются.</li>
    </ul>

    <h4 className="text-amber-300 font-bold mt-3">Глоссарий</h4>
    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      <span className="text-yellow-300 font-semibold">Быстро</span><span>Эффект можно активировать в любой момент.</span>
      <span className="text-yellow-300 font-semibold">Пробив</span><span>Избыточный урон переносится на владельца цели.</span>
      <span className="text-yellow-300 font-semibold">Раз в ход</span><span>Эффект активируется 1 раз в ход (для каждой копии).</span>
      <span className="text-yellow-300 font-semibold">Общий раз в ход</span><span>Эффект активируется 1 раз в ход (для всех копий суммарно).</span>
      <span className="text-yellow-300 font-semibold">Обязательно</span><span>Эффект должен быть применён при первой возможности.</span>
      <span className="text-yellow-300 font-semibold">Призыв</span><span>Помещение монстра на поле.</span>
      <span className="text-yellow-300 font-semibold">Активация</span><span>Помещение заклинания или артефакта на поле.</span>
      <span className="text-yellow-300 font-semibold">Развоплотить</span><span>Поместить карту в Пустоту.</span>
      <span className="text-yellow-300 font-semibold">Соседство</span><span>Карты непосредственно слева и справа.</span>
    </div>
  </>
);

/* ------------------------------------------------------------------ */
/*  About                                                              */
/* ------------------------------------------------------------------ */
const AboutContent: React.FC = () => (
  <>
    <h3 className="text-yellow-400 font-bold text-lg">🛠️ О проекте</h3>
    <p>
      <b>«Знаки — Симулятор»</b> — это браузерный barebone-симулятор карточной игры «Знаки».
      Он не реализует правила автоматически (как, например, Untap.in или Duelingbook для своих игр), а предоставляет виртуальный стол
      с ручным управлением картами, зонами, кристаллами жизни и цепью.
    </p>

    <h4 className="text-cyan-400 font-bold mt-3">Стек технологий</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li><b>React 19</b> — UI-фреймворк.</li>
      <li><b>TypeScript</b> — строгая типизация всего кода.</li>
      <li><b>Vite 7</b> — сборщик с мгновенной горячей перезагрузкой.</li>
      <li><b>Tailwind CSS 4</b> — утилитарные CSS-классы для стилизации.</li>
      <li><b>Zustand</b> — лёгкий и быстрый менеджер состояния (вся игра хранится в одном сторе).</li>
      <li><b>PeerJS (WebRTC)</b> — peer-to-peer мультиплеер без сервера. Данные идут напрямую между браузерами.</li>
      <li><b>SheetJS (xlsx)</b> — парсинг Excel/CSV файлов и экспорт из Google Sheets для импорта карт.</li>
      <li><b>uuid</b> — генерация уникальных идентификаторов для карт и игроков.</li>
    </ul>

    <h4 className="text-cyan-400 font-bold mt-3">Архитектура</h4>
    <div className="bg-gray-800/50 rounded-lg p-3 font-mono text-xs leading-relaxed whitespace-pre">{
`src/
├─ App.tsx                 — точка входа, переключение Lobby/GameBoard
├─ types.ts                — типы TypeScript: карты, зоны, кристаллы, цепь
├─ store/
│  └─ gameStore.ts         — Zustand-стор: всё состояние игры и все действия
├─ networking/
│  └─ peer.ts              — обёртка над PeerJS для мультиплеера
├─ utils/
│  └─ importCards.ts       — парсинг таблиц (Excel, CSV, Google Sheets)
└─ components/
   ├─ Lobby.tsx            — главное меню, подключение, хост/присоединение
   ├─ GameBoard.tsx        — основной игровой экран (компоновка панелей)
   ├─ Card.tsx             — рендеринг одной карты (с изображением / без)
   ├─ CardContextMenu.tsx  — контекстное меню карты (ПКМ)
   ├─ CardPreview.tsx      — детальный превью карты при наведении
   ├─ PlayerField.tsx      — три зоны поля игрока (монстры/заклятья/знаки)
   ├─ Hand.tsx             — рука игрока
   ├─ LifeCrystals.tsx     — Кристаллы Жизни с редактированием
   ├─ ChainVisualizer.tsx  — визуализация Цепи (звенья, разрешение)
   ├─ SidePanel.tsx        — боковая панель (колоды, кладбище, пустота, токены)
   ├─ TurnControls.tsx     — управление ходами и фазами
   ├─ GameLog.tsx          — лог игры и чат
   ├─ ImportDialog.tsx     — импорт карт из файлов и Google Sheets
   └─ DeckBuilder.tsx      — сборка колоды из импортированных карт`
    }</div>

    <h4 className="text-cyan-400 font-bold mt-3">Ключевые решения</h4>
    <ul className="list-disc list-inside pl-2 space-y-1">
      <li>
        <b>Единый стор Zustand</b> — все данные игры (оба игрока, все карты, кристаллы, цепь, лог) живут в одном хранилище.
        Действия (drawCard, moveCard, activateEffect и т.д.) — чистые функции, обновляющие состояние иммутабельно.
      </li>
      <li>
        <b>Карты как шаблоны и экземпляры</b> — <code>CardTemplate</code> описывает карту из таблицы (имя, стат-блок, изображение),
        а <code>CardInstance</code> — конкретный экземпляр на поле (текущее здоровье, зона, позиция, счётчики, владелец/контролёр).
      </li>
      <li>
        <b>Изображения карт</b> — загружаются по URL из столбца <code>imgbb</code> таблицы. Если у карты есть изображение, оно рендерится
        без дополнительных рамок (т.к. изображения уже содержат оформление). Если нет — используется сгенерированный layout с цветом элемента.
      </li>
      <li>
        <b>Импорт таблиц</b> — поддерживает как загрузку файлов (xlsx/csv), так и публичные Google Sheets через CSV-экспорт.
        Парсер автоматически определяет столбцы по заголовкам и поддерживает буквенные коды элементов (A–F).
      </li>
      <li>
        <b>Мультиплеер</b> — PeerJS устанавливает WebRTC Data Channel между двумя браузерами. Хост генерирует ID, гость подключается по этому ID.
        Данные передаются напрямую, без промежуточного игрового сервера.
      </li>
      <li>
        <b>Цепь</b> — массив звеньев (ChainLink). Активация эффекта автоматически добавляет звено. Разрешение идёт с последнего к первому.
        Кнопки «Разрешить последнее» и «Разрешить всё» удаляют звенья соответственно.
      </li>
    </ul>

    <h4 className="text-cyan-400 font-bold mt-3">Ограничения</h4>
    <ul className="list-disc list-inside pl-2 space-y-0.5">
      <li>Эффекты карт не выполняются автоматически — игроки применяют их вручную, как в Untap.in.</li>
      <li>Мультиплеер в текущей версии синхронизирует только чат; действия выполняются локально (каждый игрок управляет своим столом).</li>
      <li>Нет AI-противника — только PvP (локально или по сети).</li>
    </ul>

    <div className="mt-4 pt-3 border-t border-gray-700 text-xs text-gray-500 text-center">
      Знаки — Barebone Simulator v1.0 · Built with React + Vite + Tailwind + Zustand + PeerJS
    </div>
  </>
);

/* ------------------------------------------------------------------ */
/*  Lobby component                                                    */
/* ------------------------------------------------------------------ */
export const Lobby: React.FC<LobbyProps> = ({ onGameStart }) => {
  const [mode, setMode] = useState<'menu' | 'host' | 'join' | 'solo'>('menu');
  const [modal, setModal] = useState<'help' | 'rules' | 'about' | null>(null);
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
    setStatus('Инициализация...');
    try {
      const id = await networkManager.init();
      setPeerId(id);
      setStatus('Ожидание подключения оппонента...');

      networkManager.onConnected = (remoteId) => {
        const p1Id = uuidv4();
        const p2Id = remoteId;
        setLocalPlayerId(p1Id);
        setRemotePlayerId(p2Id);
        initPlayer(p1Id, playerName || 'Хост');
        initPlayer(p2Id, 'Оппонент');
        applyFullState({ currentTurnPlayerId: p1Id, priorityPlayerId: p1Id });

        networkManager.send({
          type: 'ready',
          data: { hostId: p1Id, guestId: p2Id, hostName: playerName || 'Хост' }
        });

        setOnSendAction((action: any) => {
          networkManager.send({ type: 'action', data: action });
        });

        setConnected(true);
        setStatus('Подключен!');
      };

      networkManager.onMessage = (msg) => {
        if (msg.type === 'chat') {
          addChat(msg.data.sender, msg.data.text);
        } else if (msg.type === 'action') {
          handleRemoteAction(msg.data);
        }
      };
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения');
    }
  };

  const startJoin = async () => {
    if (!remotePeerId) return;
    setError('');
    setStatus('Подключение...');
    try {
      await networkManager.init();
      await networkManager.connect(remotePeerId);

      networkManager.onMessage = (msg) => {
        if (msg.type === 'ready') {
          const { hostId, guestId, hostName } = msg.data;
          setLocalPlayerId(guestId);
          setRemotePlayerId(hostId);
          initPlayer(hostId, hostName || 'Хост');
          initPlayer(guestId, playerName || 'Гость');
          applyFullState({ currentTurnPlayerId: hostId, priorityPlayerId: hostId });

          setOnSendAction((action: any) => {
            networkManager.send({ type: 'action', data: action });
          });

          setConnected(true);
          setStatus('Подключен!');
        } else if (msg.type === 'chat') {
          addChat(msg.data.sender, msg.data.text);
        } else if (msg.type === 'action') {
          handleRemoteAction(msg.data);
        }
      };
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения');
    }
  };

  const handleRemoteAction = (_action: any) => {
    // In a full implementation, would apply the remote action to the store
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
    </div>
  );
};
