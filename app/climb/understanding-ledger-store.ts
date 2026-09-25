"use client";

import { useSyncExternalStore } from "react";
import {
  UNDERSTANDING_STORAGE_KEY,
  createUnderstandingLedger,
  parseUnderstandingLedger,
  serializeUnderstandingLedger,
  type UnderstandingLedger,
} from "../../lib/understanding-evidence";

const CHANGE_EVENT = "bodh:understanding-ledger-change";
const EMPTY_LEDGER = createUnderstandingLedger();
let memoryRaw: string | null = null;
let cached: Readonly<{ raw: string | null; ledger: UnderstandingLedger }> = { raw: null, ledger: EMPTY_LEDGER };

function readRaw() {
  try {
    return window.localStorage.getItem(UNDERSTANDING_STORAGE_KEY);
  } catch {
    // Private browsing still keeps this tab's evidence in memory.
    return memoryRaw;
  }
}

function snapshot() {
  const raw = readRaw();
  if (raw !== cached.raw) cached = { raw, ledger: raw ? parseUnderstandingLedger(raw) : EMPTY_LEDGER };
  return cached.ledger;
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === UNDERSTANDING_STORAGE_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useUnderstandingLedger() {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY_LEDGER);
}

export function saveUnderstandingLedger(ledger: UnderstandingLedger) {
  const raw = serializeUnderstandingLedger(ledger);
  memoryRaw = raw;
  try {
    window.localStorage.setItem(UNDERSTANDING_STORAGE_KEY, raw);
  } catch {
    // The in-memory copy keeps the session usable.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearUnderstandingLedger() {
  memoryRaw = null;
  try {
    window.localStorage.removeItem(UNDERSTANDING_STORAGE_KEY);
  } catch {
    // Nothing was persisted.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Reads the ledger outside React, e.g. inside an event handler that records an attempt. */
export function currentUnderstandingLedger() {
  return snapshot();
}

const MINUTE_MS = 60_000;

function subscribeToClock(onChange: () => void) {
  const timer = window.setInterval(onChange, MINUTE_MS);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

let clockValue = 0;
function clockSnapshot() {
  const now = Date.now();
  // Stable between ticks so React sees a consistent snapshot, fresh after every save.
  if (Math.abs(now - clockValue) >= 1_000) clockValue = now;
  return clockValue;
}

/** Wall-clock time for review scheduling; 0 during server rendering. */
export function useClimbClock() {
  return useSyncExternalStore(subscribeToClock, clockSnapshot, () => 0);
}
