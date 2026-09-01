"use client";

import { useCallback, useState } from "react";
import { localized, type LocalizedText, type NarrationLanguage } from "../../../lib/narration-language";
import { isTutorTool, nextTutorStep, type TutorStep } from "../../../lib/tutor-policy";
import { observeWorld, type WorldSession } from "../../../lib/world/session";
import { validateLite } from "../../../lib/json-schema-lite";
import { worldToolByName, type ToolResult } from "../../../lib/world-tools";
import styles from "./TutorLead.module.css";

type Props = Readonly<{
  session: WorldSession;
  language: NarrationLanguage;
  invoke: (name: string, input?: Record<string, unknown>) => ToolResult;
}>;

const COPY = {
  ask: { hi: "Bodh, आगे क्या?", en: "Bodh, what next?" },
  thinking: { hi: "Bodh सोच रहा है…", en: "Bodh is thinking…" },
  policy: { hi: "Bodh का नियम", en: "Bodh's own rule" },
  model: { hi: "Bodh का model", en: "Bodh's model" },
  waiting: { hi: "Bodh रुका है", en: "Bodh is waiting" },
} as const;

type Explanation = Readonly<{ reason: string; via: "policy" | "model"; tool: string | null }>;

/**
 * "Let Bodh lead": asks the model-backed tutor for one step, validates it
 * against the same allowlist and tool schemas the server used, and executes it
 * through the registry. Any failure falls back to the deterministic policy.
 * The tutor never answers a probe, tinkers, or checks on the child's behalf.
 */
export function TutorLead({ session, language, invoke }: Props) {
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<Explanation | null>(null);
  const t = (text: LocalizedText) => localized(text, language);

  const run = useCallback(async () => {
    setBusy(true);
    let step: TutorStep | null = null;
    let via: Explanation["via"] = "policy";
    try {
      const response = await fetch("/api/tutor/step", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ observation: observeWorld(session) }),
      });
      if (response.ok) {
        const body = (await response.json()) as { step?: { tool?: unknown; input?: unknown; reason?: unknown } };
        const tool = body.step?.tool;
        if (isTutorTool(tool) && typeof body.step?.reason === "string") {
          const validation = validateLite(worldToolByName(tool)!.inputSchema, body.step.input ?? {});
          if (validation.ok) {
            step = { kind: "call", tool, input: validation.value, reason: { hi: body.step.reason, en: body.step.reason } };
            via = "model";
          }
        }
      }
    } catch {
      step = null;
    }
    step ??= nextTutorStep(session);
    if (step.kind === "call") invoke(step.tool, step.input);
    setLast({ reason: t(step.reason), via, tool: step.kind === "call" ? step.tool : null });
    setBusy(false);
    // `t` closes over language; the step reason is resolved at call time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoke, language, session]);

  return (
    <div className={styles.lead}>
      <button type="button" className="button button-secondary" onClick={() => { void run(); }} disabled={busy}>
        {busy ? t(COPY.thinking) : t(COPY.ask)}
      </button>
      {last && (
        <p className={styles.reason} role="status">
          <span>{last.reason}</span>
          <small>{last.via === "model" ? t(COPY.model) : t(COPY.policy)}{last.tool ? ` · ${last.tool}` : ` · ${t(COPY.waiting)}`}</small>
        </p>
      )}
    </div>
  );
}
