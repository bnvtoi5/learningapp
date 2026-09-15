import { MediaAsset } from '../types';

const DB_NAME = 'AppMediaStorageDB';
const DB_VERSION = 1;
const STORE_NAME = 'media_files';

interface StoredMediaRecord {
  id: string;
  type: 'image' | 'audio';
  name: string;
  url?: string;
  blob?: Blob;
  mimeType?: string;
  size?: number;
  folderId?: string;
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function getMediaDatabase(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this browser environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }
  return dbPromise;
}

// Convert Data URL to Blob safely
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const byteString = atob(parts[1] || '');
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

// Object URL cache to avoid redundant creations
const objectUrlCache = new Map<string, string>();

/**
 * Save a media file into IndexedDB
 */
export async function saveMediaToDb(asset: {
  id: string;
  type: 'image' | 'audio';
  name: string;
  dataUrl?: string;
  blob?: Blob;
  onlineUrl?: string;
  folderId?: string;
  size?: number;
}): Promise<MediaAsset> {
  const db = await getMediaDatabase();
  const createdAt = Date.now();

  let blobToStore = asset.blob;
  if (!blobToStore && asset.dataUrl && asset.dataUrl.startsWith('data:')) {
    blobToStore = dataUrlToBlob(asset.dataUrl);
  }

  const record: StoredMediaRecord = {
    id: asset.id,
    type: asset.type,
    name: asset.name,
    url: asset.onlineUrl || '',
    blob: blobToStore,
    mimeType: blobToStore ? blobToStore.type : undefined,
    size: asset.size || (blobToStore ? blobToStore.size : undefined),
    folderId: asset.folderId,
    createdAt,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);

    req.onsuccess = () => {
      // Create memory URL if blob exists
      let runtimeUrl = asset.onlineUrl || '';
      if (blobToStore) {
        if (objectUrlCache.has(asset.id)) {
          URL.revokeObjectURL(objectUrlCache.get(asset.id)!);
        }
        runtimeUrl = URL.createObjectURL(blobToStore);
        objectUrlCache.set(asset.id, runtimeUrl);
      }

      const mediaAsset: MediaAsset = {
        id: asset.id,
        type: asset.type,
        name: asset.name,
        url: runtimeUrl || `idb:${asset.id}`,
        folderId: asset.folderId,
        size: record.size,
        createdAt,
      };
      resolve(mediaAsset);
    };

    req.onerror = () => reject(req.error);
  });
}

/**
 * Get all media assets from IndexedDB
 */
export async function getAllMediaFromDb(): Promise<MediaAsset[]> {
  try {
    const db = await getMediaDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const records: StoredMediaRecord[] = req.result || [];
        const assets: MediaAsset[] = records.map(rec => {
          let url = rec.url || '';
          if (rec.blob) {
            if (!objectUrlCache.has(rec.id)) {
              objectUrlCache.set(rec.id, URL.createObjectURL(rec.blob));
            }
            url = objectUrlCache.get(rec.id)!;
          } else if (!url) {
            url = `idb:${rec.id}`;
          }

          return {
            id: rec.id,
            type: rec.type,
            name: rec.name,
            url,
            folderId: rec.folderId,
            size: rec.size,
            createdAt: rec.createdAt,
          };
        });

        // Sort latest first
        assets.sort((a, b) => b.createdAt - a.createdAt);
        resolve(assets);
      };

      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to load media from IndexedDB:', err);
    return [];
  }
}

/**
 * Update media asset folder
 */
export async function updateMediaAssetFolder(id: string, folderId?: string): Promise<void> {
  const db = await getMediaDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const record: StoredMediaRecord | undefined = getReq.result;
      if (record) {
        record.folderId = folderId;
        const putReq = store.put(record);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Delete a media asset from IndexedDB
 */
export async function deleteMediaFromDb(id: string): Promise<void> {
  const db = await getMediaDatabase();
  if (objectUrlCache.has(id)) {
    URL.revokeObjectURL(objectUrlCache.get(id)!);
    objectUrlCache.delete(id);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Resolves a media url:
 * - If http(s) or data url, returns directly
 * - If blob url, verifies if still alive; if dead, falls back to IndexedDB
 * - If idb:media_xxx or media_xxx, loads the blob from IndexedDB and returns an Object URL
 */
export async function resolveMediaUrl(urlOrId?: string): Promise<string> {
  if (!urlOrId) return '';
  if (urlOrId.startsWith('http://') || urlOrId.startsWith('https://') || urlOrId.startsWith('data:')) {
    return urlOrId;
  }

  // If it's a blob: URL, verify if it's still accessible in the current session
  if (urlOrId.startsWith('blob:')) {
    try {
      const response = await fetch(urlOrId, { method: 'GET' });
      if (response.ok) {
        return urlOrId;
      }
    } catch {
      // Dead blob URL from an earlier session - fall through to IndexedDB recovery
    }
  }

  const id = urlOrId.replace(/^idb:/, '');
  if (objectUrlCache.has(id)) {
    const cached = objectUrlCache.get(id)!;
    // Verify cached url isn't dead
    try {
      return cached;
    } catch {
      objectUrlCache.delete(id);
    }
  }

  try {
    const db = await getMediaDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        const record: StoredMediaRecord | undefined = req.result;
        if (record?.blob) {
          const objectUrl = URL.createObjectURL(record.blob);
          objectUrlCache.set(id, objectUrl);
          resolve(objectUrl);
        } else if (record?.url) {
          resolve(record.url);
        } else {
          // If specific ID not found, fallback to the latest stored audio file in IDB
          const allReq = store.getAll();
          allReq.onsuccess = () => {
            const allRecords: StoredMediaRecord[] = allReq.result || [];
            const audioRecord = allRecords.find(r => r.type === 'audio' && r.blob) || allRecords[0];
            if (audioRecord?.blob) {
              const fallbackUrl = URL.createObjectURL(audioRecord.blob);
              objectUrlCache.set(audioRecord.id, fallbackUrl);
              resolve(fallbackUrl);
            } else if (audioRecord?.url) {
              resolve(audioRecord.url);
            } else {
              resolve('');
            }
          };
          allReq.onerror = () => resolve('');
        }
      };

      req.onerror = () => resolve('');
    });
  } catch {
    return '';
  }
}
