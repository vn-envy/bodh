# Growth graph

The growth graph is the single source of truth about a learner in Bodh Van. Everything the world shows — which places are lit, which are foggy, which glow because they are due for a return — is derived from it. Nothing else holds learner state.

Implementation: `lib/growth-graph.ts`. Schema: `schemas/growth-graph.schema.json`.

## Nodes and edges

- **Nodes** are concept IDs. Two kinds coexist:
  - Marble topic IDs (`mt_…`) from the committed slices in `data/taxonomy/`.
  - Bodh atom IDs — the seven fraction repair atoms in `lib/adaptive-repair.ts` and the five evaporation stage IDs in `lib/evaporation-concept.ts`.
- **Edges** are prerequisite dependencies. Marble dependencies carry `hard` or `soft` strength and are copied verbatim. Bodh atoms depend on each other in authored order and hang off their Marble parent.

The node and edge catalogue is fixed code (`GROWTH_GRAPH_CATALOG`). A learner's graph stores only per-node evidence; it never stores its own topology, so a catalogue change cannot corrupt saved state.

## The evidence ladder

Each node holds one rung:

```text
unseen → noticed → tinkered → explained → transferred → taught-back
```

| Rung | Meaning | Typical event |
|---|---|---|
| `unseen` | Never encountered | — |
| `noticed` | The child walked to the place or answered a probe about it | `place-visited`, `probe-answered` |
| `tinkered` | The child manipulated a station and the station reported a meaningful attempt | `station-attempt` |
| `explained` | Bodh's authored explanation for this atom completed after tinkering | `atom-completed` |
| `transferred` | The idea worked in a fresh context | `transfer-correct` |
| `taught-back` | The child explained the idea to Bodh and it matched the rubric | `taught-back` |

Rungs only move up through events. A spaced return does not lower the rung; it sets `dueTick` so the place lights again.

Alongside the rung each node keeps:

- `attempts` — every attempt, successful or not.
- `misconceptionSignals` — hypothesis IDs from the diagnostic taxonomy (`lib/diagnostic-guardrails.ts`) observed for this node. These are evidence for choosing the next representation, never a label on the child.
- `lastTick`, `dueTick` — logical ticks (not wall-clock), so replay is deterministic.

## Events

The reducer is pure: `(graph, event) → graph`. Unknown node IDs, out-of-catalogue hypothesis IDs, or malformed events return the graph unchanged.

Existing journeys feed the graph through adapters so they did not need rewriting:

- `adaptiveEvidenceEventToGrowth(event)` maps `AdaptiveEvidenceEvent` from `lib/adaptive-repair.ts`.
- `evaporationActionToGrowth(action, state)` maps `EvaporationJourneyAction`.

## Frontier

`nextFrontier(graph, seed)` returns the ordered list of nodes the world should light, with a reason for each:

1. **Due** — `dueTick <= currentTick` and rung ≥ `transferred`. Spaced return comes first.
2. **Reachable** — every `hard` prerequisite is at least `explained`. Soft prerequisites only affect ordering.
3. **Curious** — among reachable nodes, prefer those adjacent to recently touched nodes, then break ties with a seeded shuffle so two children with identical graphs see slightly different worlds but the same child always sees the same one.

Fog is simply "not in the frontier and not yet `noticed`".

## Persistence

- Serialised with a version string; `parseGrowthGraph` refuses unknown versions, extra keys, or unknown node IDs (same strict-normalise style as `adaptive-repair.ts`).
- Stored on device in IndexedDB (`lib/growth-graph-store.ts`), falling back to `localStorage`.
- **Bodhi seed**: `exportBodhiSeed(graph)` produces a compact base64url string the child or parent can copy or scan; `importBodhiSeed(text)` restores it. No server round-trip.

## What is deliberately not here

- No percentage, score, mastery probability, or "level".
- No wall-clock timestamps in the saved graph (a tick counter keeps replay deterministic and reveals nothing about when a child studied).
- No learner text, no transcripts, no audio.
