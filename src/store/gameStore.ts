import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  GameState, PlayerState, CardInstance, CardTemplate, Zone,
  LifeCrystal, ChainLink, MonsterPosition
} from '../types';

/**
 * GameStore Interface
 */
interface GameStore extends GameState {
  localPlayerId: string;
  remotePlayerId: string | null;
  cardTemplates: CardTemplate[];
  selectedCardId: string | null;
  hoveredCardId: string | null;
  contextMenuCardId: string | null;
  contextMenuPosition: { x: number; y: number } | null;
  chatMessages: { sender: string; text: string }[];
  onSendAction: ((action: any) => void) | null;
  isRemoteAction: boolean;
  gameStatus: 'playing' | 'conceded' | 'tie-proposed' | 'ended';
  combatState: {
    mode: 'idle' | 'attacking' | 'defending';
    attackerId: string | null;
    targetId: string | null; // Can be cardInstanceId or playerId
    defenderIds: string[];
  };
  resolutionPending: {
    type: 'link' | 'all';
    confirmedBy: string[];
  } | null;

  setLocalPlayerId: (id: string) => void;
  setRemotePlayerId: (id: string | null) => void;
  setOnSendAction: (fn: ((action: any) => void) | null) => void;
  setRemoteAction: (val: boolean) => void;
  setGameStatus: (status: GameStore['gameStatus']) => void;
  setCombatMode: (mode: GameStore['combatState']['mode']) => void;
  setCombatAttacker: (id: string | null) => void;
  setCombatTarget: (id: string | null) => void;
  addCombatTarget: (id: string) => void;
  removeCombatTarget: (id: string) => void;
  addCombatDefender: (id: string) => void;
  removeCombatDefender: (id: string) => void;
  clearCombatState: () => void;
  confirmResolution: (playerId: string) => void;
  cancelResolution: () => void;


  initPlayer: (id: string, name: string) => void;
  importCardTemplates: (templates: CardTemplate[]) => void;

  loadDeck: (playerId: string, templateIds: string[], isSignDeck: boolean, clearAll?: boolean) => void;
  shuffleDeck: (playerId: string, isSignDeck: boolean) => void;

  drawCard: (playerId: string) => void;
  moveCard: (cardInstanceId: string, toZone: Zone, faceDown?: boolean) => void;
  moveCardToPlayer: (cardInstanceId: string, toPlayerId: string, toZone: Zone) => void;
  changePosition: (cardInstanceId: string, position: MonsterPosition) => void;
  flipCard: (cardInstanceId: string) => void;
  selectCard: (cardInstanceId: string | null) => void;
  hoverCard: (cardInstanceId: string | null) => void;

  setCrystalHealth: (playerId: string, crystalIndex: number, health: number) => void;
  destroyCrystal: (playerId: string, crystalIndex: number) => void;
  addCrystal: (playerId: string) => void;
  removeCrystal: (playerId: string, crystalIndex: number) => void;

  addCounter: (cardInstanceId: string, counterName: string, amount: number) => void;
  removeCounter: (cardInstanceId: string, counterName: string, amount: number) => void;
  setCounter: (cardInstanceId: string, counterName: string, amount: number) => void;

  createToken: (playerId: string, zone: Zone, template: Partial<CardTemplate>) => void;
  removeToken: (cardInstanceId: string) => void;

  exhaustSign: (cardInstanceId: string) => void;
  restoreSign: (cardInstanceId: string) => void;
  inscribeSigns: (playerId: string, count: number) => void;
  returnSigns: (playerId: string) => void;

  addChainLink: (link: Omit<ChainLink, 'linkNumber' | 'resolved'>) => void;
  resolveLastLink: () => void;
  resolveChain: () => void;
  clearChain: () => void;

  setPhase: (phase: 'start' | 'action' | 'end') => void;
  nextTurn: () => void;
  passPriority: () => void;

  sealCard: (cardInstanceId: string, crystalIndex: number, playerId: string) => void;
  unsealCard: (cardInstanceId: string) => void;

  setAttacked: (cardInstanceId: string, val: boolean) => void;
  setDefended: (cardInstanceId: string, val: boolean) => void;

  setCardAttack: (cardInstanceId: string, attack: number) => void;
  setCardHealth: (cardInstanceId: string, health: number) => void;

  giveControl: (cardInstanceId: string, newControllerId: string) => void;

  applyFullState: (state: Partial<GameStore>) => void;
  addLog: (msg: string) => void;
  addChat: (sender: string, text: string) => void;

  openContextMenu: (cardId: string, x: number, y: number) => void;
  closeContextMenu: () => void;

  getPlayerCards: (playerId: string, zone: Zone) => CardInstance[];
  getCard: (instanceId: string) => CardInstance | undefined;

  activateEffect: (cardInstanceId: string) => void;

  executeAction: (actionType: string, payload: any) => void;
  concede: (playerId: string) => void;
  proposeTie: (playerId: string) => void;
  resetGame: () => void;
  
  syncBoardState: () => void;
  applyBoardState: (state: any) => void;
}

function findCard(players: Record<string, PlayerState>, instanceId: string): { card: CardInstance; playerId: string } | null {
  for (const [pid, p] of Object.entries(players)) {
    const c = p.cards.find(c => c.instanceId === instanceId);
    if (c) return { card: c, playerId: pid };
  }
  return null;
}

function updateCard(players: Record<string, PlayerState>, instanceId: string, updater: (c: CardInstance) => CardInstance): Record<string, PlayerState> {
  const newPlayers = { ...players };
  for (const pid of Object.keys(newPlayers)) {
    const idx = newPlayers[pid].cards.findIndex(c => c.instanceId === instanceId);
    if (idx !== -1) {
      newPlayers[pid] = {
        ...newPlayers[pid],
        cards: newPlayers[pid].cards.map(c => c.instanceId === instanceId ? updater({ ...c }) : c)
      };
      return newPlayers;
    }
  }
  return newPlayers;
}

const initialCrystals = (): LifeCrystal[] =>
  Array.from({ length: 6 }, () => ({
    currentHealth: 6,
    maxHealth: 6,
    sealedCardIds: [],
    destroyed: false
  }));

const zoneLabel = (z: Zone) => {
  const names: Record<Zone, string> = {
    hand: 'Руку', monsterZone: 'Зону Монстров', spellArtifactZone: 'Зону Заклятий',
    signZone: 'Зону Знаков', mainDeck: 'Колоду', signDeck: 'Колоду Знаков',
    graveyard: 'Кладбище', void: 'Пустоту', sealed: 'Запечатанные', removed: 'Удалено'
  };
  return names[z] || z;
};

export const useGameStore = create<GameStore>((set, get) => ({
  players: {},
  currentTurnPlayerId: '',
  phase: 'start',
  turnNumber: 1,
  chain: [],
  chainActive: false,
  priorityPlayerId: '',
  firstTurn: true,
  log: [],
  localPlayerId: '',
  remotePlayerId: null,
  cardTemplates: [],
  selectedCardId: null,
  hoveredCardId: null,
  contextMenuCardId: null,
  contextMenuPosition: null,
  chatMessages: [],
  onSendAction: null,
  isRemoteAction: false,
  gameStatus: 'playing',
  combatState: {
    mode: 'idle',
    attackerId: null,
    targetIds: [],
    defenderIds: [],
  },


  resolutionPending: null,

  setLocalPlayerId: (id) => set({ localPlayerId: id }),
  setRemotePlayerId: (id) => set({ remotePlayerId: id }),
  setOnSendAction: (fn) => set({ onSendAction: fn }),
  setRemoteAction: (val) => set({ isRemoteAction: val }),
  setGameStatus: (status) => {
    set({ gameStatus: status });
    if (!get().isRemoteAction) get().syncBoardState();
  },
  setCombatMode: (mode) => {
    set({ combatState: { ...get().combatState, mode } });
    if (!get().isRemoteAction) get().syncBoardState();
  },
  setCombatAttacker: (id) => {
    set({ combatState: { ...get().combatState, attackerId: id } });
    if (!get().isRemoteAction) get().syncBoardState();
  },
  addCombatTarget: (id) => {
    set(state => {
      const currentTargets = state.combatState.targetIds || [];
      if (currentTargets.includes(id)) return state;
      return { combatState: { ...state.combatState, targetIds: [...currentTargets, id] } };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },
  removeCombatTarget: (id) => {
    set(state => {
      const currentTargets = state.combatState.targetIds || [];
      return { combatState: { ...state.combatState, targetIds: currentTargets.filter(tid => tid !== id) } };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },
  addCombatDefender: (id) => {
    set(state => {
      const currentDefenders = state.combatState.defenderIds || [];
      if (currentDefenders.includes(id)) return state;
      return { combatState: { ...state.combatState, defenderIds: [...currentDefenders, id] } };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },
  removeCombatDefender: (id) => {
    set(state => {
      const currentDefenders = state.combatState.defenderIds || [];
      return { combatState: { ...state.combatState, defenderIds: currentDefenders.filter(did => did !== id) } };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },
  clearCombatState: () => {
    set({ combatState: { mode: 'idle', attackerId: null, targetIds: [], defenderIds: [] } });
    if (!get().isRemoteAction) get().syncBoardState();
  },


  confirmResolution: (playerId) => {
    set(state => {
      if (!state.resolutionPending) return state;
      const confirmedBy = [...(state.resolutionPending.confirmedBy || []), playerId];
      const uniqueConfirmed = Array.from(new Set(confirmedBy));
      
      if (uniqueConfirmed.length >= 2) {
        // Both players confirmed! Resolve the chain.
        let { chain, log } = state;
        if (state.resolutionPending.type === 'link') {
          const lastUnresolved = [...chain].reverse().find(l => !l.resolved);
          if (lastUnresolved) {
            chain = chain.map(l =>
              l.linkNumber === lastUnresolved.linkNumber ? { ...l, resolved: true } : l
            );
            log = [...log, `✓ Разрешено Звено ${lastUnresolved.linkNumber}: ${lastUnresolved.description}`];
          }
        } else {
          const descriptions = [...chain].reverse().map(l => `  ${l.linkNumber}. ${l.description}`).join('\n');
          chain = [];
          log = [...log, `✓ Цепь разрешена (${state.chain.length} звеньев):\n${descriptions}`];
        }
        
        const allResolved = chain.every(l => l.resolved);
        return {
          resolutionPending: null,
          chain: allResolved ? [] : chain,
          chainActive: !allResolved,
          log: log
        };
      }
      return { resolutionPending: { ...state.resolutionPending, confirmedBy: uniqueConfirmed } };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },
  cancelResolution: () => {
    set({ resolutionPending: null });
    if (!get().isRemoteAction) get().syncBoardState();
  },


  executeAction: (type, payload) => {
    const onSend = get().onSendAction;
    const isRemote = get().isRemoteAction;
    setRemoteAction(true);
    if (typeof get()[type] === 'function' && type !== 'executeAction') {
      const args = payload && typeof payload === 'object' ? Object.values(payload) : [payload];
      (get()[type] as any)(...args);
    }
    setRemoteAction(false);
    if (!isRemote) {
      get().syncBoardState();
    }
  },

  concede: (playerId) => {
    const player = get().players[playerId];
    const name = player?.name || 'Игрок';
    set({ gameStatus: 'conceded' });
    get().addLog(`🏳️ ${name} сдался!`);
    if (!get().isRemoteAction) get().syncBoardState();
  },

  proposeTie: (playerId) => {
    const player = get().players[playerId];
    const name = player?.name || 'Игрок';
    set({ gameStatus: 'tie-proposed' });
    get().addLog(`🤝 ${name} предложил ничью`);
    if (!get().isRemoteAction) get().syncBoardState();
  },

  resetGame: () => {
    const { players, localPlayerId, remotePlayerId } = get();
    const newPlayers = { ...players };
    for (const pid of Object.keys(newPlayers)) {
      newPlayers[pid] = {
        ...newPlayers[pid],
        cards: [],
        crystals: initialCrystals(),
        secondBreathUsed: false
      };
    }
    set({
      players: newPlayers,
      currentTurnPlayerId: localPlayerId,
      priorityPlayerId: localPlayerId,
      phase: 'start',
      turnNumber: 1,
      chain: [],
      chainActive: false,
      firstTurn: true,
      log: ['Игра сброшена и начата заново'],
      gameStatus: 'playing'
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  initPlayer: (id, name) => set(state => ({
    players: {
      ...state.players,
      [id]: {
        id,
        name,
        crystals: initialCrystals(),
        secondBreathUsed: false,
        cards: []
      }
    },
    currentTurnPlayerId: state.currentTurnPlayerId || id,
    priorityPlayerId: state.priorityPlayerId || id
  })),

  importCardTemplates: (templates) => set(state => ({
    cardTemplates: [...state.cardTemplates, ...templates.filter(t => !state.cardTemplates.find(e => e.id === t.id))]
  })),

  loadDeck: (playerId, templateIds, isSignDeck, clearAll = false) => set(state => {
    const player = state.players[playerId];
    if (!player) return state;
    
    let currentCards = player.cards;
    if (clearAll) {
      currentCards = [];
    } else {
      const zone: Zone = isSignDeck ? 'signDeck' : 'mainDeck';
      currentCards = player.cards.filter(c => c.zone !== zone);
    }

    const zone: Zone = isSignDeck ? 'signDeck' : 'mainDeck';
    const newCards: CardInstance[] = templateIds.map((tid, i) => {
      const tmpl = state.cardTemplates.find(t => t.id === tid);
      if (!tmpl) return null;
      return {
        instanceId: uuidv4(),
        templateId: tid,
        template: tmpl,
        zone,
        faceDown: true,
        exhausted: false,
        currentHealth: tmpl.health,
        currentAttack: tmpl.attack,
        counters: {},
        isToken: false,
        ownerId: playerId,
        controllerId: playerId,
        attackedThisTurn: false,
        defendedThisTurn: false,
        order: i
      } as CardInstance;
    }).filter(Boolean) as CardInstance[];
    
    return {
      players: { ...state.players, [playerId]: { ...player, cards: [...currentCards, ...newCards] } }
    };
  }),

  shuffleDeck: (playerId, isSignDeck) => {
    set(state => {
      const player = state.players[playerId];
      if (!player) return state;
      const zone: Zone = isSignDeck ? 'signDeck' : 'mainDeck';
      const deckCards = [...player.cards.filter(c => c.zone === zone)];
      const otherCards = player.cards.filter(c => c.zone !== zone);
      for (let i = deckCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deckCards[i], deckCards[j]] = [deckCards[j], deckCards[i]];
      }
      deckCards.forEach((c, i) => c.order = i);
      return {
        players: { ...state.players, [playerId]: { ...player, cards: [...otherCards, ...deckCards] } },
        log: [...state.log, `${player.name} перемешал ${isSignDeck ? 'Колоду Знаков' : 'Основную Колоду'}`]
      };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  drawCard: (playerId) => {
    set(state => {
      const player = state.players[playerId];
      if (!player) return state;
      const deckCards = player.cards.filter(c => c.zone === 'mainDeck').sort((a, b) => a.order - b.order);
      if (deckCards.length === 0) return state;
      const topCard = deckCards[0];
      const maxOrder = Math.max(0, ...player.cards.filter(c => c.zone === 'hand').map(c => c.order));
      return {
        players: {
          ...state.players,
          [playerId]: {
            ...player,
            cards: player.cards.map(c =>
              c.instanceId === topCard.instanceId
                ? { ...c, zone: 'hand' as Zone, faceDown: false, order: maxOrder + 1 }
                : c
            )
          }
        },
        log: [...state.log, `${player.name} взял карту`]
      };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  moveCard: (cardInstanceId, toZone, faceDown) => {
    set(state => {
      const found = findCard(state.players, cardInstanceId);
      if (!found) return state;
      const { card, playerId } = found;
      const player = state.players[playerId];
      const maxOrder = Math.max(0, ...player.cards.filter(c => c.zone === toZone).map(c => c.order));
      let crystals = player.crystals;
      if (card.zone === 'sealed' && card.sealedUnderCrystal !== undefined) {
        crystals = crystals.map((cr, i) =>
          i === card.sealedUnderCrystal
            ? { ...cr, sealedCardIds: cr.sealedCardIds.filter(id => id !== cardInstanceId) }
            : cr
        );
      }
      return {
        players: {
          ...state.players,
          [playerId]: {
            ...player,
            crystals,
            cards: player.cards.map(c =>
              c.instanceId === cardInstanceId
                ? {
                  ...c,
                  zone: toZone,
                  faceDown: faceDown !== undefined ? faceDown : (toZone === 'mainDeck' || toZone === 'signDeck'),
                  order: maxOrder + 1,
                  exhausted: toZone === 'signZone' ? c.exhausted : false,
                  sealedUnderCrystal: undefined
                }
                : c
            )
          }
        },
        log: [...state.log, `${player.name}: ${card.template.name || 'Карта'} → ${zoneLabel(toZone)}`]
      };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  moveCardToPlayer: (cardInstanceId, toPlayerId, toZone) => {
    set(state => {
      const found = findCard(state.players, cardInstanceId);
      if (!found) return state;
      const { card, playerId: fromPlayerId } = found;
      if (fromPlayerId === toPlayerId) {
        return get().moveCard(cardInstanceId, toZone) as any || state;
      }
      const fromPlayer = state.players[fromPlayerId];
      const toPlayer = state.players[toPlayerId];
      if (!fromPlayer || !toPlayer) return state;
      let fromCrystals = fromPlayer.crystals;
      if (card.zone === 'sealed' && card.sealedUnderCrystal !== undefined) {
        fromCrystals = fromCrystals.map((cr, i) =>
          i === card.sealedUnderCrystal
            ? { ...cr, sealedCardIds: cr.sealedCardIds.filter(id => id !== cardInstanceId) }
            : cr
        );
      }
      const maxOrder = Math.max(0, ...toPlayer.cards.filter(c => c.zone === toZone).map(c => c.order));
      const movedCard: CardInstance = {
        ...card,
        zone: toZone,
        controllerId: toPlayerId,
        faceDown: toZone === 'mainDeck' || toZone === 'signDeck',
        order: maxOrder + 1,
        exhausted: false,
        sealedUnderCrystal: undefined
      };
      return {
        players: {
          ...state.players,
          [fromPlayerId]: {
            ...fromPlayer,
            crystals: fromCrystals,
            cards: fromPlayer.cards.filter(c => c.instanceId !== cardInstanceId)
          },
          [toPlayerId]: {
            ...toPlayer,
            cards: [...toPlayer.cards, movedCard]
          }
        },
        log: [...state.log, `${card.template.name || 'Карта'}: контроль → ${toPlayer.name}`]
      };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  changePosition: (cardInstanceId, position) => set(state => ({
    players: updateCard(state.players, cardInstanceId, c => ({ ...c, position })),
    log: [...state.log, `Монстр сменил позицию: ${position === 'attack' ? 'Атакующая' : 'Защитная'}`]
  })),

  flipCard: (cardInstanceId) => set(state => ({
    players: updateCard(state.players, cardInstanceId, c => ({ ...c, faceDown: !c.faceDown }))
  })),

  selectCard: (cardInstanceId) => set({ selectedCardId: cardInstanceId }),
  hoverCard: (cardInstanceId) => set({ hoveredCardId: cardInstanceId }),

  setCrystalHealth: (playerId, crystalIndex, health) => {
    set(state => {
      const player = state.players[playerId];
      if (!player || !player.crystals[crystalIndex]) return state;
      const crystals = [...player.crystals];
      crystals[crystalIndex] = { ...crystals[crystalIndex], currentHealth: Math.max(0, Math.min(health, 6)) };
      return {
        players: { ...state.players, [playerId]: { ...player, crystals } },
        log: [...state.log, `${player.name}: Кристалл ${crystalIndex + 1} → ${health} HP`]
      };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  destroyCrystal: (playerId, crystalIndex) => {
    set(state => {
      const player = state.players[playerId];
      if (!player || !player.crystals[crystalIndex]) return state;
      const crystal = player.crystals[crystalIndex];

      let cards = player.cards;
      const logEntries = [`${player.name}: Кристалл ${crystalIndex + 1} уничтожен!`];
      
      if (crystal.sealedCardIds.length > 0) {
        let maxOrder = Math.max(0, ...cards.filter(c => c.zone === 'hand').map(c => c.order));
        cards = cards.map(c => {
          if (crystal.sealedCardIds.includes(c.instanceId)) {
            maxOrder++;
            logEntries.push(`  📜 Распечатана: ${c.template.name || 'Карта'}`);
            return { ...c, zone: 'hand' as Zone, faceDown: false, sealedUnderCrystal: undefined, order: maxOrder };
          }
          return c;
        });
      }

      const crystals = player.crystals.filter((_, i) => i !== crystalIndex);
      const updatedCards = cards.map(c => {
        if (c.sealedUnderCrystal !== undefined && c.sealedUnderCrystal > crystalIndex) {
          return { ...c, sealedUnderCrystal: c.sealedUnderCrystal - 1 };
        }
        return c;
      });

      return {
        players: { ...state.players, [playerId]: { ...player, crystals, cards: updatedCards } },
        log: [...state.log, ...logEntries]
      };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  addCrystal: (playerId) => {
    set(state => {
      const player = state.players[playerId];
      if (!player) return state;
      const activeCrystals = player.crystals.filter(c => !c.destroyed).length;
      if (activeCrystals >= 6) return state;
      const crystals: LifeCrystal[] = [...player.crystals, { currentHealth: 6, maxHealth: 6, sealedCardIds: [], destroyed: false }];
      return {
        players: { ...state.players, [playerId]: { ...player, crystals } },
        log: [...state.log, `${player.name}: Добавлен Кристалл Жизни`]
      };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  removeCrystal: (playerId, crystalIndex) => {
    set(state => {
      const player = state.players[playerId];
      if (!player || !player.crystals[crystalIndex]) return state;
      const crystal = player.crystals[crystalIndex];
      let cards = player.cards;
      if (crystal.sealedCardIds.length > 0) {
        const maxOrder = Math.max(0, ...cards.filter(c => c.zone === 'hand').map(c => c.order));
        let ord = maxOrder;
        cards = cards.map(c => {
          if (crystal.sealedCardIds.includes(c.instanceId)) {
            ord++;
            return { ...c, zone: 'hand' as Zone, faceDown: false, sealedUnderCrystal: undefined, order: ord };
          }
          return c;
        });
      }
      const crystals = player.crystals.filter((_, i) => i !== crystalIndex);
      const updatedCards = cards.map(c => {
        if (c.sealedUnderCrystal !== undefined && c.sealedUnderCrystal > crystalIndex) {
          return { ...c, sealedUnderCrystal: c.sealedUnderCrystal - 1 };
        }
        return c;
      });
      return {
        players: { ...state.players, [playerId]: { ...player, crystals, cards: updatedCards } },
        log: [...state.log, `${player.name}: Удален Кристалл Жизни ${crystalIndex + 1}`]
      };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  addCounter: (cardInstanceId, counterName, amount) => set(state => ({
    players: updateCard(state.players, cardInstanceId, c => ({
      ...c,
      counters: { ...c.counters, [counterName]: (c.counters[counterName] || 0) + amount }
    }))
  })),

  removeCounter: (cardInstanceId, counterName, amount) => set(state => ({
    players: updateCard(state.players, cardInstanceId, c => {
      const newVal = Math.max(0, (c.counters[counterName] || 0) - amount);
      const counters = { ...c.counters };
      if (newVal <= 0) delete counters[counterName];
      else counters[counterName] = newVal;
      return { ...c, counters };
    })
  })),

  setCounter: (cardInstanceId, counterName, amount) => set(state => ({
    players: updateCard(state.players, cardInstanceId, c => {
      const counters = { ...c.counters };
      if (amount <= 0) delete counters[counterName];
      else counters[counterName] = amount;
      return { ...c, counters };
    })
  })),

  createToken: (playerId, zone, template) => set(state => {
    const player = state.players[playerId];
    if (!player) return state;
    const fullTemplate: CardTemplate = {
      id: uuidv4(),
      name: template.name || 'Токен',
      type: template.type || 'monster',
      cost: template.cost || 0,
      element: template.element || 'Нет',
      attack: template.attack,
      health: template.health,
      maxHealth: template.health,
      effectText: template.effectText || '',
      imageUrl: template.imageUrl || '',
      ...template
    };
    const maxOrder = Math.max(0, ...player.cards.filter(c => c.zone === zone).map(c => c.order));
    const token: CardInstance = {
      instanceId: uuidv4(),
      templateId: fullTemplate.id,
      template: fullTemplate,
      zone,
      faceDown: false,
      exhausted: false,
      currentHealth: fullTemplate.health,
      currentAttack: fullTemplate.attack,
      counters: {},
      isToken: true,
      ownerId: playerId,
      controllerId: playerId,
      attackedThisTurn: false,
      defendedThisTurn: false,
      order: maxOrder + 1
    };
    return {
      players: { ...state.players, [playerId]: { ...player, cards: [...player.cards, token] } },
      log: [...state.log, `${player.name} создал токен: ${fullTemplate.name}`]
    };
  }),

  removeToken: (cardInstanceId) => set(state => {
    const found = findCard(state.players, cardInstanceId);
    if (!found) return state;
    const { playerId } = found;
    const player = state.players[playerId];
    return {
      players: { ...state.players, [playerId]: { ...player, cards: player.cards.filter(c => c.instanceId !== cardInstanceId) } },
      log: [...state.log, `Токен удалён`]
    };
  }),

  exhaustSign: (cardInstanceId) => set(state => ({
    players: updateCard(state.players, cardInstanceId, c => ({ ...c, exhausted: true })),
    log: [...state.log, `Знак истощён`]
  })),

  restoreSign: (cardInstanceId) => set(state => ({
    players: updateCard(state.players, cardInstanceId, c => ({ ...c, exhausted: false })),
    log: [...state.log, `Знак восстановлен`]
  })),

  inscribeSigns: (playerId, count) => {
    set(state => {
      const player = state.players[playerId];
      if (!player) return state;
      const signDeckCards = player.cards.filter(c => c.zone === 'signDeck').sort((a, b) => a.order - b.order);
      const toInscribe = signDeckCards.slice(0, count);
      let order = Math.max(0, ...player.cards.filter(c => c.zone === 'signZone').map(c => c.order));
      return {
        players: {
          ...state.players,
          [playerId]: {
            ...player,
            cards: player.cards.map(c => {
              if (toInscribe.find(ti => ti.instanceId === c.instanceId)) {
                order++;
                return { ...c, zone: 'signZone' as Zone, faceDown: false, exhausted: false, order };
              }
              return c;
            })
          }
        },
        log: [...state.log, `${player.name} начертал ${toInscribe.length} Знак(ов)`]
      };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  returnSigns: (playerId) => {
    set(state => {
      const player = state.players[playerId];
      if (!player) return state;
      const updatedCards = player.cards.map(c => {
        if (c.zone === 'signZone') {
          return { ...c, zone: 'signDeck' as Zone, faceDown: true, exhausted: false };
        }
        return c;
      });
      const signDeckCards = updatedCards.filter(c => c.zone === 'signDeck');
      const otherCards = updatedCards.filter(c => c.zone !== 'signDeck');
      for (let i = signDeckCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [signDeckCards[i], signDeckCards[j]] = [signDeckCards[j], signDeckCards[i]];
      }
      signDeckCards.forEach((c, i) => c.order = i);
      return {
        players: {
          ...state.players,
          [playerId]: {
            ...player,
            cards: [...otherCards, ...signDeckCards]
          }
        },
        log: [...state.log, `${player.name} вернул Знаки в Колоду и перемешал её`]
      };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  addChainLink: (link) => {
    set(state => ({
      chain: [...state.chain, { ...link, linkNumber: state.chain.length + 1, resolved: false }],
      chainActive: true,
      log: [...state.log, `⛓ Звено ${state.chain.length + 1}: ${link.description}`]
    }));
    if (!get().isRemoteAction) get().syncBoardState();
  },

  resolveLastLink: () => {
    set(state => {
      if (state.chain.length === 0) return state;
      return {
        resolutionPending: { type: 'link', confirmedBy: [] }
      };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  resolveChain: () => {
    set(state => {
      if (state.chain.length === 0) return state;
      return {
        resolutionPending: { type: 'all', confirmedBy: [] }
      };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  clearChain: () => {
    set({ chain: [], chainActive: false });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  setPhase: (phase) => {
    set(state => ({
      phase,
      log: [...state.log, `Фаза: ${phase === 'start' ? 'Начало хода' : phase === 'action' ? 'Фаза Действий' : 'Конец хода'}`]
    }));
    if (!get().isRemoteAction) {
      get().syncBoardState();
    }
  },

  nextTurn: () => {
    set(state => {
      const playerIds = Object.keys(state.players);
      const currentIdx = playerIds.indexOf(state.currentTurnPlayerId);
      const nextIdx = (currentIdx + 1) % playerIds.length;
      const nextPlayerId = playerIds[nextIdx];
      return {
        currentTurnPlayerId: nextPlayerId,
        priorityPlayerId: nextPlayerId,
        phase: 'start' as const,
        turnNumber: state.turnNumber + 1,
        firstTurn: false,
        // Chain is no longer automatically cleared here
        log: [...state.log, `--- Ход ${state.turnNumber + 1}: ${state.players[nextPlayerId]?.name || nextPlayerId} ---`]
      };
    });
    if (!get().isRemoteAction) {
      get().syncBoardState();
    }
  },

  passPriority: () => set(state => {
    const playerIds = Object.keys(state.players);
    const currentIdx = playerIds.indexOf(state.priorityPlayerId);
    const nextIdx = (currentIdx + 1) % playerIds.length;
    return { priorityPlayerId: playerIds[nextIdx] };
  }),

  sealCard: (cardInstanceId, crystalIndex, playerId) => {
    set(state => {
      const player = state.players[playerId];
      if (!player || !player.crystals[crystalIndex] || player.crystals[crystalIndex].destroyed) return state;
      const crystals = player.crystals.map((cr, i) =>
        i === crystalIndex
          ? { ...cr, sealedCardIds: [...cr.sealedCardIds, cardInstanceId] }
          : cr
      );
      return {
        players: {
          ...state.players,
          [playerId]: {
            ...player,
            crystals,
            cards: player.cards.map(c =>
              c.instanceId === cardInstanceId
                ? { ...c, zone: 'sealed' as Zone, faceDown: true, sealedUnderCrystal: crystalIndex }
                : c
            )
          }
        },
        log: [...state.log, `Карта запечатана под Кристалл ${crystalIndex + 1}`]
      };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  unsealCard: (cardInstanceId) => {
    set(state => {
      const found = findCard(state.players, cardInstanceId);
      if (!found) return state;
      const { card, playerId } = found;
      const player = state.players[playerId];
      const maxOrder = Math.max(0, ...player.cards.filter(c => c.zone === 'hand').map(c => c.order));
      const crystals = player.crystals.map(cr => ({
        ...cr,
        sealedCardIds: cr.sealedCardIds.filter(id => id !== cardInstanceId)
      }));
      return {
        players: {
          ...state.players,
          [playerId]: {
            ...player,
            crystals,
            cards: player.cards.map(c =>
              c.instanceId === cardInstanceId
                ? { ...c, zone: 'hand' as Zone, faceDown: false, sealedUnderCrystal: undefined, order: maxOrder + 1 }
                : c
            )
          }
        },
        log: [...state.log, `Карта распечатана: ${card.template.name || 'Карта'}`]
      };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  setAttacked: (cardInstanceId, val) => set(state => ({
    players: updateCard(state.players, cardInstanceId, c => ({ ...c, attackedThisTurn: val }))
  })),

  setDefended: (cardInstanceId, val) => set(state => ({
    players: updateCard(state.players, cardInstanceId, c => ({ ...c, defendedThisTurn: val }))
  })),

  setCardAttack: (cardInstanceId, attack) => set(state => ({
    players: updateCard(state.players, cardInstanceId, c => ({ ...c, currentAttack: attack }))
  })),

  setCardHealth: (cardInstanceId, health) => set(state => ({
    players: updateCard(state.players, cardInstanceId, c => ({ ...c, currentHealth: health }))
  })),

  giveControl: (cardInstanceId, newControllerId) => set(state => {
    const found = findCard(state.players, cardInstanceId);
    if (!found) return state;
    const { card, playerId: currentControllerId } = found;
    if (currentControllerId === newControllerId) return state;

    const fromPlayer = state.players[currentControllerId];
    const toPlayer = state.players[newControllerId];
    if (!fromPlayer || !toPlayer) return state;

    const movedCard: CardInstance = {
      ...card,
      controllerId: newControllerId,
      order: Math.max(0, ...toPlayer.cards.filter(c => c.zone === card.zone).map(c => c.order)) + 1
    };

    return {
      players: {
        ...state.players,
        [currentControllerId]: {
          ...fromPlayer,
          cards: fromPlayer.cards.filter(c => c.instanceId !== cardInstanceId)
        },
        [newControllerId]: {
          ...toPlayer,
          cards: [...toPlayer.cards, movedCard]
        }
      },
      log: [...state.log, `${card.template.name}: контроль передан ${toPlayer.name}`]
    };
  }),

  applyFullState: (stateUpdate) => set(stateUpdate),
  addLog: (msg) => set(state => ({ log: [...state.log, msg] })),
  addChat: (sender, text) => set(state => ({
    chatMessages: [...state.chatMessages, { sender, text }]
  })),

  openContextMenu: (cardId, x, y) => set({
    contextMenuCardId: cardId,
    contextMenuPosition: { x, y }
  }),
  closeContextMenu: () => set({ contextMenuCardId: null, contextMenuPosition: null }),

  getPlayerCards: (playerId, zone) => {
    const player = get().players[playerId];
    if (!player) return [];
    return player.cards.filter(c => c.zone === zone).sort((a, b) => a.order - b.order);
  },

  getCard: (instanceId) => {
    for (const p of Object.values(get().players)) {
      const c = p.cards.find(c => c.instanceId === instanceId);
      if (c) return c;
    }
    return undefined;
  },

  activateEffect: (cardInstanceId) => {
    set(state => {
      const found = findCard(state.players, cardInstanceId);
      if (!found) return state;
      const name = found.card.template.name || 'Карта';
      return {
        chain: [...state.chain, {
          linkNumber: state.chain.length + 1,
          cardInstanceId,
          cardName: name,
          description: `Эффект: ${name}`,
          playerId: found.playerId,
          resolved: false
        }],
        chainActive: true,
        log: [...state.log, `⚡ Активирован эффект: ${name} (Звено ${state.chain.length + 1})`]
      };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  syncBoardState: () => {
    const state = get();
    const onSend = state.onSendAction;
    if (onSend) {
      onSend({
        type: 'state-sync',
        data: {
          players: state.players,
          currentTurnPlayerId: state.currentTurnPlayerId,
          phase: state.phase,
          turnNumber: state.turnNumber,
          chain: state.chain,
          chainActive: state.chainActive,
          priorityPlayerId: state.priorityPlayerId,
          firstTurn: state.firstTurn,
          log: state.log,
          cardTemplates: state.cardTemplates,
          gameStatus: state.gameStatus,
        }
      });
    }
  },


  applyBoardState: (stateUpdate) => {
    set(state => ({
      ...state,
      ...stateUpdate
    }));
  }
}));
