// Map helpers — works with JSON level objects

export function findPlayerStart(map) {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      if (map.data[y * map.width + x] === 4) return { x: x + 0.5, y: y + 0.5 };
    }
  }
  return { x: 1.5, y: 1.5 };
}

export function getSpawns(map) {
  const enemies = [];
  const pickups = [];
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const t = map.data[y * map.width + x];
      const pos = { x: x + 0.5, y: y + 0.5 };
      if (t === 3) enemies.push({ ...pos, type: 'zombie' });
      if (t === 8) enemies.push({ ...pos, type: 'imp' });
      if (t === 6) pickups.push({ ...pos, type: 'health' });
      if (t === 7) pickups.push({ ...pos, type: 'ammo' });
    }
  }
  return { enemies, pickups };
}

export function isSolid(map, x, y) {
  const mx = Math.floor(x);
  const my = Math.floor(y);
  if (mx < 0 || my < 0 || mx >= map.width || my >= map.height) return true;
  const t = map.data[my * map.width + mx];
  return t === 1 || t === 2;
}

export function isExit(map, x, y) {
  const mx = Math.floor(x);
  const my = Math.floor(y);
  if (mx < 0 || my < 0 || mx >= map.width || my >= map.height) return false;
  return map.data[my * map.width + mx] === 5;
}

export function getTile(map, x, y) {
  const mx = Math.floor(x);
  const my = Math.floor(y);
  if (mx < 0 || my < 0 || mx >= map.width || my >= map.height) return 1;
  return map.data[my * map.width + mx];
}

export function openDoor(map, x, y) {
  const mx = Math.floor(x);
  const my = Math.floor(y);
  if (mx < 0 || my < 0 || mx >= map.width || my >= map.height) return false;
  if (map.data[my * map.width + mx] === 2) {
    map.data[my * map.width + mx] = 0;
    return true;
  }
  return false;
}
