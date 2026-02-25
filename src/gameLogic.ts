// Separate vowel and consonant pools with frequency weights.
// generateBoard picks a guaranteed balanced ratio (~36% vowels) so no seed
// produces a grid that's all vowels or all consonants.
const VOWEL_POOL = [
  'A','A','A','A','A','A',
  'E','E','E','E','E','E','E','E',
  'I','I','I','I','I','I',
  'O','O','O','O','O',
  'U','U','U',
];

const CONSONANT_POOL = [
  'B','B',
  'C','C','C',
  'D','D','D','D',
  'F','F',
  'G','G','G',
  'H','H','H',
  'J',
  'K','K',
  'L','L','L','L',
  'M','M','M',
  'N','N','N','N','N','N',
  'P','P',
  'R','R','R','R','R','R',
  'S','S','S','S','S',
  'T','T','T','T','T','T',
  'V','V',
  'W','W',
  'X',
  'Y','Y',
  'Z',
];

export function generateBoard(seed: number, size = 4): string[][] {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
  const shuffle = <T>(arr: T[]): T[] => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  const total = size * size;
  // Target ~36% vowels, clamped to a sensible range
  const targetVowels = Math.round(total * 0.36);

  const vowels     = shuffle([...VOWEL_POOL]);
  const consonants = shuffle([...CONSONANT_POOL]);

  const picked: string[] = [
    ...vowels.slice(0, targetVowels),
    ...consonants.slice(0, total - targetVowels),
  ];

  // Final shuffle mixes vowels and consonants into a random grid order
  shuffle(picked);

  const board: string[][] = [];
  let idx = 0;
  for (let r = 0; r < size; r++) {
    const row: string[] = [];
    for (let c = 0; c < size; c++) {
      row.push(picked[idx++]);
    }
    board.push(row);
  }
  return board;
}

export function getNeighbors(index: number, size = 4): number[] {
  const row = Math.floor(index / size);
  const col = index % size;
  const neighbors: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        neighbors.push(nr * size + nc);
      }
    }
  }
  return neighbors;
}

export function isValidPath(path: number[], size = 4): boolean {
  if (path.length < 2) return true;
  const visited = new Set<number>();
  for (let i = 0; i < path.length; i++) {
    if (visited.has(path[i])) return false;
    visited.add(path[i]);
    if (i > 0) {
      const neighbors = getNeighbors(path[i - 1], size);
      if (!neighbors.includes(path[i])) return false;
    }
  }
  return true;
}

export function pathToWord(path: number[], board: string[][], size = 4): string {
  return path.map((idx) => {
    const row = Math.floor(idx / size);
    const col = idx % size;
    return board[row][col];
  }).join('');
}

export function scoreWord(word: string): number {
  const len = word.length;
  if (len < 3) return 0;
  if (len === 3) return 100;
  if (len === 4) return 400;
  if (len === 5) return 800;
  if (len === 6) return 1400;
  if (len === 7) return 1800;
  return 2200 + (len - 8) * 400;
}
