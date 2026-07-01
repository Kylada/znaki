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
    targetIds: string[]; // Can be cardInstanceId or playerId
    defenderIds: string[];
  };
  tieProposedBy: string | null;
  decks: Record<string, { main: string[]; sign: string[] }>;
  resolutionPending: {
    type: 'link' | 'all';
    confirmedBy: string[];
    initiatorId: string;
  } | null;



  setLocalPlayerId: (id: string) => void;
  setRemotePlayerId: (id: string | null) => void;
  setOnSendAction: (fn: ((action: any) => void) | null) => void;
  setRemoteAction: (val: boolean) => void;
  setGameStatus: (status: GameStore['gameStatus']) => void;
  setCombatMode: (mode: GameStore['combatState']['mode']) => void;
  setCombatAttacker: (id: string | null) => void;
  // FIX #1: setCombatTarget had an inline method body in the interface (invalid TS).
  // Corrected to a proper function type signature.
  setCombatTarget: (id: string | null) => void;

  addCombatTarget: (id: string) => void;
  removeCombatTarget: (id: string) => void;
  addCombatDefender: (id: string) => void;
  removeCombatDefender: (id: string) => void;
  clearCombatState: () => void;
  confirmResolution: (playerId: string) => void;
  cancelResolution: () => void;
  resolveCombat: () => void;
  acceptTie: (playerId: string) => void;
  cancelTie: () => void;
  setDecks: (decks: Record<string, { main: string[], sign: string[] }>) => void;


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

  /** Stack cardId under/above targetCardId on the field */
  stackCardOnCard: (cardId: string, targetCardId: string, position: 'above' | 'below') => void;
  /** Get all cards stacked under a given card (direct children only — top-level call collects recursively) */
  getStackedCards: (topCardId: string) => CardInstance[];

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
  syncDecks: () => void;
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
  tieProposedBy: null,
  decks: {},
  resolutionPending: null,



  setLocalPlayerId: (id) => set({ localPlayerId: id }),
  setRemotePlayerId: (id) => set({ remotePlayerId: id }),
  setOnSendAction: (fn) => set({ onSendAction: fn }),
  // FIX: setRemoteAction was declared in interface but never implemented
  setRemoteAction: (val) => set({ isRemoteAction: val }),
  setDecks: (decks: Record<string, { main: string[], sign: string[] }>) => {
    set({ decks });
    if (!get().isRemoteAction) get().syncDecks();
  },
  setGameStatus: (status) => {
    set({ gameStatus: status });
    if (!get().isRemoteAction) get().syncBoardState();
  },
  setCombatMode: (mode) => {
    set({ combatState: { ...get().combatState, mode } });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  // FIX #1: Proper implementation (interface type is now also fixed above)
  setCombatTarget: (id) => {
    if (id) {
      const currentTargets = get().combatState.targetIds || [];
      if (!currentTargets.includes(id)) {
        set({ combatState: { ...get().combatState, targetIds: [...currentTargets, id] } });
      }
    } else {
      set({ combatState: { ...get().combatState, targetIds: [] } });
    }
    if (!get().isRemoteAction) get().syncBoardState();
  },

  setCombatAttacker: (id) => {
    set({ combatState: { ...get().combatState, attackerId: id } });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  addCombatTarget: (id) => {
    console.log('Store: addCombatTarget called for id:', id);
    set(state => {
      const currentTargets = state.combatState.targetIds || [];
      if (currentTargets.includes(id)) {
        console.log('Target already exists');
        return state;
      }
      console.log('Adding target to list. New list:', [...currentTargets, id]);
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
      
      // STRICT CHECK: Proposer cannot confirm their own resolution
      if (playerId === state.resolutionPending.initiatorId) {
        return state;
      }

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
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },
  cancelResolution: () => {
    set({ resolutionPending: null });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  resolveCombat: () => {
    const { combatState, players } = get();
    if (!combatState.attackerId) return;

    const attackerCard = get().getCard(combatState.attackerId);
    if (!attackerCard) return;

    const attackValue = attackerCard.currentAttack || 0;
    let currentLog = [`⚔️ ${attackerCard.template.name} атакует с силой ${attackValue}!`];

    set(state => {
      const newPlayers = { ...state.players };
      
      state.combatState.targetIds.forEach(targetId => {
        const targetCard = get().getCard(targetId);
        
        if (targetCard) {
          // Target is a card
          const targetOwnerId = targetCard.ownerId;
          const p = newPlayers[targetOwnerId];
          if (p) {
            const cardIdx = p.cards.findIndex(c => c.instanceId === targetId);
            if (cardIdx !== -1) {
              const card = p.cards[cardIdx];
              const newHealth = (card.currentHealth || 0) - attackValue;
              
              if (newHealth <= 0) {
                currentLog.push(`💥 ${targetCard.template.name} уничтожен!`);
                // Move to graveyard
                const updatedCards = p.cards.map(c => 
                  c.instanceId === targetId ? { ...c, zone: 'graveyard' as Zone, currentHealth: 0 } : c
                );
                newPlayers[targetOwnerId] = { ...p, cards: updatedCards };
              } else {
                currentLog.push(`🩸 ${targetCard.template.name} получает ${attackValue} урона (Осталось: ${newHealth})`);
                const updatedCards = p.cards.map(c => 
                  c.instanceId === targetId ? { ...c, currentHealth: newHealth } : c
                );
                newPlayers[targetOwnerId] = { ...p, cards: updatedCards };
              }
            }
          }
        } else {
          // Target is likely a playerId (Life Crystals)
          const targetPlayerId = targetId;
          const p = newPlayers[targetPlayerId];
          if (p) {
            let remainingDamage = attackValue;
            const updatedCrystals = [...p.crystals];
            
            for (let i = 0; i < updatedCrystals.length && remainingDamage > 0; i++) {
              const crystal = updatedCrystals[i];
              if (crystal.destroyed) continue;
              
              const damageToCrystal = Math.min(crystal.currentHealth, remainingDamage);
              updatedCrystals[i] = { ...crystal, currentHealth: crystal.currentHealth - damageToCrystal };
              remainingDamage -= damageToCrystal;
              
              if (updatedCrystals[i].currentHealth <= 0) {
                updatedCrystals[i].destroyed = true;
                currentLog.push(`💎 Кристалл ${i + 1} игрока ${p.name} разбит!`);
              }
            }
            
            if (remainingDamage > 0) {
              currentLog.push(`⚠️ Урон ${remainingDamage} не был поглощен кристаллами!`);
            }
            
            newPlayers[targetPlayerId] = { ...p, crystals: updatedCrystals };
          }
        }
      });

      return {
        players: newPlayers,
        combatState: { mode: 'idle', attackerId: null, targetIds: [], defenderIds: [] },
        log: [...state.log, ...currentLog]
      };
    });

    if (!get().isRemoteAction) get().syncBoardState();
  },

  // FIX #3: acceptTie now properly guards against accepting your own tie.
  // The check uses tieProposedBy (who proposed) vs the acceptor's id.
  acceptTie: (playerId) => {
    const { players, tieProposedBy } = get();
    // Only the non-proposer can accept
    if (playerId === tieProposedBy) {
      console.log('Cannot accept your own tie proposal');
      return;
    }
    const name = players[playerId]?.name || 'Игрок';
    set({ gameStatus: 'ended' });
    get().addLog(`🤝 ${name} принял предложение о ничьей. Игра окончена!`);
    if (!get().isRemoteAction) get().syncBoardState();
  },

  cancelTie: () => {
    set({ gameStatus: 'playing', tieProposedBy: null });
    if (!get().isRemoteAction) get().syncBoardState();
  },


  executeAction: (type, payload) => {
    const isRemote = get().isRemoteAction;
    set({ isRemoteAction: true });
    if (typeof (get() as any)[type] === 'function' && type !== 'executeAction') {
      const args = payload && typeof payload === 'object' ? Object.values(payload) : [payload];
      ((get() as any)[type] as any)(...args);
    }
    set({ isRemoteAction: false });
    if (!isRemote) {
      get().syncBoardState();
    }
  },

  concede: (playerId) => {
    const player = get().players[playerId];
    const name = player?.name || 'Игрок';
    console.log('Executing concede for:', playerId, 'New status: conceded');
    set({ gameStatus: 'conceded' });
    get().addLog(`🏳️ ${name} сдался!`);
    if (!get().isRemoteAction) get().syncBoardState();
  },

  proposeTie: (playerId) => {
    const player = get().players[playerId];
    const name = player?.name || 'Игрок';
    console.log('Executing proposeTie for:', playerId, 'New status: tie-proposed');
    set({ gameStatus: 'tie-proposed', tieProposedBy: playerId });
    get().addLog(`🤝 ${name} предложил ничью`);
    if (!get().isRemoteAction) get().syncBoardState();
  },


  // FIX #4: resetGame reloads decks from the persisted `decks` store in a single
  // atomic set() call — no intermediate syncs, no setTimeout race conditions.
  resetGame: () => {
    const { players, localPlayerId, decks, cardTemplates } = get();

    const newPlayers: Record<string, PlayerState> = {};

    for (const pid of Object.keys(players)) {
      const playerDecks = decks[pid];
      const crystals = initialCrystals();
      let cards: CardInstance[] = [];

      if (playerDecks && cardTemplates.length > 0) {
        // Load main deck
        const mainCards: CardInstance[] = (playerDecks.main || []).map((tid, i) => {
          const tmpl = cardTemplates.find(t => t.id === tid);
          if (!tmpl) return null;
          return {
            instanceId: uuidv4(), templateId: tid, template: tmpl,
            zone: 'mainDeck' as Zone, faceDown: true, exhausted: false,
            currentHealth: tmpl.health, currentAttack: tmpl.attack,
            counters: {}, isToken: false, ownerId: pid, controllerId: pid,
            attackedThisTurn: false, defendedThisTurn: false, order: i
          } as CardInstance;
        }).filter(Boolean) as CardInstance[];

        // Shuffle main deck (Fisher-Yates)
        for (let i = mainCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [mainCards[i], mainCards[j]] = [mainCards[j], mainCards[i]];
        }
        mainCards.forEach((c, i) => { c.order = i; });

        // Load sign deck
        const signCards: CardInstance[] = (playerDecks.sign || []).map((tid, i) => {
          const tmpl = cardTemplates.find(t => t.id === tid);
          if (!tmpl) return null;
          return {
            instanceId: uuidv4(), templateId: tid, template: tmpl,
            zone: 'signDeck' as Zone, faceDown: true, exhausted: false,
            currentHealth: tmpl.health, currentAttack: tmpl.attack,
            counters: {}, isToken: false, ownerId: pid, controllerId: pid,
            attackedThisTurn: false, defendedThisTurn: false, order: i
          } as CardInstance;
        }).filter(Boolean) as CardInstance[];

        // Shuffle sign deck
        for (let i = signCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [signCards[i], signCards[j]] = [signCards[j], signCards[i]];
        }
        signCards.forEach((c, i) => { c.order = i; });

        cards = [...mainCards, ...signCards];

        // Draw 6 cards into hand
        const sorted = [...mainCards].sort((a, b) => a.order - b.order);
        const hand = sorted.slice(0, 6);
        hand.forEach((c, i) => {
          const idx = cards.findIndex(x => x.instanceId === c.instanceId);
          if (idx !== -1) cards[idx] = { ...cards[idx], zone: 'hand' as Zone, faceDown: false, order: i };
        });

        // Seal one card under each crystal (from remaining deck top)
        const remaining = cards
          .filter(c => c.zone === 'mainDeck')
          .sort((a, b) => a.order - b.order);
        const toSeal = remaining.slice(0, crystals.length);
        toSeal.forEach((c, i) => {
          const idx = cards.findIndex(x => x.instanceId === c.instanceId);
          if (idx !== -1) {
            cards[idx] = { ...cards[idx], zone: 'sealed' as Zone, faceDown: true, sealedUnderCrystal: i };
          }
          crystals[i] = { ...crystals[i], sealedCardIds: [c.instanceId] };
        });
      }

      newPlayers[pid] = {
        ...players[pid],
        cards,
        crystals,
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
      resolutionPending: null,
      firstTurn: true,
      log: ['Игра сброшена и начата заново'],
      gameStatus: 'playing',
      tieProposedBy: null,
      combatState: { mode: 'idle', attackerId: null, targetIds: [], defenderIds: [] },
      decks
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

      const FIELD_ZONES: Zone[] = ['monsterZone', 'spellArtifactZone', 'signZone'];
      const leavingField = FIELD_ZONES.includes(card.zone) && !FIELD_ZONES.includes(toZone);

      // Collect all cards stacked under this card (recursively)
      const collectStacked = (topId: string, players: Record<string, PlayerState>): CardInstance[] => {
        const result: CardInstance[] = [];
        for (const p of Object.values(players)) {
          for (const c of p.cards) {
            if (c.fieldStackedUnder === topId) {
              result.push(c);
              result.push(...collectStacked(c.instanceId, players));
            }
          }
        }
        return result;
      };

      // Build new players state
      let newPlayers = { ...state.players };
      const logEntries: string[] = [];

      // Move the primary card, clearing seal/stack metadata
      const player = newPlayers[playerId];
      const maxOrder = Math.max(0, ...player.cards.filter(c => c.zone === toZone).map(c => c.order));
      let crystals = player.crystals;
      if (card.zone === 'sealed' && card.sealedUnderCrystal !== undefined) {
        crystals = crystals.map((cr, i) =>
          i === card.sealedUnderCrystal
            ? { ...cr, sealedCardIds: cr.sealedCardIds.filter(id => id !== cardInstanceId) }
            : cr
        );
      }

      // Determine actual destination — if leaving the field and control was transferred,
      // send back to the owner's zone instead (graveyard → owner, etc.)
      const resolveDestination = (c: CardInstance, zone: Zone): { targetPlayerId: string; targetZone: Zone } => {
        if (leavingField && c.ownerId !== c.controllerId) {
          // Control-transferred card: return to owner's graveyard
          return { targetPlayerId: c.ownerId, targetZone: 'graveyard' };
        }
        return { targetPlayerId: playerId, targetZone: zone };
      };

      newPlayers[playerId] = {
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
              sealedUnderCrystal: undefined,
              fieldStackedUnder: undefined,
            }
            : c
        )
      };
      logEntries.push(`${player.name}: ${card.template.name || 'Карта'} → ${zoneLabel(toZone)}`);

      // If leaving field, cascade all stacked cards to graveyard (or owner's graveyard)
      if (leavingField) {
        const stacked = collectStacked(cardInstanceId, state.players);
        for (const sc of stacked) {
          const scFoundPlayerId = Object.keys(state.players).find(pid =>
            state.players[pid].cards.some(c => c.instanceId === sc.instanceId)
          )!;
          const { targetPlayerId, targetZone } = resolveDestination(sc, 'graveyard');

          if (scFoundPlayerId === targetPlayerId) {
            // Same player — just update the card in place
            const scPlayer = newPlayers[targetPlayerId];
            const scMaxOrder = Math.max(0, ...scPlayer.cards.filter(c => c.zone === targetZone).map(c => c.order));
            newPlayers[targetPlayerId] = {
              ...scPlayer,
              cards: scPlayer.cards.map(c =>
                c.instanceId === sc.instanceId
                  ? { ...c, zone: targetZone, faceDown: false, fieldStackedUnder: undefined, exhausted: false, order: scMaxOrder + 1 }
                  : c
              )
            };
          } else {
            // Different player (control returned to owner)
            const fromP = newPlayers[scFoundPlayerId];
            const toP = newPlayers[targetPlayerId];
            const scMaxOrder = Math.max(0, ...toP.cards.filter(c => c.zone === targetZone).map(c => c.order));
            newPlayers[scFoundPlayerId] = {
              ...fromP,
              cards: fromP.cards.filter(c => c.instanceId !== sc.instanceId)
            };
            newPlayers[targetPlayerId] = {
              ...toP,
              cards: [...toP.cards, {
                ...sc,
                zone: targetZone,
                controllerId: sc.ownerId,
                faceDown: false,
                fieldStackedUnder: undefined,
                exhausted: false,
                order: scMaxOrder + 1
              }]
            };
          }

          if (sc.isToken) {
            // Tokens vanish instead of going to graveyard
            const tp = newPlayers[scFoundPlayerId === targetPlayerId ? scFoundPlayerId : scFoundPlayerId];
            newPlayers[scFoundPlayerId] = {
              ...newPlayers[scFoundPlayerId],
              cards: newPlayers[scFoundPlayerId].cards.filter(c => c.instanceId !== sc.instanceId)
            };
            logEntries.push(`Токен исчезает: ${sc.template.name}`);
          } else {
            logEntries.push(`↳ ${sc.template.name || 'Карта'} → Кладбище`);
          }
        }
      }

      return {
        players: newPlayers,
        log: [...state.log, ...logEntries]
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

  changePosition: (cardInstanceId, position) => {
    set(state => ({
      players: updateCard(state.players, cardInstanceId, c => ({ ...c, position })),
      log: [...state.log, `Монстр сменил позицию: ${position === 'attack' ? 'Атакующая' : 'Защитная'}`]
    }));
    if (!get().isRemoteAction) get().syncBoardState();
  },

  flipCard: (cardInstanceId) => {
    set(state => ({
      players: updateCard(state.players, cardInstanceId, c => ({ ...c, faceDown: !c.faceDown }))
    }));
    if (!get().isRemoteAction) get().syncBoardState();
  },

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

  addCounter: (cardInstanceId, counterName, amount) => {
    set(state => ({
      players: updateCard(state.players, cardInstanceId, c => ({
        ...c,
        counters: { ...c.counters, [counterName]: (c.counters[counterName] || 0) + amount }
      }))
    }));
    if (!get().isRemoteAction) get().syncBoardState();
  },

  removeCounter: (cardInstanceId, counterName, amount) => {
    set(state => ({
      players: updateCard(state.players, cardInstanceId, c => {
        const newVal = Math.max(0, (c.counters[counterName] || 0) - amount);
        const counters = { ...c.counters };
        if (newVal <= 0) delete counters[counterName];
        else counters[counterName] = newVal;
        return { ...c, counters };
      })
    }));
    if (!get().isRemoteAction) get().syncBoardState();
  },

  setCounter: (cardInstanceId, counterName, amount) => {
    set(state => ({
      players: updateCard(state.players, cardInstanceId, c => {
        const counters = { ...c.counters };
        if (amount <= 0) delete counters[counterName];
        else counters[counterName] = amount;
        return { ...c, counters };
      })
    }));
    if (!get().isRemoteAction) get().syncBoardState();
  },


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

  // FIX #2: Use localPlayerId as initiatorId so whoever clicked the button
  // is correctly identified as the proposer. Previously used priorityPlayerId
  // which could point to the wrong player (e.g. always the host).
  resolveLastLink: () => {
    set(state => {
      if (state.chain.length === 0) return state;
      return {
        resolutionPending: { 
          type: 'link', 
          confirmedBy: [], 
          initiatorId: state.localPlayerId
        }
      };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },

  resolveChain: () => {
    set(state => {
      if (state.chain.length === 0) return state;
      return {
        resolutionPending: { 
          type: 'all', 
          confirmedBy: [], 
          initiatorId: state.localPlayerId
        }
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

  getStackedCards: (topCardId) => {
    const players = get().players;
    const result: CardInstance[] = [];
    const collect = (parentId: string) => {
      for (const p of Object.values(players)) {
        for (const c of p.cards) {
          if (c.fieldStackedUnder === parentId) {
            result.push(c);
            collect(c.instanceId);
          }
        }
      }
    };
    collect(topCardId);
    return result;
  },

  stackCardOnCard: (cardId, targetCardId, position) => {
    set(state => {
      // Find both cards
      const foundCard = findCard(state.players, cardId);
      const foundTarget = findCard(state.players, targetCardId);
      if (!foundCard || !foundTarget) return state;

      const { card: movingCard, playerId: movingPlayerId } = foundCard;
      const { card: targetCard } = foundTarget;

      // Only works on field zones
      const FIELD_ZONES: Zone[] = ['monsterZone', 'spellArtifactZone', 'signZone'];
      if (!FIELD_ZONES.includes(targetCard.zone)) return state;

      let newPlayers = { ...state.players };
      const logEntries: string[] = [];

      // Collect everything that comes with the moving card (cards stacked under it)
      const collectStacked = (topId: string): CardInstance[] => {
        const result: CardInstance[] = [];
        for (const p of Object.values(state.players)) {
          for (const c of p.cards) {
            if (c.fieldStackedUnder === topId) {
              result.push(c);
              result.push(...collectStacked(c.instanceId));
            }
          }
        }
        return result;
      };

      if (position === 'above') {
        // card goes ON TOP of target — target + everything under target goes under card
        // Find what's currently the "real top" of the target stack
        // (target might itself be stacked under something — find the stack root)
        const getStackRoot = (cardInst: CardInstance): CardInstance => {
          if (!cardInst.fieldStackedUnder) return cardInst;
          const parent = get().getCard(cardInst.fieldStackedUnder);
          return parent ? getStackRoot(parent) : cardInst;
        };
        const targetRoot = getStackRoot(targetCard);
        
        // Collect everything under the target root
        const targetStacked = collectStacked(targetRoot.instanceId);

        // Move the incoming card (and anything under it) to same zone as target, with fieldStackedUnder cleared
        // Then set all of target's stack to be under the incoming card
        const incomingStacked = collectStacked(cardId);

        // First: move incoming card to target's zone (if different player, transfer)
        if (movingPlayerId !== foundTarget.playerId) {
          // Cross-player move
          const fromP = newPlayers[movingPlayerId];
          const toP = newPlayers[foundTarget.playerId];
          const maxOrd = Math.max(0, ...toP.cards.filter(c => c.zone === targetCard.zone).map(c => c.order));
          newPlayers[movingPlayerId] = { ...fromP, cards: fromP.cards.filter(c => c.instanceId !== cardId) };
          newPlayers[foundTarget.playerId] = {
            ...toP,
            cards: [...toP.cards, { ...movingCard, zone: targetCard.zone, controllerId: foundTarget.playerId, fieldStackedUnder: undefined, order: maxOrd + 1 }]
          };
        } else {
          newPlayers[movingPlayerId] = {
            ...newPlayers[movingPlayerId],
            cards: newPlayers[movingPlayerId].cards.map(c =>
              c.instanceId === cardId
                ? { ...c, zone: targetCard.zone, fieldStackedUnder: undefined }
                : c
            )
          };
        }

        // Stack the target root (and all its stacked cards) under the incoming card
        // Update targetRoot to have fieldStackedUnder = cardId
        for (const pid of Object.keys(newPlayers)) {
          newPlayers[pid] = {
            ...newPlayers[pid],
            cards: newPlayers[pid].cards.map(c =>
              c.instanceId === targetRoot.instanceId
                ? { ...c, fieldStackedUnder: cardId }
                : c
            )
          };
        }

        logEntries.push(`${movingCard.template.name} помещена НАД ${targetRoot.template.name}`);
        if (targetStacked.length > 0) {
          logEntries.push(`  (${targetStacked.length + 1} карт теперь под ${movingCard.template.name})`);
        }

      } else {
        // position === 'below': card goes UNDER target
        // Find the actual top card of the target's stack
        const getStackTop = (): CardInstance => {
          // If target has fieldStackedUnder, we're clicking a stacked card — find who's on top
          // Walk up to find the root
          if (!targetCard.fieldStackedUnder) return targetCard;
          const parent = get().getCard(targetCard.fieldStackedUnder);
          if (!parent) return targetCard;
          // Keep going up
          let cur = parent;
          while (cur.fieldStackedUnder) {
            const p = get().getCard(cur.fieldStackedUnder);
            if (!p) break;
            cur = p;
          }
          return cur;
        };
        const stackTop = getStackTop();

        // Move incoming card (and its stack) under the stack top
        if (movingPlayerId !== foundTarget.playerId) {
          const fromP = newPlayers[movingPlayerId];
          const toP = newPlayers[foundTarget.playerId];
          const maxOrd = Math.max(0, ...toP.cards.filter(c => c.zone === stackTop.zone).map(c => c.order));
          newPlayers[movingPlayerId] = { ...fromP, cards: fromP.cards.filter(c => c.instanceId !== cardId) };
          newPlayers[foundTarget.playerId] = {
            ...toP,
            cards: [...toP.cards, { ...movingCard, zone: stackTop.zone, controllerId: foundTarget.playerId, fieldStackedUnder: stackTop.instanceId, order: maxOrd + 1 }]
          };
        } else {
          newPlayers[movingPlayerId] = {
            ...newPlayers[movingPlayerId],
            cards: newPlayers[movingPlayerId].cards.map(c =>
              c.instanceId === cardId
                ? { ...c, zone: stackTop.zone, fieldStackedUnder: stackTop.instanceId }
                : c
            )
          };
        }

        // Also move anything that was stacked under the incoming card — it comes along, staying under it
        const incomingStacked = collectStacked(cardId);
        for (const sc of incomingStacked) {
          const scPid = Object.keys(newPlayers).find(pid =>
            newPlayers[pid].cards.some(c => c.instanceId === sc.instanceId)
          );
          if (!scPid) continue;
          if (scPid !== foundTarget.playerId) {
            const fromP = newPlayers[scPid];
            const toP = newPlayers[foundTarget.playerId];
            const maxOrd = Math.max(0, ...toP.cards.filter(c => c.zone === stackTop.zone).map(c => c.order));
            newPlayers[scPid] = { ...fromP, cards: fromP.cards.filter(c => c.instanceId !== sc.instanceId) };
            newPlayers[foundTarget.playerId] = {
              ...toP,
              cards: [...toP.cards, { ...sc, zone: stackTop.zone, controllerId: foundTarget.playerId, order: maxOrd + 1 }]
            };
          } else {
            newPlayers[scPid] = {
              ...newPlayers[scPid],
              cards: newPlayers[scPid].cards.map(c =>
                c.instanceId === sc.instanceId ? { ...c, zone: stackTop.zone } : c
              )
            };
          }
        }

        logEntries.push(`${movingCard.template.name} помещена ПОД ${stackTop.template.name}`);
      }

      return {
        players: newPlayers,
        log: [...state.log, ...logEntries]
      };
    });
    if (!get().isRemoteAction) get().syncBoardState();
  },

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

  setAttacked: (cardInstanceId, val) => {
    set(state => ({
      players: updateCard(state.players, cardInstanceId, c => ({ ...c, attackedThisTurn: val }))
    }));
    if (!get().isRemoteAction) get().syncBoardState();
  },

  setDefended: (cardInstanceId, val) => {
    set(state => ({
      players: updateCard(state.players, cardInstanceId, c => ({ ...c, defendedThisTurn: val }))
    }));
    if (!get().isRemoteAction) get().syncBoardState();
  },

  setCardAttack: (cardInstanceId, attack) => {
    set(state => ({
      players: updateCard(state.players, cardInstanceId, c => ({ ...c, currentAttack: attack }))
    }));
    if (!get().isRemoteAction) get().syncBoardState();
  },

  setCardHealth: (cardInstanceId, health) => {
    set(state => ({
      players: updateCard(state.players, cardInstanceId, c => ({ ...c, currentHealth: health }))
    }));
    if (!get().isRemoteAction) get().syncBoardState();
  },


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
          combatState: state.combatState,
          resolutionPending: state.resolutionPending,
          tieProposedBy: state.tieProposedBy,
        }
      });
    }
  },

  syncDecks: () => {
    const state = get();
    const onSend = state.onSendAction;
    if (onSend) {
      onSend({
        type: 'decks-sync',
        data: state.decks,
      });
    }
  },


  applyBoardState: (stateUpdate) => {
    set(state => {
      const combatState = {
        ...state.combatState,
        ...(stateUpdate.combatState || {})
      };
      
      return {
        ...state,
        ...stateUpdate,
        combatState,
        // Decks are handled by a separate sync message to avoid reset deletions
      };
    });
  }

}));
