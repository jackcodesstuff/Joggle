// Dictionary using the Free Dictionary API (reliable, no key needed)
// We cache lookups in session storage for performance

const cache: Record<string, boolean> = {};

// Load a common English word set for fast offline validation
// We use a curated word list bundled with the app as a fallback
let wordSet: Set<string> | null = null;

async function loadWordSet(): Promise<Set<string>> {
  if (wordSet) return wordSet;
  try {
    // an-array-of-english-words package gives us ~275k words
    const words = await import('an-array-of-english-words');
    const arr: string[] = (words as any).default ?? words;
    // Filter to 3+ letter words for performance
    wordSet = new Set(arr.filter((w: string) => w.length >= 3 && /^[a-z]+$/.test(w)));
  } catch {
    wordSet = new Set();
  }
  return wordSet;
}

// Pre-load on module init
loadWordSet();

export async function isValidWord(word: string): Promise<boolean> {
  if (word.length < 3) return false;
  const lower = word.toLowerCase();

  if (lower in cache) return cache[lower];

  const set = await loadWordSet();
  const valid = set.has(lower);
  cache[lower] = valid;
  return valid;
}

export function isValidWordSync(word: string): boolean {
  if (word.length < 3) return false;
  const lower = word.toLowerCase();
  if (lower in cache) return cache[lower];
  if (!wordSet) return false;
  return wordSet.has(lower);
}

export { loadWordSet };
