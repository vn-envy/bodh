import {
  createGrowthGraph,
  parseGrowthGraph,
  serializeGrowthGraph,
  type GrowthGraph,
} from "./growth-graph.ts";

/**
 * On-device persistence for the growth graph (D-020). IndexedDB is preferred;
 * `localStorage` is the fallback; memory is the last resort. Nothing here ever
 * touches the network.
 */
export const GROWTH_GRAPH_STORAGE_KEY = "bodh:growth-graph:v1" as const;
const DB_NAME = "bodh-van";
const STORE_NAME = "growth-graph";
const RECORD_KEY = "current";

let memoryGraph: string | null = null;

function indexedDbAvailable() {
  return typeof indexedDB !== "undefined";
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readIndexedDb(): Promise<string | null> {
  const db = await openDatabase();
  try {
    return await new Promise<string | null>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(RECORD_KEY);
      request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

async function writeIndexedDb(serialised: string) {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(serialised, RECORD_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

function readLocalStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage.getItem(GROWTH_GRAPH_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeLocalStorage(serialised: string) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(GROWTH_GRAPH_STORAGE_KEY, serialised);
  } catch {
    // Memory still holds the graph for this session.
  }
}

export async function loadGrowthGraph(): Promise<GrowthGraph> {
  let raw: string | null = null;
  if (indexedDbAvailable()) {
    try {
      raw = await readIndexedDb();
    } catch {
      raw = null;
    }
  }
  raw ??= readLocalStorage() ?? memoryGraph;
  return parseGrowthGraph(raw) ?? createGrowthGraph();
}

export async function saveGrowthGraph(graph: GrowthGraph): Promise<boolean> {
  const serialised = serializeGrowthGraph(graph);
  if (!serialised) return false;
  memoryGraph = serialised;
  writeLocalStorage(serialised);
  if (indexedDbAvailable()) {
    try {
      await writeIndexedDb(serialised);
    } catch {
      // localStorage already holds the graph.
    }
  }
  return true;
}

export async function clearGrowthGraph() {
  memoryGraph = null;
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(GROWTH_GRAPH_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
  if (indexedDbAvailable()) {
    try {
      await writeIndexedDb(serializeGrowthGraph(createGrowthGraph()) ?? "");
    } catch {
      // Nothing to clear.
    }
  }
}
