/**
 * TYPES DEFINITIONS
 * 
 * In TypeScript, 'type' and 'interface' are used to define the "shape" of data.
 * This prevents bugs by ensuring you don't accidentally try to use a property 
 * that doesn't exist.
 */

export type Element = 'Свет' | 'Тьма' | 'Хаос' | 'Порядок' | 'Жизнь' | 'Смерть' | 'Нет';

export type CardType = 'monster' | 'spell' | 'artifact' | 'sign';
export type SpellSubtype = 'normal' | 'continuous' | 'quick';
export type ArtifactSubtype = 'monument' | 'equipment';
export type MonsterPosition = 'attack' | 'defense';

export interface CardTemplate {
  id: string;
  name: string;
  type: CardType;
  subtype?: string;
  spellSubtype?: SpellSubtype;
  artifactSubtype?: ArtifactSubtype;
  cost: number;
  element: Element;
  attack?: number;
  health?: number;
  maxHealth?: number;
  effectText: string;
  imageUrl: string;
}

export interface CardInstance {
  instanceId: string;
  templateId: string;
  template: CardTemplate;
  zone: Zone;
  position?: MonsterPosition;
  faceDown: boolean;
  exhausted: boolean;
  currentHealth?: number;
  currentAttack?: number;
  counters: Record<string, number>;
  isToken: boolean;
  ownerId: string;
  controllerId: string;
  attackedThisTurn: boolean;
  defendedThisTurn: boolean;
  sealedUnderCrystal?: number;
  order: number;
}

export type Zone =
  | 'hand'
  | 'monsterZone'
  | 'spellArtifactZone'
  | 'signZone'
  | 'mainDeck'
  | 'signDeck'
  | 'graveyard'
  | 'void'
  | 'sealed'
  | 'removed';

export interface LifeCrystal {
  currentHealth: number;
  maxHealth: number;
  sealedCardIds: string[];
  destroyed: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  crystals: LifeCrystal[];
  secondBreathUsed: boolean;
  cards: CardInstance[];
}

export interface ChainLink {
  linkNumber: number;
  cardInstanceId: string | null;
  cardName: string;
  description: string;
  playerId: string;
  resolved: boolean;
}

/**
 * SharedGameState contains the complete board state.
 * This is the "single source of truth" synchronized between peers.
 */
export interface SharedGameState {
  players: Record<string, PlayerState>;
  currentTurnPlayerId: string;
  phase: 'start' | 'action' | 'end';
  turnNumber: number;
  chain: ChainLink[];
  chainActive: boolean;
  priorityPlayerId: string;
  firstTurn: boolean;
  log: string[];
  cardTemplates: CardTemplate[];
  gameStatus: 'playing' | 'conceded' | 'tie-proposed' | 'ended';
}


export interface PeerMessage {
  type: 'state-sync' | 'action' | 'chat' | 'deck-import' | 'ready';
  data: any;
}

export interface GameAction {
  type: string;
  payload: any;
}
