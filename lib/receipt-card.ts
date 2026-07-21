import type { NarrationLanguage } from "./narration-language";
import type { ReceiptShareVariant } from "./demo-journey-copy";

export const RECEIPT_CARD_VERSION = "bodh-receipt-card-v1" as const;
export const RECEIPT_CARD_WIDTH = 1200;
export const RECEIPT_CARD_HEIGHT = 1500;
export const RECEIPT_CARD_MASCOT_SRC = "/art/bodh/bodh-celebrate-1024.webp";

type ReceiptCardNode = Readonly<{
  label: string;
  x: number;
}>;

export type ReceiptCardModel = Readonly<{
  version: typeof RECEIPT_CARD_VERSION;
  language: NarrationLanguage;
  variant: ReceiptShareVariant;
  brand: string;
  tagline: string;
  badge: string;
  title: string;
  ideaLabel: string;
  idea: string;
  evidence: string;
  firstLabel: string;
  firstEquation: string;
  transferLabel: string;
  transferEquation: string;
  trust: string;
  nodes: readonly ReceiptCardNode[];
}>;

export type ReceiptCardScene = Readonly<{
  version: typeof RECEIPT_CARD_VERSION;
  width: typeof RECEIPT_CARD_WIDTH;
  height: typeof RECEIPT_CARD_HEIGHT;
  mascotSrc: typeof RECEIPT_CARD_MASCOT_SRC;
  model: ReceiptCardModel;
  palette: Readonly<{
    canvas: string;
    surface: string;
    ink: string;
    inkSoft: string;
    blueGrey: string;
    blueGreyDeep: string;
    pink: string;
    pinkSoft: string;
    peach: string;
    peachSoft: string;
    olive: string;
    oliveSoft: string;
  }>;
}>;

const NODE_X = [210, 470, 730, 990] as const;

const VARIANT_TITLE: Record<ReceiptShareVariant, { hi: string; en: string }> = {
  independent: {
    hi: "मैंने नई कहानी में idea अपने दम पर इस्तेमाल की।",
    en: "I used the idea independently in a new story.",
  },
  supported: {
    hi: "मैंने support के बाद नई कहानी में idea इस्तेमाल की।",
    en: "I used the idea in a new story after support.",
  },
  curated: {
    hi: "मैंने एक idea को दो अलग सवालों में इस्तेमाल किया।",
    en: "I used one idea in two different questions.",
  },
};

/**
 * Builds the complete export model from reviewed, fixed curriculum copy only.
 * It deliberately accepts no learner text, upload, trace, score, name, or ID.
 */
export function createReceiptCardModel(
  language: NarrationLanguage,
  variant: ReceiptShareVariant,
): ReceiptCardModel {
  const isHindi = language === "hi";
  const labels = isHindi
    ? ["जाँचा", "बनाया", "नई जगह", "लौटे"]
    : ["Checked", "Built", "New case", "Returned"];

  return {
    version: RECEIPT_CARD_VERSION,
    language,
    variant,
    brand: "BODH",
    tagline: isHindi ? "जो सच में समझ आया" : "That which is truly understood",
    badge: isHindi ? "आज की समझ" : "TODAY'S UNDERSTANDING",
    title: VARIANT_TITLE[variant][language],
    ideaLabel: isHindi ? "आज की बड़ी idea" : "TODAY'S BIG IDEA",
    idea: isHindi
      ? "Division पूछ सकती है: इस size के कितने बराबर groups fit होते हैं?"
      : "Division can ask: how many equal groups of this size fit here?",
    evidence: isHindi
      ? "1/8 के छह groups बनाए · यही relationship 1/6-size groups में भी इस्तेमाल की"
      : "Built six 1/8-size groups · used the same relationship with 1/6-size groups",
    firstLabel: isHindi ? "पहला सवाल" : "FIRST QUESTION",
    firstEquation: "3/4 ÷ 1/8 = 6",
    transferLabel: isHindi ? "नई कहानी" : "NEW STORY",
    transferEquation: "2/3 ÷ 1/6 = 4",
    trust: isHindi
      ? "यह आज के actions का evidence है—grade या long-term mastery का दावा नहीं।"
      : "This records today's actions—not a grade or a claim of long-term mastery.",
    nodes: labels.map((label, index) => ({ label, x: NODE_X[index] })),
  };
}

/**
 * Uses the same reviewed receipt contract and visual grammar for the science
 * journey. Like the mathematics receipt, it accepts no learner payload, score,
 * name, or unreviewed model text.
 */
export function createEvaporationReceiptCardModel(
  language: NarrationLanguage,
): ReceiptCardModel {
  const isHindi = language === "hi";
  const labels = isHindi
    ? ["देखा", "खोजा", "नई जगह", "समझाया"]
    : ["Noticed", "Tracked", "New case", "Explained"];

  return {
    version: RECEIPT_CARD_VERSION,
    language,
    variant: "curated",
    brand: "BODH",
    tagline: isHindi ? "जो सच में समझ आया" : "That which is truly understood",
    badge: isHindi ? "यात्रा पूरी · 6/6" : "JOURNEY COMPLETE · 6/6",
    title: isHindi
      ? "मैंने उसी पानी को नई स्थिति में भी खोजा।"
      : "I tracked the same water in a new situation.",
    ideaLabel: isHindi ? "आज का बड़ा विचार" : "TODAY'S BIG IDEA",
    idea: isHindi
      ? "पानी गायब नहीं होता—उसका रूप और जगह बदल सकते हैं।"
      : "Water does not disappear—it can change state and location.",
    evidence: isHindi
      ? "पानी की 12/12 गिनती पूरी की · ठंडे ढक्कन पर वही विचार आज़माया"
      : "Tracked 12/12 water from the puddle · used the same idea with a cold lid",
    firstLabel: isHindi ? "पानी की पहली यात्रा" : "PUDDLE JOURNEY",
    firstEquation: isHindi ? "तरल → अदृश्य जलवाष्प" : "liquid → invisible vapour",
    transferLabel: isHindi ? "नई स्थिति" : "NEW SITUATION",
    transferEquation: isHindi ? "जलवाष्प → तरल बूँदें" : "vapour → liquid drops",
    trust: isHindi
      ? "यह आज किए काम का सबूत है—अंक या लंबे समय की महारत का दावा नहीं।"
      : "This records today's actions—not a grade or a claim of long-term mastery.",
    nodes: labels.map((label, index) => ({ label, x: NODE_X[index] })),
  };
}

export function createReceiptCardScene(
  language: NarrationLanguage,
  variant: ReceiptShareVariant,
): ReceiptCardScene {
  return {
    version: RECEIPT_CARD_VERSION,
    width: RECEIPT_CARD_WIDTH,
    height: RECEIPT_CARD_HEIGHT,
    mascotSrc: RECEIPT_CARD_MASCOT_SRC,
    model: createReceiptCardModel(language, variant),
    palette: {
      canvas: "#fdf7ec",
      surface: "#fffdf8",
      ink: "#343035",
      inkSoft: "#6a6367",
      blueGrey: "#5e7588",
      blueGreyDeep: "#40586b",
      pink: "#bd3e66",
      pinkSoft: "#f7d6e0",
      peach: "#e18a55",
      peachSoft: "#f9dcc6",
      olive: "#6d7d40",
      oliveSoft: "#e3e7cd",
    },
  };
}

export function receiptCardFileName(model: ReceiptCardModel) {
  return `bodh-learning-receipt-${model.language}-${model.variant}.png`;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function drawCenteredWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  top: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/u);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);

  const visible = lines.slice(0, maxLines);
  context.textAlign = "center";
  visible.forEach((value, index) => context.fillText(value, centerX, top + index * lineHeight));
  return visible.length * lineHeight;
}

async function loadCanvasImage(src: string): Promise<CanvasImageSource> {
  const image = new Image();
  image.decoding = "sync";
  image.src = src;
  await image.decode();
  return image;
}

async function waitForReceiptFonts(model: ReceiptCardModel) {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all([
    document.fonts.load('800 64px "Baloo 2"', model.title),
    document.fonts.load('700 32px "Mukta"', model.idea),
    document.fonts.ready,
  ]);
}

export type ReceiptCanvasDependencies = Readonly<{
  createCanvas?: () => HTMLCanvasElement;
  loadImage?: (src: string) => Promise<CanvasImageSource>;
  waitForFonts?: (model: ReceiptCardModel) => Promise<void>;
}>;

/** Draws a fixed 4:5 scene. There is no clock, randomness, remote data, or learner input. */
export async function renderReceiptCardPng(
  model: ReceiptCardModel,
  dependencies: ReceiptCanvasDependencies = {},
) {
  const scene = createReceiptCardScene(model.language, model.variant);
  const canvas = dependencies.createCanvas?.() ?? document.createElement("canvas");
  canvas.width = scene.width;
  canvas.height = scene.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("receipt_canvas_unavailable");

  await (dependencies.waitForFonts ?? waitForReceiptFonts)(model);
  const mascot = await (dependencies.loadImage ?? loadCanvasImage)(scene.mascotSrc);
  const { palette, width, height } = scene;

  context.clearRect(0, 0, width, height);
  context.fillStyle = palette.canvas;
  context.fillRect(0, 0, width, height);

  context.save();
  roundedRect(context, 54, 54, width - 108, height - 108, 60);
  context.clip();
  context.fillStyle = palette.surface;
  context.fillRect(54, 54, width - 108, height - 108);

  context.globalAlpha = 0.9;
  context.fillStyle = palette.pinkSoft;
  context.beginPath();
  context.arc(1050, 180, 210, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = palette.oliveSoft;
  context.beginPath();
  context.arc(130, 1335, 180, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;

  context.fillStyle = palette.blueGreyDeep;
  context.font = '800 42px "Baloo 2", sans-serif';
  context.textAlign = "left";
  context.fillText(model.brand, 110, 130);
  context.fillStyle = palette.inkSoft;
  context.font = '700 20px "Mukta", sans-serif';
  context.fillText(model.tagline, 110, 160);

  roundedRect(context, 776, 98, 310, 58, 29);
  context.fillStyle = palette.pink;
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = '800 21px "Mukta", sans-serif';
  context.textAlign = "center";
  context.fillText(model.badge, 931, 135);

  context.fillStyle = palette.ink;
  context.font = '800 64px "Baloo 2", "Mukta", sans-serif';
  drawCenteredWrappedText(context, model.title, width / 2, 235, 920, 72, 2);

  context.fillStyle = palette.peachSoft;
  context.beginPath();
  context.arc(width / 2, 575, 265, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = palette.pinkSoft;
  context.beginPath();
  context.arc(375, 560, 34, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = palette.oliveSoft;
  context.beginPath();
  context.arc(842, 660, 45, 0, Math.PI * 2);
  context.fill();
  context.drawImage(mascot, 350, 320, 500, 500);

  context.strokeStyle = palette.blueGrey;
  context.lineWidth = 12;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(NODE_X[0], 870);
  context.lineTo(NODE_X[NODE_X.length - 1], 870);
  context.stroke();

  model.nodes.forEach((node, index) => {
    context.fillStyle = index % 2 === 0 ? palette.pink : palette.olive;
    context.beginPath();
    context.arc(node.x, 870, 39, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#ffffff";
    context.lineWidth = 7;
    context.beginPath();
    context.moveTo(node.x - 15, 870);
    context.lineTo(node.x - 3, 882);
    context.lineTo(node.x + 18, 857);
    context.stroke();
    context.fillStyle = palette.ink;
    context.font = '700 23px "Mukta", sans-serif';
    context.textAlign = "center";
    context.fillText(node.label, node.x, 937);
  });

  roundedRect(context, 110, 985, 980, 220, 34);
  context.fillStyle = palette.blueGreyDeep;
  context.fill();
  context.fillStyle = palette.peachSoft;
  context.font = '800 21px "Mukta", sans-serif';
  context.textAlign = "center";
  context.fillText(model.ideaLabel, width / 2, 1035);
  context.fillStyle = "#ffffff";
  context.font = '800 35px "Baloo 2", "Mukta", sans-serif';
  drawCenteredWrappedText(context, model.idea, width / 2, 1086, 850, 43, 2);
  context.fillStyle = "#e3e9ed";
  context.font = '700 22px "Mukta", sans-serif';
  drawCenteredWrappedText(context, model.evidence, width / 2, 1171, 850, 30, 2);

  const equationCards = [
    { x: 110, label: model.firstLabel, equation: model.firstEquation, color: palette.peachSoft },
    { x: 610, label: model.transferLabel, equation: model.transferEquation, color: palette.oliveSoft },
  ];
  equationCards.forEach((card) => {
    roundedRect(context, card.x, 1242, 480, 126, 28);
    context.fillStyle = card.color;
    context.fill();
    context.fillStyle = palette.inkSoft;
    context.font = '800 18px "Mukta", sans-serif';
    context.textAlign = "center";
    context.fillText(card.label, card.x + 240, 1280);
    context.fillStyle = palette.blueGreyDeep;
    context.font = '800 36px "Baloo 2", sans-serif';
    context.fillText(card.equation, card.x + 240, 1331);
  });

  context.fillStyle = palette.inkSoft;
  context.font = '700 20px "Mukta", sans-serif';
  drawCenteredWrappedText(context, model.trust, width / 2, 1411, 920, 27, 2);
  context.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("receipt_png_unavailable"));
    }, "image/png");
  });
}

export type ReceiptShareResult =
  | "shared-file"
  | "shared-text"
  | "copied"
  | "cancelled"
  | "failed";

type ReceiptNavigator = Pick<Navigator, "canShare" | "share"> & {
  clipboard?: Pick<Clipboard, "writeText">;
};

export type ReceiptShareDependencies = Readonly<{
  navigator?: ReceiptNavigator;
  renderPng?: (model: ReceiptCardModel) => Promise<Blob>;
  createFile?: (blob: Blob, name: string) => File;
}>;

function wasCancelled(error: unknown) {
  return Boolean(error && typeof error === "object" && "name" in error && error.name === "AbortError");
}

function defaultFile(blob: Blob, name: string) {
  return new File([blob], name, { type: "image/png", lastModified: 0 });
}

/** Prefer a privacy-safe PNG file, then the existing fixed text share, then clipboard. */
export async function shareReceiptCard(
  model: ReceiptCardModel,
  title: string,
  text: string,
  dependencies: ReceiptShareDependencies = {},
): Promise<ReceiptShareResult> {
  const navigatorBridge = dependencies.navigator ?? navigator;
  const renderPng = dependencies.renderPng ?? renderReceiptCardPng;
  const createFile = dependencies.createFile ?? defaultFile;

  if (typeof navigatorBridge.share === "function") {
    try {
      const blob = await renderPng(model);
      const file = createFile(blob, receiptCardFileName(model));
      const fileShare = { files: [file], title, text };
      if (typeof navigatorBridge.canShare === "function" && navigatorBridge.canShare(fileShare)) {
        try {
          await navigatorBridge.share(fileShare);
          return "shared-file";
        } catch (error) {
          if (wasCancelled(error)) return "cancelled";
        }
      }
    } catch {
      // A text-only share remains useful when this browser cannot render or share files.
    }

    try {
      await navigatorBridge.share({ title, text });
      return "shared-text";
    } catch (error) {
      if (wasCancelled(error)) return "cancelled";
    }
  }

  try {
    if (!navigatorBridge.clipboard?.writeText) return "failed";
    await navigatorBridge.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

type DownloadAnchor = Pick<HTMLAnchorElement, "click" | "download" | "href" | "rel">;

export type ReceiptDownloadDependencies = Readonly<{
  renderPng?: (model: ReceiptCardModel) => Promise<Blob>;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
  createAnchor?: () => DownloadAnchor;
  scheduleCleanup?: (callback: () => void) => void;
}>;

export async function downloadReceiptCardPng(
  model: ReceiptCardModel,
  dependencies: ReceiptDownloadDependencies = {},
) {
  const blob = await (dependencies.renderPng ?? renderReceiptCardPng)(model);
  const createObjectUrl = dependencies.createObjectUrl ?? URL.createObjectURL.bind(URL);
  const revokeObjectUrl = dependencies.revokeObjectUrl ?? URL.revokeObjectURL.bind(URL);
  const createAnchor = dependencies.createAnchor ?? (() => document.createElement("a"));
  const scheduleCleanup = dependencies.scheduleCleanup ?? ((callback) => window.setTimeout(callback, 0));
  const url = createObjectUrl(blob);
  const anchor = createAnchor();
  anchor.href = url;
  anchor.download = receiptCardFileName(model);
  anchor.rel = "noopener";
  anchor.click();
  scheduleCleanup(() => revokeObjectUrl(url));
  return anchor.download;
}
