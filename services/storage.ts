
const DB_NAME = 'iPodRetroDB';
const STORE_MEDIA = 'media';
const STORE_PLAYLISTS = 'playlists';
const STORE_MEMORIES = 'memories';
const DB_VERSION = 4;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_MEDIA)) {
        db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
        db.createObjectStore(STORE_PLAYLISTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_MEMORIES)) {
        db.createObjectStore(STORE_MEMORIES, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveMedia = async (item: any): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(STORE_MEDIA, 'readwrite');
  tx.objectStore(STORE_MEDIA).put(item);
};

export const getAllMedia = async (): Promise<any[]> => {
  const db = await initDB();
  const tx = db.transaction(STORE_MEDIA, 'readonly');
  return new Promise((res) => {
    tx.objectStore(STORE_MEDIA).getAll().onsuccess = (e: any) => res(e.target.result);
  });
};

export const saveMemory = async (memory: any) => {
  const db = await initDB();
  const tx = db.transaction(STORE_MEMORIES, 'readwrite');
  tx.objectStore(STORE_MEMORIES).put(memory);
};

export const getAllMemories = async () => {
  const db = await initDB();
  const tx = db.transaction(STORE_MEMORIES, 'readonly');
  return new Promise<any[]>((res) => {
    tx.objectStore(STORE_MEMORIES).getAll().onsuccess = (e: any) => res(e.target.result);
  });
};

export const deleteMemory = async (id: string) => {
  const db = await initDB();
  const tx = db.transaction(STORE_MEMORIES, 'readwrite');
  tx.objectStore(STORE_MEMORIES).delete(id);
};

export const getAllPlaylists = async () => {
  const db = await initDB();
  const tx = db.transaction(STORE_PLAYLISTS, 'readonly');
  return new Promise<any[]>((res) => {
    tx.objectStore(STORE_PLAYLISTS).getAll().onsuccess = (e: any) => res(e.target.result);
  });
};

export const savePlaylist = async (pl: any) => {
  const db = await initDB();
  const tx = db.transaction(STORE_PLAYLISTS, 'readwrite');
  tx.objectStore(STORE_PLAYLISTS).put(pl);
};
