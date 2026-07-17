import type { Ref } from "react";
import {
  createReceiptCardModel,
  type ReceiptCardModel,
} from "../../lib/receipt-card";
import type { NarrationLanguage } from "../../lib/narration-language";
import type { ReceiptShareVariant } from "../../lib/demo-journey-copy";
import { BodhMark } from "./BodhMark";
import styles from "./ReceiptImageCard.module.css";

type ReceiptImageCardProps = Readonly<{
  language: NarrationLanguage;
  variant: ReceiptShareVariant;
  headingRef?: Ref<HTMLHeadingElement>;
}>;

export function ReceiptImageCard({ language, variant, headingRef }: ReceiptImageCardProps) {
  const model = createReceiptCardModel(language, variant);

  return (
    <section
      className={styles.card}
      data-receipt-card-version={model.version}
      aria-labelledby="receipt-card-title"
    >
      <div className={styles.confetti} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <header className={styles.header}>
        <div className={styles.brand}>
          <strong>{model.brand}</strong>
          <small>{model.tagline}</small>
        </div>
        <span className={styles.badge}>{model.badge}</span>
      </header>

      <h1 className={styles.title} id="receipt-card-title" ref={headingRef} tabIndex={-1}>
        {model.title}
      </h1>

      <div className={styles.mascotStage}>
        <span className={styles.mascotHalo} aria-hidden="true" />
        <BodhMark
          pose="celebrate"
          size="large"
          motion="celebrate"
          className={styles.mascot}
          decorative={false}
        />
      </div>

      <ReceiptProgressGraph model={model} />

      <section className={styles.ideaPanel} aria-label={model.ideaLabel}>
        <span>{model.ideaLabel}</span>
        <strong>{model.idea}</strong>
        <p>{model.evidence}</p>
      </section>

      <div className={styles.equations}>
        <EquationCard label={model.firstLabel} equation={model.firstEquation} tone="peach" />
        <EquationCard label={model.transferLabel} equation={model.transferEquation} tone="olive" />
      </div>

      <p className={styles.trust}>{model.trust}</p>
    </section>
  );
}

function ReceiptProgressGraph({ model }: { model: ReceiptCardModel }) {
  return (
    <ol className={styles.path} aria-label={model.language === "hi" ? "आज की learning journey" : "Today's learning journey"}>
      {model.nodes.map((node) => (
        <li key={node.label}>
          <span aria-hidden="true">✓</span>
          <strong>{node.label}</strong>
        </li>
      ))}
    </ol>
  );
}

function EquationCard({
  label,
  equation,
  tone,
}: {
  label: string;
  equation: string;
  tone: "peach" | "olive";
}) {
  return (
    <section className={tone === "peach" ? styles.equationPeach : styles.equationOlive}>
      <span>{label}</span>
      <strong>{equation}</strong>
    </section>
  );
}
