import type { CSSProperties, ReactNode } from "react";
import type { NarrationLanguage } from "../../lib/narration-language";
import type { CheckVisual, ScienceSceneId } from "../../lib/understanding-checks";
import styles from "./Climb.module.css";

const PERSON_TONES = ["var(--peach)", "var(--olive)", "var(--pink)", "var(--blue-grey)", "#b38b2e"] as const;

function cells(count: number) {
  return Array.from({ length: count }, (_, index) => index);
}

function trackStyle(parts: number): CSSProperties {
  return { gridTemplateColumns: `repeat(${parts}, minmax(0, 1fr))` };
}

function BarVisual({ wholes, parts, shaded, language }: { wholes: number; parts: number; shaded: number; language: NarrationLanguage }) {
  const label = language === "hi"
    ? `${wholes} whole, हर एक ${parts} बराबर हिस्सों में; ${shaded} हिस्से रँगे`
    : `${wholes === 1 ? "One whole" : `${wholes} wholes`}, each cut into ${parts} equal parts; ${shaded} parts shaded`;
  return (
    <div className={styles.barStack} role="img" aria-label={label}>
      {cells(wholes).map((whole) => (
        <div className={styles.barRow} key={whole}>
          <span className={styles.barWholeLabel}>{wholes > 1 ? (language === "hi" ? `पूरा ${whole + 1}` : `Whole ${whole + 1}`) : "1"}</span>
          <div className={styles.barTrack} style={trackStyle(parts)}>
            {cells(parts).map((part) => (
              <span className={whole * parts + part < shaded ? styles.cellShaded : styles.cell} key={part} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupsVisual({ wholes, parts, shadedEach, language }: { wholes: number; parts: number; shadedEach: number; language: NarrationLanguage }) {
  return (
    <div
      className={styles.plateRow}
      role="img"
      aria-label={language === "hi" ? `${wholes} plates, हर एक पर ${parts} में से ${shadedEach} हिस्से` : `${wholes} plates, each holding ${shadedEach} of ${parts} equal parts`}
    >
      {cells(wholes).map((whole) => (
        <div className={styles.plate} key={whole}>
          <div className={styles.barTrack} style={trackStyle(parts)}>
            {cells(parts).map((part) => <span className={part < shadedEach ? styles.cellShaded : styles.cell} key={part} />)}
          </div>
          <small>{language === "hi" ? `plate ${whole + 1}` : `Plate ${whole + 1}`}</small>
        </div>
      ))}
    </div>
  );
}

function SplitVisual({ parts, split, language }: { parts: number; split: number; language: NarrationLanguage }) {
  return (
    <div
      className={styles.splitWrap}
      role="img"
      aria-label={language === "hi"
        ? `एक whole ${parts} हिस्सों में; पहला हिस्सा ${split} छोटे बराबर हिस्सों में बँटा, एक छोटा हिस्सा highlighted`
        : `One whole in ${parts} parts; the first part is split into ${split} equal mini-pieces, with one highlighted`}
    >
      <div className={styles.barTrack} style={trackStyle(parts)}>
        {cells(parts).map((part) => (
          <span className={`${styles.splitCell} ${part === 0 ? styles.splitChosen : ""}`} key={part}>
            <span className={styles.splitMinis} style={trackStyle(split)}>
              {cells(split).map((mini) => <i className={part === 0 && mini === 0 ? styles.splitMiniActive : ""} key={mini} />)}
            </span>
          </span>
        ))}
      </div>
      <p className={styles.visualCaption}>{language === "hi" ? `पहला 1/${parts} → ${split} बराबर हिस्से` : `First 1/${parts} → ${split} equal pieces`}</p>
    </div>
  );
}

function AreaVisual({ rows, cols, rowsShaded, colsShaded, language }: { rows: number; cols: number; rowsShaded: number; colsShaded: number; language: NarrationLanguage }) {
  return (
    <div className={styles.areaWrap}>
      <div
        className={styles.areaGrid}
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        role="img"
        aria-label={language === "hi"
          ? `${rows} × ${cols} area model; ${rowsShaded} rows और ${colsShaded} columns रँगे`
          : `A ${rows} by ${cols} area model with ${rowsShaded} rows and ${colsShaded} columns shaded`}
      >
        {cells(rows * cols).map((index) => {
          const row = Math.floor(index / cols);
          const col = index % cols;
          const inRow = row < rowsShaded;
          const inCol = col < colsShaded;
          return <span className={inRow && inCol ? styles.areaBoth : inRow ? styles.areaRow : inCol ? styles.areaCol : styles.areaCell} key={index} />;
        })}
      </div>
      <ul className={styles.legend} aria-hidden="true">
        <li><i className={styles.areaRow} />{language === "hi" ? "rows" : "rows"}</li>
        <li><i className={styles.areaCol} />{language === "hi" ? "columns" : "columns"}</li>
        <li><i className={styles.areaBoth} />{language === "hi" ? "दोनों" : "both"}</li>
      </ul>
    </div>
  );
}

function ShareVisual({ wholes, people, language }: { wholes: number; people: number; language: NarrationLanguage }) {
  return (
    <div className={styles.shareWrap}>
      <div
        className={styles.barStack}
        role="img"
        aria-label={language === "hi"
          ? `${wholes} bars, हर एक ${people} हिस्सों में; हर रंग एक दोस्त का हिस्सा`
          : `${wholes} bars, each cut into ${people} pieces; each colour is one friend's share`}
      >
        {cells(wholes).map((whole) => (
          <div className={styles.barRow} key={whole}>
            <span className={styles.barWholeLabel}>{language === "hi" ? `bar ${whole + 1}` : `Bar ${whole + 1}`}</span>
            <div className={styles.barTrack} style={trackStyle(people)}>
              {cells(people).map((person) => (
                <span className={styles.cellPerson} style={{ "--person": PERSON_TONES[person % PERSON_TONES.length] } as CSSProperties} key={person} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <ul className={styles.legend} aria-hidden="true">
        {cells(people).map((person) => (
          <li key={person}><i style={{ background: PERSON_TONES[person % PERSON_TONES.length] }} />{language === "hi" ? `दोस्त ${person + 1}` : `Friend ${person + 1}`}</li>
        ))}
      </ul>
    </div>
  );
}

export function DotsVisual({ total, groupSize, language, compact = false }: { total: number; groupSize: number; language: NarrationLanguage; compact?: boolean }) {
  const groups = Math.ceil(total / groupSize);
  return (
    <div
      className={`${styles.dotGroups} ${compact ? styles.dotGroupsCompact : ""}`}
      role="img"
      aria-label={language === "hi" ? `${total} dots, ${groupSize}-${groupSize} के groups में` : `${total} dots in groups of ${groupSize}`}
    >
      {cells(groups).map((group) => (
        <span className={styles.dotGroup} key={group}>
          {cells(Math.min(groupSize, total - group * groupSize)).map((dot) => <i key={dot} />)}
        </span>
      ))}
    </div>
  );
}

function sceneLabel(scene: ScienceSceneId, language: NarrationLanguage, value?: number) {
  const labels: Record<ScienceSceneId, [string, string]> = {
    "rain-cloud": ["बादल से गिरती बारिश", "Rain falling from a cloud"],
    "sun-puddle": ["धूप में एक puddle; Bodh के tracker dots ऊपर जाती invisible जलवाष्प दिखाते हैं", "A puddle in sunshine; Bodh's tracker dots stand for invisible vapour rising"],
    "wet-clothes": ["धूप में सूखते कपड़े", "Clothes drying in the sunshine"],
    "two-puddles": ["एक puddle धूप में, एक पेड़ की छाँव में", "One puddle in sunshine and one in a tree's shade"],
    cycle: ["जल चक्र: समुद्र से vapour ऊपर, बादल, और बारिश नीचे", "The water cycle: vapour rising from the sea, a cloud, and rain falling"],
    thermometer: [`Thermometer ${value ?? ""}°C दिखा रहा है`, `A thermometer reading ${value ?? ""}°C`],
    cumulus: ["रुई जैसे fluffy बादल", "Puffy, cotton-like clouds"],
    stratus: ["आसमान पर फैली सपाट grey परत", "A flat grey layer of cloud"],
    cirrus: ["ऊँचे, पतले wisps", "High, thin wisps of cloud"],
    "cold-glass": ["ठंडे पानी का glass, बाहर बूँदें", "A glass of cold water with drops on the outside"],
    mirror: ["भाप से धुँधला शीशा, बूँदों के साथ", "A fogged mirror with droplets"],
    "ice-melt": ["धूप में पिघलती बर्फ", "Ice melting in the sunshine"],
    "freezer-tray": ["Freezer में बर्फ की tray", "An ice tray in a freezer"],
    "sugar-tea": ["चाय में चीनी डालता चम्मच", "A spoon adding sugar to tea"],
    "sand-water": ["पानी में नीचे बैठी रेत", "Sand settled at the bottom of water"],
    "salt-water": ["पानी में नमक", "Salt being added to water"],
    "ocean-share": ["धरती का पानी: लगभग सारा समुद्रों में", "Earth's water: almost all of it in the oceans"],
    particles: ["ठंडे और गरम पानी के कण: गरम कण तेज़ चलते हैं", "Particles in cool and warm water: warm particles move faster"],
  };
  return labels[scene][language === "hi" ? 0 : 1];
}

const Sun = ({ x, y }: { x: number; y: number }) => (
  <g className={styles.sceneSun}>
    <circle cx={x} cy={y} r="9" />
    {cells(8).map((ray) => {
      const angle = (ray * Math.PI) / 4;
      return <line key={ray} x1={x + Math.cos(angle) * 12} y1={y + Math.sin(angle) * 12} x2={x + Math.cos(angle) * 16} y2={y + Math.sin(angle) * 16} />;
    })}
  </g>
);

const Cloud = ({ x, y, scale = 1, tone = "light" }: { x: number; y: number; scale?: number; tone?: "light" | "dark" }) => (
  <g className={tone === "dark" ? styles.sceneCloudDark : styles.sceneCloud} transform={`translate(${x} ${y}) scale(${scale})`}>
    <circle cx="-14" cy="4" r="10" />
    <circle cx="0" cy="-4" r="13" />
    <circle cx="15" cy="3" r="10" />
    <rect x="-24" y="3" width="49" height="11" rx="5.5" />
  </g>
);

const Drops = ({ x, y, count = 4 }: { x: number; y: number; count?: number }) => (
  <g className={styles.sceneDrop}>
    {cells(count).map((drop) => <line key={drop} x1={x + drop * 9} y1={y + (drop % 2) * 5} x2={x + drop * 9 - 3} y2={y + 9 + (drop % 2) * 5} />)}
  </g>
);

const Tracker = ({ x, y }: { x: number; y: number }) => (
  <g className={styles.sceneTracker}>
    <circle cx={x} cy={y} r="2.2" />
    <circle cx={x + 7} cy={y - 10} r="2.2" />
    <circle cx={x - 5} cy={y - 20} r="2.2" />
  </g>
);

function sceneArt(id: ScienceSceneId, value?: number): ReactNode {
  switch (id) {
    case "rain-cloud":
      return <><Cloud x={80} y={32} scale={1.5} tone="dark" /><Drops x={60} y={62} count={5} /></>;
    case "sun-puddle":
      return <><Sun x={30} y={24} /><ellipse className={styles.scenePuddle} cx="95" cy="88" rx="42" ry="8" /><Tracker x={88} y={70} /><Tracker x={110} y={64} /></>;
    case "wet-clothes":
      return (
        <>
          <Sun x={28} y={22} />
          <line className={styles.sceneLine} x1="50" y1="40" x2="150" y2="40" />
          <rect className={styles.sceneCloth} x="62" y="40" width="28" height="34" rx="3" />
          <rect className={styles.sceneClothAlt} x="104" y="40" width="30" height="26" rx="3" />
          <Tracker x={76} y={34} />
          <Tracker x={120} y={34} />
        </>
      );
    case "two-puddles":
      return (
        <>
          <Sun x={24} y={20} />
          <ellipse className={styles.scenePuddle} cx="42" cy="86" rx="28" ry="7" />
          <line className={styles.sceneDivider} x1="80" y1="10" x2="80" y2="96" />
          <rect className={styles.sceneTrunk} x="130" y="46" width="7" height="38" />
          <circle className={styles.sceneLeaves} cx="133" cy="38" r="20" />
          <rect className={styles.sceneShade} x="92" y="80" width="62" height="14" rx="7" />
          <ellipse className={styles.scenePuddle} cx="120" cy="86" rx="28" ry="7" />
        </>
      );
    case "cycle":
      return (
        <>
          <Sun x={24} y={20} />
          <path className={styles.sceneSea} d="M0 84 Q20 78 40 84 T80 84 T120 84 T160 84 V100 H0Z" />
          <Cloud x={112} y={26} scale={1.1} />
          <path className={styles.sceneArrow} d="M52 74 C48 50 70 30 92 28" markerEnd="url(#bodh-arrow)" />
          <Drops x={104} y={44} count={3} />
          <path className={styles.sceneArrow} d="M134 44 C150 60 146 72 132 80" markerEnd="url(#bodh-arrow)" />
          <Tracker x={50} y={70} />
        </>
      );
    case "thermometer": {
      const reading = Math.max(-10, Math.min(100, value ?? 20));
      const height = 10 + ((reading + 10) / 110) * 62;
      return (
        <>
          <rect className={styles.sceneTube} x="72" y="8" width="16" height="78" rx="8" />
          <circle className={styles.sceneBulb} cx="80" cy="88" r="10" />
          <rect className={styles.sceneMercury} x="76" y={84 - height} width="8" height={height} rx="4" />
          {[0, 50, 100].map((mark) => {
            const y = 84 - (10 + ((mark + 10) / 110) * 62);
            return <g key={mark}><line className={styles.sceneLine} x1="90" y1={y} x2="98" y2={y} /><text className={styles.sceneText} x="102" y={y + 3}>{mark}°</text></g>;
          })}
          {value !== undefined && <text className={styles.sceneReading} x="20" y="54">{value}°C</text>}
        </>
      );
    }
    case "cumulus":
      return <><Cloud x={48} y={46} scale={1.2} /><Cloud x={116} y={38} scale={1.4} /></>;
    case "stratus":
      return <><rect className={styles.sceneStratus} x="0" y="22" width="160" height="26" rx="8" /><rect className={styles.sceneStratus} x="12" y="40" width="140" height="14" rx="7" /><Drops x={40} y={66} count={2} /><Drops x={104} y={70} count={2} /></>;
    case "cirrus":
      return (
        <g className={styles.sceneCirrus}>
          <path d="M14 30 C50 14 80 24 118 12" />
          <path d="M34 48 C70 34 104 42 146 28" />
          <path d="M20 66 C54 56 90 62 124 50" />
        </g>
      );
    case "cold-glass":
      return (
        <>
          <path className={styles.sceneGlass} d="M58 18 H102 L96 92 H64 Z" />
          <rect className={styles.sceneIce} x="68" y="40" width="12" height="12" rx="2" />
          <rect className={styles.sceneIce} x="82" y="50" width="11" height="11" rx="2" />
          {[[54, 40], [106, 34], [52, 62], [108, 58], [58, 80], [102, 78]].map(([x, y]) => <circle className={styles.sceneDroplet} cx={x} cy={y} r="2.6" key={`${x}-${y}`} />)}
        </>
      );
    case "mirror":
      return (
        <>
          <rect className={styles.sceneMirror} x="42" y="10" width="76" height="80" rx="10" />
          <rect className={styles.sceneFog} x="48" y="16" width="64" height="44" rx="8" />
          {[[58, 66], [72, 74], [90, 68], [102, 78], [64, 82]].map(([x, y]) => <circle className={styles.sceneDroplet} cx={x} cy={y} r="2.6" key={`${x}-${y}`} />)}
          <path className={styles.sceneSteam} d="M20 90 C14 76 26 70 20 56 M30 90 C24 76 36 70 30 56" />
        </>
      );
    case "ice-melt":
      return (
        <>
          <Sun x={28} y={22} />
          <rect className={styles.sceneIce} x="74" y="44" width="28" height="28" rx="4" />
          <ellipse className={styles.scenePuddle} cx="88" cy="80" rx="30" ry="6" />
        </>
      );
    case "freezer-tray":
      return (
        <>
          <rect className={styles.sceneFreezer} x="24" y="12" width="112" height="80" rx="8" />
          <rect className={styles.sceneTray} x="40" y="54" width="80" height="22" rx="4" />
          {cells(4).map((cube) => <rect className={styles.sceneIce} x={46 + cube * 18} y="58" width="14" height="14" rx="2" key={cube} />)}
          <g className={styles.sceneSnow}><line x1="80" y1="20" x2="80" y2="44" /><line x1="68" y1="32" x2="92" y2="32" /><line x1="71" y1="23" x2="89" y2="41" /><line x1="89" y1="23" x2="71" y2="41" /></g>
        </>
      );
    case "sugar-tea":
      return (
        <>
          <path className={styles.sceneCup} d="M44 42 H116 L108 88 H52 Z" />
          <path className={styles.sceneCupHandle} d="M116 50 C134 50 134 74 112 74" />
          <rect className={styles.sceneTea} x="48" y="46" width="64" height="10" rx="3" />
          <line className={styles.sceneSpoon} x1="92" y1="12" x2="82" y2="52" />
          {[[74, 26], [78, 34], [70, 36]].map(([x, y]) => <rect className={styles.sceneGrain} x={x} y={y} width="3" height="3" key={`${x}-${y}`} />)}
        </>
      );
    case "sand-water":
    case "salt-water":
      return (
        <>
          <path className={styles.sceneGlass} d="M50 14 H110 L106 92 H54 Z" />
          <rect className={styles.sceneWater} x="54" y="36" width="52" height="54" rx="3" />
          {id === "sand-water"
            ? <path className={styles.sceneSand} d="M55 90 Q66 80 80 84 T105 82 V90 Z" />
            : <><rect className={styles.sceneShaker} x="118" y="8" width="18" height="26" rx="4" />{[[112, 40], [116, 48], [108, 52]].map(([x, y]) => <rect className={styles.sceneGrain} x={x} y={y} width="3" height="3" key={`${x}-${y}`} />)}</>}
        </>
      );
    case "ocean-share":
      return (
        <>
          <rect className={styles.sceneOceanBar} x="8" y="38" width="140" height="24" rx="6" />
          <rect className={styles.sceneIceBar} x="148" y="38" width="3.5" height="24" />
          <rect className={styles.sceneFreshBar} x="151.5" y="38" width="1.5" height="24" />
          <text className={styles.sceneText} x="12" y="30">{"≈97%"}</text>
          <text className={styles.sceneText} x="118" y="80">{"≈3%"}</text>
        </>
      );
    case "particles":
      return (
        <>
          <rect className={styles.sceneBox} x="8" y="30" width="64" height="60" rx="6" />
          <rect className={styles.sceneBoxWarm} x="88" y="30" width="64" height="60" rx="6" />
          {[[22, 70], [36, 78], [50, 68], [28, 56], [58, 80]].map(([x, y]) => <circle className={styles.sceneParticle} cx={x} cy={y} r="3.5" key={`c${x}-${y}`} />)}
          {[[100, 70], [118, 56], [134, 76], [110, 82], [142, 60]].map(([x, y]) => (
            <g key={`w${x}-${y}`}>
              <circle className={styles.sceneParticleWarm} cx={x} cy={y} r="3.5" />
              <line className={styles.sceneMotion} x1={x - 11} y1={y + 4} x2={x - 5} y2={y + 1} />
            </g>
          ))}
          <circle className={styles.sceneParticleWarm} cx="126" cy="18" r="3.5" />
          <line className={styles.sceneMotion} x1="126" y1="32" x2="126" y2="24" />
        </>
      );
  }
}

function SceneVisual({ id, value, language }: { id: ScienceSceneId; value?: number; language: NarrationLanguage }) {
  return (
    <figure className={styles.sceneFigure}>
      <svg className={styles.sceneSvg} viewBox="0 0 160 100" role="img" aria-label={sceneLabel(id, language, value)}>
        <defs>
          <marker id="bodh-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" className={styles.sceneArrowHead} />
          </marker>
        </defs>
        {sceneArt(id, value)}
      </svg>
      {(id === "sun-puddle" || id === "wet-clothes" || id === "cycle") && (
        <figcaption>{language === "hi" ? "Dots = Bodh का tracker; असली जलवाष्प दिखती नहीं" : "Dots = Bodh's tracker; real vapour is invisible"}</figcaption>
      )}
    </figure>
  );
}

export function CheckVisualView({ visual, language }: { visual: CheckVisual; language: NarrationLanguage }) {
  switch (visual.kind) {
    case "bar":
      return <BarVisual wholes={visual.wholes} parts={visual.parts} shaded={visual.shaded} language={language} />;
    case "groups":
      return <GroupsVisual wholes={visual.wholes} parts={visual.parts} shadedEach={visual.shadedEach} language={language} />;
    case "split":
      return <SplitVisual parts={visual.parts} split={visual.split} language={language} />;
    case "area":
      return <AreaVisual rows={visual.rows} cols={visual.cols} rowsShaded={visual.rowsShaded} colsShaded={visual.colsShaded} language={language} />;
    case "share":
      return <ShareVisual wholes={visual.wholes} people={visual.people} language={language} />;
    case "dots":
      return <DotsVisual total={visual.total} groupSize={visual.groupSize} language={language} />;
    case "expression":
      return <p className={styles.expression} lang="en">{visual.text}</p>;
    case "scene":
      return <SceneVisual id={visual.scene} value={visual.value} language={language} />;
  }
}
