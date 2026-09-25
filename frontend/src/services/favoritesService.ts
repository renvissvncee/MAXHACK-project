const STORAGE_KEY = "priut:favorites";

function readIds(): string[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function getFavoriteIds(): string[] {
  return readIds();
}

export function isFavorite(listingId: string): boolean {
  return readIds().includes(listingId);
}

export function toggleFavorite(listingId: string): boolean {
  const ids = readIds();
  const index = ids.indexOf(listingId);
  if (index === -1) {
    writeIds([...ids, listingId]);
    return true;
  }
  ids.splice(index, 1);
  writeIds(ids);
  return false;
}
