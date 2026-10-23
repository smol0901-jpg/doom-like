// IndexedDB wrapper for saves, high scores, settings

const DB_NAME = 'DoomLikeDB';
const DB_VERSION = 1;

let db = null;

export async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains('saves')) {
        database.createObjectStore('saves', { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains('scores')) {
        database.createObjectStore('scores', { keyPath: 'id', autoIncrement: true });
      }
      if (!database.objectStoreNames.contains('settings')) {
        database.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

export async function saveGame(data) {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('saves', 'readwrite');
    const store = tx.objectStore('saves');
    store.put({ id: 'current', ...data, timestamp: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadGame() {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('saves', 'readonly');
    const store = tx.objectStore('saves');
    const req = store.get('current');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearSave() {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('saves', 'readwrite');
    tx.objectStore('saves').delete('current');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function addScore(score, level, name = 'Player') {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('scores', 'readwrite');
    const store = tx.objectStore('scores');
    store.add({ score, level, name, date: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getTopScores(limit = 10) {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('scores', 'readonly');
    const store = tx.objectStore('scores');
    const req = store.getAll();
    req.onsuccess = () => {
      const all = req.result || [];
      all.sort((a, b) => b.score - a.score);
      resolve(all.slice(0, limit));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveSetting(key, value) {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadSetting(key, defaultValue = null) {
  if (!db) await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const req = tx.objectStore('settings').get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : defaultValue);
    req.onerror = () => reject(req.error);
  });
}
