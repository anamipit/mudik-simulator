export interface Position {
  x: number;
  y: number;
}

export type BoosterType = 'turbo' | 'shield';

export interface GameObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  lane: number;
  speed: number;
  type?: string;
}

export interface PlayerState {
  lane: number;
  x: number;
  y: number;
  isTurbo: boolean;
  isShielded: boolean;
  turboTime: number;
  shieldTime: number;
}

export interface GameState {
  score: number;
  distance: number;
  isGameOver: boolean;
  isPaused: boolean;
  activeQuestion: number | null;
}
