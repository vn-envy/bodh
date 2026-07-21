import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  RECEIPT_CARD_HEIGHT,
  RECEIPT_CARD_WIDTH,
  createEvaporationReceiptCardModel,
  createReceiptCardModel,
  createReceiptCardScene,
  downloadReceiptCardPng,
  receiptCardFileName,
  shareReceiptCard,
} from "../lib/receipt-card.ts";

test("science and mathematics receipts share one deterministic visual contract", () => {
  for (const language of ["hi", "en"]) {
    const science = createEvaporationReceiptCardModel(language);
    const mathematics = createReceiptCardModel(language, "curated");

    assert.equal(science.version, mathematics.version);
    assert.equal(science.brand, mathematics.brand);
    assert.equal(science.tagline, mathematics.tagline);
    assert.equal(science.variant, "curated");
    assert.equal(science.nodes.length, mathematics.nodes.length);
    assert.deepEqual(science.nodes.map(({ x }) => x), mathematics.nodes.map(({ x }) => x));
    assert.match(science.badge, /6\/6/);
    assert.match(science.idea, language === "hi" ? /पानी गायब नहीं होता/ : /Water does not disappear/);
    assert.match(science.evidence, /12\/12/);
    assert.match(science.trust, /mastery|long-term|महारत/i);
    assert.doesNotMatch(
      JSON.stringify(science),
      /learnerText|traceId|upload|studentName|Date\(|Math\.random/i,
    );
  }
});

test("receipt image scenes are fixed, bilingual, and contain no learner payload fields", () => {
  for (const language of ["hi", "en"]) {
    for (const variant of ["independent", "supported", "curated"]) {
      const first = createReceiptCardScene(language, variant);
      const second = createReceiptCardScene(language, variant);
      assert.deepEqual(first, second);
      assert.equal(first.width, RECEIPT_CARD_WIDTH);
      assert.equal(first.height, RECEIPT_CARD_HEIGHT);
      assert.equal(first.model.nodes.length, 4);
      assert.equal(receiptCardFileName(first.model), `bodh-learning-receipt-${language}-${variant}.png`);
      const serialised = JSON.stringify(first);
      assert.doesNotMatch(serialised, /learnerText|traceId|upload|studentName|Date\(|Math\.random/i);
      assert.match(first.model.trust, /mastery|long-term/i);
    }
  }
});

test("share prefers a PNG file when the platform accepts files", async () => {
  const model = createReceiptCardModel("en", "independent");
  const shares = [];
  let copied = false;
  const result = await shareReceiptCard(model, "Bodh receipt", "fixed receipt text", {
    navigator: {
      canShare: (payload) => payload.files?.length === 1,
      share: async (payload) => shares.push(payload),
      clipboard: { writeText: async () => { copied = true; } },
    },
    renderPng: async () => new Blob(["png"], { type: "image/png" }),
    createFile: (_blob, name) => ({ name, type: "image/png" }),
  });

  assert.equal(result, "shared-file");
  assert.equal(shares.length, 1);
  assert.equal(shares[0].files[0].name, "bodh-learning-receipt-en-independent.png");
  assert.equal(shares[0].text, "fixed receipt text");
  assert.equal(copied, false);
});

test("share falls back from unsupported files to text, then from failed share to clipboard", async () => {
  const model = createReceiptCardModel("hi", "supported");
  const textShares = [];
  const textResult = await shareReceiptCard(model, "शीर्षक", "fixed Hindi receipt", {
    navigator: {
      canShare: () => false,
      share: async (payload) => textShares.push(payload),
    },
    renderPng: async () => new Blob(["png"]),
    createFile: () => ({ name: "receipt.png" }),
  });
  assert.equal(textResult, "shared-text");
  assert.deepEqual(textShares, [{ title: "शीर्षक", text: "fixed Hindi receipt" }]);

  const copied = [];
  const clipboardResult = await shareReceiptCard(model, "शीर्षक", "fixed Hindi receipt", {
    navigator: {
      canShare: () => false,
      share: async () => { throw new Error("share unavailable"); },
      clipboard: { writeText: async (value) => copied.push(value) },
    },
    renderPng: async () => { throw new Error("canvas unavailable"); },
  });
  assert.equal(clipboardResult, "copied");
  assert.deepEqual(copied, ["fixed Hindi receipt"]);
});

test("download uses the deterministic PNG filename and revokes its object URL", async () => {
  const model = createReceiptCardModel("en", "curated");
  const anchor = { href: "", download: "", rel: "", clicks: 0, click() { this.clicks += 1; } };
  const revoked = [];
  const filename = await downloadReceiptCardPng(model, {
    renderPng: async () => new Blob(["png"], { type: "image/png" }),
    createObjectUrl: () => "blob:receipt",
    revokeObjectUrl: (url) => revoked.push(url),
    createAnchor: () => anchor,
    scheduleCleanup: (callback) => callback(),
  });

  assert.equal(filename, "bodh-learning-receipt-en-curated.png");
  assert.equal(anchor.href, "blob:receipt");
  assert.equal(anchor.download, filename);
  assert.equal(anchor.rel, "noopener");
  assert.equal(anchor.clicks, 1);
  assert.deepEqual(revoked, ["blob:receipt"]);
});

test("canvas renderer source uses only the committed mascot and fixed scene inputs", async () => {
  const source = await readFile(new URL("../lib/receipt-card.ts", import.meta.url), "utf8");
  assert.match(source, /bodh-celebrate-1024\.webp/);
  assert.match(source, /canvas\.toBlob/);
  assert.match(source, /files: \[file\]/);
  assert.doesNotMatch(source, /fetch\(|Math\.random|Date\.now|localStorage|sessionStorage/);
});
