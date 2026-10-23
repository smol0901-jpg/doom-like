// Registry of levels — add new map id here after putting JSON in /maps/
export const LEVEL_IDS = ['e1m1', 'e1m2', 'e1m3', 'e1m4', 'e1m5'];

export async function loadLevel(id) {
  const res = await fetch(`maps/${id}.json`);
  if (!res.ok) throw new Error(`Level ${id} not found`);
  return res.json();
}

export function getNextLevelId(currentId) {
  const idx = LEVEL_IDS.indexOf(currentId);
  if (idx < 0 || idx >= LEVEL_IDS.length - 1) return null;
  return LEVEL_IDS[idx + 1];
}

export function getLevelIndex(id) {
  return LEVEL_IDS.indexOf(id);
}
