# World tools and WebMCP

Everything that moves in Bodh Van moves through a typed tool. There is no second path.

Implementation: `lib/world-tools.ts` (registry and gates), `app/components/world/WorldToolProvider.tsx` (browser registration), `worker/tools-manifest.ts` (`GET /api/tools`).

## Why one action path

Four very different callers want to act on the world:

1. The child, tapping and dragging.
2. Bodh's own in-page tutor, deciding what to point at next.
3. An external agent in a WebMCP-capable browser (a parent asking "show me where she got stuck", a child saying "take me back to the puddle").
4. The test suite, replaying whole journeys headlessly.

If each had its own code path, determinism and safety would be four separate promises. With one registry, they are one promise: **whatever an agent can do, a child could have done by hand, in the same order, with the same gates.**

## Tool shape

Tools follow the WebMCP `ModelContextTool` dictionary so the same object can be handed to the browser unchanged:

```ts
type WorldTool = {
  name: string;            // snake_case, prefixed bodh_
  description: string;     // written for a person
  inputSchema: JsonSchema; // draft 2020-12 object schema
  annotations: { readOnlyHint: boolean };
  execute(input, ctx): ToolResult; // routes through reducers only
};
```

`execute` never touches DOM or network directly. It dispatches to the world reducer and the growth-graph reducer and returns `{ content: [{ type: "text", text }] , structuredContent }`.

## Initial tool set

| Tool | Read-only | Gate |
|---|---|---|
| `bodh_observe_world` | yes | — |
| `bodh_read_growth_graph` | yes | Returns rungs and frontier only, never learner text |
| `bodh_export_bodhi_seed` | yes | — |
| `bodh_walk_to` | no | Place must be in the frontier or already `noticed` |
| `bodh_enter_station` | no | Must be standing at the station's place |
| `bodh_tinker` | no | Must be inside the station; control and value validated by the station's schema |
| `bodh_answer_probe` | no | Probe must currently be shown; option must belong to it |
| `bodh_ask_bodh` | no | Intent is an enum (`hint`, `explain`, `replay`, `where-am-i`); never free text |
| `bodh_replay_narration` | no | Beat must belong to the current station and already have been heard |

Gated calls return a structured refusal (`{ ok: false, reason }`) and leave state unchanged. Refusals are not errors; agents are expected to read the world first.

## Browser registration

On mount, `WorldToolProvider` feature-detects `document.modelContext ?? navigator.modelContext` and, if `registerTool` exists, registers every tool with an `AbortSignal` that fires on unmount. WebMCP is an early preview (Chromium 146+ behind `chrome://flags/#enable-webmcp-testing`); in every other browser the registry is simply local and the world works as before.

Two declarative fallbacks (`<form toolname="bodh_walk_to">`, `<form toolname="bodh_ask_bodh">`) are present in the world page. Browsers without WebMCP ignore the attributes and the forms behave as normal forms.

## Server manifest

`GET /api/tools` returns the tool names, descriptions, schemas and annotations as JSON so server-side agents and documentation stay in sync. It is generated from the same registry; a test asserts parity.

## Threat model and guardrails

- **No free text to models.** `bodh_ask_bodh` takes an intent enum. Speech from the child goes through the transcription route and into the same validated text pipeline as typing; it never enters a tool argument.
- **No skipping the probe.** Station explanation beats are unreachable until the station has reported an attempt, and the probe is shown before any explanation (D-002).
- **No answer leakage.** Tools never return success predicates, expected quantities, or the transfer answer. `bodh_observe_world` returns what is visible on screen.
- **No exfiltration.** `bodh_read_growth_graph` and `bodh_export_bodhi_seed` return only rung states, ticks, and misconception IDs — exactly what the on-device store holds.
- **Rate and order.** Mutating tools are serialised through a single dispatcher; concurrent agent calls are queued, not interleaved.
- **Determinism.** Same starting graph, same seed, same tool sequence → same world state hash. `tests/agent-journey.test.mjs` proves it by driving a complete station journey through tools alone.
