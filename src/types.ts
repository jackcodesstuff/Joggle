export interface Profile {
  id: string;
  name: string;
  avatar: string; // emoji avatar
  createdAt: number;
  gamesPlayed: number;
  highScore: number;
  totalScore: number;
}

export interface GameState {
  board: string[][];
  selectedPath: number[]; // indices into flat board
  foundWords: FoundWord[];
  score: number;
  timeLeft: number;
  gameOver: boolean;
  currentWord: string;
}

export interface FoundWord {
  word: string;
  path: number[];
  score: number;
}

export interface PlayerResult {
  id: string;
  name: string;
  avatar: string;
  score: number;
  words: FoundWord[];
}

export interface Room {
  id: string;
  hostProfileId: string;
  players: RoomPlayer[];
  boardSeed: number;
  gameStarted: boolean;
}

export interface RoomPlayer {
  profileId: string;
  name: string;
  avatar: string;
  score: number;
  foundWords: FoundWord[];
}

export interface GameSettings {
  boardSize: 4 | 5 | 6;
  duration: 30 | 60 | 90 | 120 | 180;
  minWordLength: 3 | 4 | 5;
}

export const DEFAULT_SETTINGS: GameSettings = {
  boardSize: 4,
  duration: 90,
  minWordLength: 3,
};
