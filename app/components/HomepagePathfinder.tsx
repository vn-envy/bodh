import taxonomy from "../../data/taxonomy/fractions-division.slice.json";
import type { NarrationLanguage } from "../../lib/narration-language";
import { BodhMark } from "./BodhMark";
import styles from "./HomepagePathfinder.module.css";

const PATH_TOPIC_IDS = [
  "mt_ndGqFPWyen",
  "mt_09sySPqM9Z",
  "mt_TgHxujL81r",
  "mt_AabJisinfi",
  "mt_9Y96vxG_LH",
] as const;

const PATH_LABELS = {
  mt_ndGqFPWyen: {
    hi: "Whole के बराबर हिस्से",
    en: "Equal parts of a whole",
  },
  mt_09sySPqM9Z: {
    hi: "Unit fractions से amount",
    en: "Build with unit fractions",
  },
  mt_TgHxujL81r: {
    hi: "Fraction को दोहराना",
    en: "Repeat a fraction",
  },
  mt_AabJisinfi: {
    hi: "Fractions को multiply करना",
    en: "Multiply fractions",
  },
  mt_9Y96vxG_LH: {
    hi: "Fractions को divide करना",
    en: "Divide fractions",
  },
} as const;

const topicsById = new Map(taxonomy.topics.map((topic) => [topic.id, topic]));

export function HomepagePathfinder({ language }: { language: NarrationLanguage }) {
  const english = language === "en";

  return (
    <article className={styles.card} aria-labelledby="home-pathfinder-title" role="listitem">
      <div className={styles.heading}>
        <span className={styles.rolePill}>
          <b aria-hidden="true">2</b>
          {english ? "The pathfinder" : "रास्ता दिखाने वाला"}
        </span>
        <span className={styles.source} lang="en">Real Marble route</span>
      </div>

      <div className={styles.routeCanvas}>
        <div className={styles.sun} aria-hidden="true"><i /></div>
        <div className={styles.edges} aria-hidden="true">
          <i className={styles.edgeOne} />
          <i className={styles.edgeTwo} />
          <i className={styles.edgeThree} />
          <i className={styles.edgeFour} />
        </div>
        <BodhMark
          className={styles.mascot}
          pose="guide"
          size="small"
          motion="guide"
          decorative={false}
        />
        <ol className={styles.routeList} aria-label={english ? "Example prerequisite route" : "Prerequisite route का उदाहरण"}>
          {PATH_TOPIC_IDS.map((topicId, index) => {
            const topic = topicsById.get(topicId);
            return (
              <li className={`${styles.node} ${styles[`node${index + 1}`]}`} key={topicId}>
                <span aria-hidden="true">{index + 1}</span>
                <strong>{PATH_LABELS[topicId][language]}</strong>
                <small>{english ? `Ages ${topic?.ageRangeStart}–${topic?.ageRangeEnd}` : `उम्र ${topic?.ageRangeStart}–${topic?.ageRangeEnd}`}</small>
              </li>
            );
          })}
        </ol>
      </div>

      <div className={styles.copy}>
        <h3 id="home-pathfinder-title">{english ? "Find the first shaky foothold." : "सबसे पहली डगमगाती पकड़ ढूँढो।"}</h3>
        <p>{english
          ? "Bodh traces the doubt back through real prerequisite concepts, then shows one small route upward."
          : "Bodh doubt को असली prerequisite concepts में पीछे तक खोजता है, फिर ऊपर जाने का एक छोटा रास्ता दिखाता है।"}</p>
        <small>{english
          ? "An example route—not a grade, mastery score, or claim of full curriculum coverage."
          : "यह example route है—grade, mastery score या पूरे curriculum coverage का दावा नहीं।"}</small>
      </div>
    </article>
  );
}
