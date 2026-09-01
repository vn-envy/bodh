"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { loadGrowthGraph, saveGrowthGraph } from "../../../lib/growth-graph-store";
import type { NarrationLanguage } from "../../../lib/narration-language";
import { createWorldSession, dispatchWorld, type WorldSession } from "../../../lib/world/session";
import { invokeWorldTool, WORLD_TOOLS, type ToolResult } from "../../../lib/world-tools";
import { useNarrationLanguage } from "../NarrationLanguageToggle";

type ToolInvoker = (name: string, input?: Record<string, unknown>) => ToolResult;

type WorldSnapshot = Readonly<{
  session: WorldSession;
  hydrated: boolean;
  webmcp: "registered" | "unavailable";
  lastResult: ToolResult | null;
}>;

type WorldContextValue = WorldSnapshot & Readonly<{ invoke: ToolInvoker }>;

const WorldContext = createContext<WorldContextValue | null>(null);

type ModelContextLike = {
  registerTool(tool: {
    name: string;
    description: string;
    inputSchema: unknown;
    annotations?: unknown;
    execute(input: unknown): unknown;
  }, options?: { signal?: AbortSignal }): unknown;
  unregisterTool?(name: string): void;
};

function modelContext(): ModelContextLike | null {
  if (typeof window === "undefined") return null;
  const doc = document as Document & { modelContext?: ModelContextLike };
  const nav = navigator as Navigator & { modelContext?: ModelContextLike };
  const candidate = doc.modelContext ?? nav.modelContext ?? null;
  return candidate && typeof candidate.registerTool === "function" ? candidate : null;
}

/**
 * A tiny external store so every caller — the child's taps, Bodh's tutor, an
 * external WebMCP agent — mutates one session through one serialised path
 * (D-016), while React reads consistent snapshots.
 */
class WorldStore {
  private snapshot: WorldSnapshot;
  private readonly listeners = new Set<() => void>();

  constructor(seed: string, language: NarrationLanguage) {
    this.snapshot = { session: createWorldSession(seed, language), hydrated: false, webmcp: "unavailable", lastResult: null };
  }

  readonly getSnapshot = () => this.snapshot;

  readonly subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private set(update: Partial<WorldSnapshot>) {
    this.snapshot = { ...this.snapshot, ...update };
    for (const listener of this.listeners) listener();
  }

  hydrate(session: WorldSession) {
    this.set({ session, hydrated: true });
  }

  setLanguage(language: NarrationLanguage) {
    if (this.snapshot.session.world.language === language) return;
    this.set({ session: dispatchWorld(this.snapshot.session, { type: "set-language", language }).session });
  }

  setWebmcp(webmcp: WorldSnapshot["webmcp"]) {
    if (this.snapshot.webmcp !== webmcp) this.set({ webmcp });
  }

  readonly invoke: ToolInvoker = (name, input) => {
    const { session, result } = invokeWorldTool(name, input ?? {}, this.snapshot.session);
    this.set({ session, lastResult: result });
    return result;
  };
}

export function WorldToolProvider({ seed, children }: { seed: string; children: ReactNode }) {
  const language = useNarrationLanguage();
  const [store] = useState(() => new WorldStore(seed, language));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useEffect(() => {
    let cancelled = false;
    void loadGrowthGraph().then((graph) => {
      if (cancelled) return;
      store.hydrate({ ...store.getSnapshot().session, graph });
    });
    return () => { cancelled = true; };
  }, [store]);

  useEffect(() => {
    store.setLanguage(language);
  }, [language, store]);

  useEffect(() => {
    if (!snapshot.hydrated) return;
    void saveGrowthGraph(snapshot.session.graph);
  }, [snapshot.hydrated, snapshot.session.graph]);

  useEffect(() => {
    const context = modelContext();
    if (!context) return;
    const controller = new AbortController();
    for (const tool of WORLD_TOOLS) {
      try {
        context.registerTool({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          annotations: tool.annotations,
          execute: (input: unknown) => {
            const result = store.invoke(tool.name, (input ?? {}) as Record<string, unknown>);
            return { content: result.content, structuredContent: result.structuredContent };
          },
        }, { signal: controller.signal });
      } catch {
        // A duplicate or unsupported registration must never break the world.
      }
    }
    store.setWebmcp("registered");
    return () => {
      controller.abort();
      for (const tool of WORLD_TOOLS) {
        try {
          context.unregisterTool?.(tool.name);
        } catch {
          // Older previews only support the AbortSignal path.
        }
      }
    };
  }, [store]);

  const invoke = useCallback<ToolInvoker>((name, input) => store.invoke(name, input), [store]);
  const value = useMemo<WorldContextValue>(() => ({ ...snapshot, invoke }), [snapshot, invoke]);

  return <WorldContext.Provider value={value}>{children}</WorldContext.Provider>;
}

export function useWorld() {
  const value = useContext(WorldContext);
  if (!value) throw new Error("useWorld must be used inside WorldToolProvider");
  return value;
}
