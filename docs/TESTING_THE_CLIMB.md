# Testing the Understanding Climb

This guide covers what changed in the Understanding Climb release, how to run it, and what you should see in each end-to-end scenario. Every scenario lists the exact clicks and the result to expect, so a mismatch is easy to spot.

## What changed, in one paragraph

Bodh already repaired a single doubt well. The new **Understanding Climb** (`/climb`) checks whether understanding is real and whether it lasts, using the **same two Marble slices** (18 topics, 21 canonical dependencies) with nothing added to the curriculum. Every check is tied to one of the 54 Marble evidence statements. The learner says how sure they are before checking. A wrong answer explains the specific misconception behind it. A confident miss steps down the Marble prerequisite graph to where that idea is repaired, and firm evidence comes back for review after 1, 3, 7, and 21 days. Every journey receipt now links into the Climb on the doubt's own Marble topic.

## Ways to run it

| Option | Use it for | How |
|---|---|---|
| Hosted preview | Clicking through everything without installing anything | Open the private preview link from the pull request. A **Preview tools** tab on the left edge lets you jump time forward and reset. |
| Local development | Full app, including hosted voice and live diagnosis if you add a key | `npm install`, then `npm run dev`, then open the printed URL and go to `/climb` |
| Local production build | Closest to the deployed site | `npm run build`, then `npm run start` |

### How the hosted preview differs from production

The preview is a static build of the real page components with a few small stand-ins:

- **No live AI diagnosis.** `/diagnose` answers exactly as production does when no OpenAI key is configured: a labelled "safe learning path" card that opens the reviewed maths or science journey. The `/learn` live repair page therefore shows its "live handoff required" state.
- **No hosted Bodh voice.** "Listen" falls back to your device's voice where the browser supports it.
- **The frame blocks some browser features.** Downloading the receipt PNG, printing, the share sheet, and the microphone do nothing inside the preview frame. They work on the real site.
- **Links stay inside the preview.** Page links use an in-page router, and your place is kept if you reload.
- **Time travel is preview-only.** The real app always uses the real clock.

## Scenario 1: Find the Climb from the homepage

1. Open the home page. The default language is Hindi.
2. Scroll past the science section.

**Expect:** a new section headed "एक बार समझना काफी नहीं। समझ टिकनी चाहिए।" ("Understanding once is not enough. It has to last.") with four steps (देखो / समझाओ / लगाओ / टिकाओ) and a button "समझ की चढ़ाई शुरू करें". After you have firm evidence, a line such as "3 evidence पक्के · इसी device पर" appears. When reviews are due, the button changes to "आज की N याद-जाँच करें".

3. Click the button.

**Expect:** the Climb page with:
- stat tiles for Firm evidence 0/30 and Lasting 0/30
- a Maths / Science switch
- a suggestion card, "Bodh suggests: next foothold → Equal parts of one whole", explained as a foundation of the Marble graph
- a map with the summit "Divide fractions" at the top and the foundations at the bottom
- three empty dots on every foothold, one per Marble evidence statement

Use the हिंदी / English toggle anywhere; every screen, check, and piece of feedback is bilingual.

## Scenario 2: A clean first climb (see it, explain it, build it)

1. Click **Start · 3 checks** on the suggestion ("Equal parts of one whole").
2. **Check 1 (See it):** "This bar is cut into 5 equal parts. What fraction of the whole is shaded?" Choose **1/5**, choose **I'm sure**, then click **Check**.
3. **Check 2 (Explain why):** "Kabir … Meera … Who is right?" Choose **Meera**, then **I'm sure**, then **Check**.
4. **Check 3 (See it, interactive):** "Tap parts of the bar to build 2/6." Tap any two parts. Which two does not matter; the count and size do. Then **I'm sure**, **Check**.

**Expect:**

- **After each check:** green feedback with the idea behind the answer, and **Check** stays disabled until you have chosen both an answer and a confidence level.
- **The summary:** "3 of 3 checks held." It lists all three Marble evidence statements as **Firm** and shows "Bodh will ask about these again on <tomorrow's date>".
- **The next suggestion:** "Build amounts from unit fractions". The Marble hard-dependency reason is quoted underneath: "Understanding a/b as a parts of size 1/b is prerequisite to understanding a/b as sum of 1/b".
- **Back on the map:** "Equal parts of one whole" shows three filled olive dots and **Firm foothold**, and Firm evidence reads 3/30.

Open **"What does this check?"** under any check to see the child-friendly statement next to the original Marble evidence text.

## Scenario 3: A wrong answer explains the idea behind it

1. On the map, open **Build amounts from unit fractions**.
2. Check 1: choose the sum with **eight** copies of 1/8 (the wrong one), choose **I'm sure**, then **Check**.

**Expect:**

- **The feedback panel:**
  - the headline "Not yet—and you felt sure. That is useful: now we know exactly which idea to rebuild."
  - a reason specific to that option ("That is 8 copies—the entire whole…")
  - the correct answer and the idea behind it
  - "Idea to rebuild: Mixing up the jobs of the top and bottom numbers"
- **The check count:** it grows from 3 to 4. Bodh adds a fresh variant of the same statement with new numbers. It never re-asks the question it just explained.
- **The hop check:** it uses a number line from 0 to 2. Tap **+ hop** until you land on the target. Stopping at 1 when the target is beyond it gives "You stopped at 1, but 4/3 lies beyond 1—keep hopping."

## Scenario 4: Guesses and hints count as fragile, not firm

1. Open any topic and answer a check **correctly** but choose **Just guessing**.

**Expect:** "Right! You said it was a guess, so Bodh will ask one more to make it firm." A fresh variant of that statement is added. If you stop there, the statement's dot is half-filled (**Fragile**).

2. On another check, click **Ask Bodh for a hint** before answering, then answer correctly.

**Expect:** "Right—with a hint. Next, Bodh will ask one without it." Hinted answers never count as firm.

## Scenario 5: A confident miss steps down to the Marble root

This scenario uses a fresh preview. Use **Preview tools → Reset the preview…** first.

1. Switch to **Science** and open the summit **Evaporation and the water cycle**.
2. Check 1: choose "Evaporation: liquid → gas; condensation: gas → liquid", then **I'm sure**, then **Check**.
3. Check 2 (put one puddle's water journey in order): place the steps in a **wrong** order, choose **I'm sure**, then **Check**.
4. Check 3 (two puddles, sun and shade): choose "The sunny one…", then **I'm sure**, then **Check**.

**Expect:**

- **After check 2:** "Look again at step N" and "Idea to rebuild: Mixing up evaporation and condensation". This statement has one authored question, so no retry is added; Bodh re-checks it later instead.
- **The summary suggestion:** "One step down—to the root · Rebuild Precise science words". It explains that you felt sure, so this is a real belief rather than a guess, and it quotes the Marble hard dependency: "Identifying the role of evaporation and condensation requires knowing these process terms precisely".
- **With "Just guessing" on check 2 instead:** a wrong guess is not treated as a belief, so there is no repair suggestion; Bodh goes back to suggesting the next foundation.

## Scenario 6: A miss from your doubt steps down one rung

1. Open `/climb?topic=mt_9Y96vxG_LH` (the maths receipt link does this for you), or open **Divide fractions** from the map.
2. The suggestion reads "From your doubt · Divide fractions: show it three ways", and the summit carries the tags **Summit goal**, **Suggested**, and **Your doubt**.
3. Start, and answer check 1 **wrong** with **Just guessing**. Bodh adds up to two fresh variants of that statement right after it; answer those **wrong** too, with **Just guessing**. Answer the other checks correctly.

**Expect:** the summary suggests "One step down · First, make Share one unit fraction firm". It quotes the Marble edge "Dividing fraction by fraction extends Y5 dividing unit fractions by whole numbers", which is the nearest hard prerequisite of the doubt's topic.

If you get one of the extra variants **right**, Bodh treats the idea as rebuilt and keeps suggesting "Divide fractions: show it three ways" instead of stepping down. That is intended: a correct answer on fresh numbers is new evidence.

## Scenario 7: Understanding that lasts (spaced review)

1. Make "Equal parts of one whole" firm (Scenario 2).
2. Reopen the same topic straight away and answer everything right again.

**Expect:** it stays **Firm**, not **Lasting**. Re-answering early does not prove retention.

3. Open **Preview tools** (left edge), click **+1 day**, and close the panel.

**Expect:**
- The simulated date moves forward.
- The map's suggestion becomes "Today's memory check · 3 earlier checks—did the understanding last?", and the foothold shows a **Review due** tag.
- On the home page, the button reads "Do today's 3 memory checks".

4. Start the review and answer correctly and confidently. The numbers are new.

**Expect:**
- The dots gain a pink ring and read **Lasting**, and the Lasting tile goes up by 3.
- The summary says the next review is about **3 days** later.
- Later gaps are 7 and then 21 days, which you can reach with **+3 days** and **+7 days**.
- If you get a review wrong, that statement drops back to **Still forming** and the cycle restarts.

When several topics are due, the review mixes them, so consecutive checks come from different topics.

## Scenario 8: The full doubt → repair → Climb path

**Science:**
1. Go to **Bring a doubt** (home button or Preview tools).
2. In the examples list, choose "Science · Where did the puddle water go?", then click **Let Bodh understand**.
3. **Preview:** a "Safe learning path" card appears; open **the reviewed puddle journey**. **Local app with a key:** the live diagnosis runs and the probe appears.
4. Work through the journey: pick "The water moved into the air as invisible vapour", **Follow the water**, move through each stage with the **→** buttons, click **Place the lid**, choose "The same water moved into the air, cooled, and formed drops on the lid", then **Check my story** and **See my understanding card**.
5. On the receipt, click **Make it last: Understanding Climb**.

**Expect:** the Climb opens on **Science**, with "From your doubt · Evaporation and the water cycle: show it three ways" and the **Your doubt** tag on that foothold.

**Maths:** open the curated maths journey (`/demo`) and complete it through the receipt. Click **Prove it three ways · Understanding Climb**.

**Expect:** the Climb opens on **Maths** at **Divide fractions**. The live-diagnosis repair page (`/learn`, which needs a key) has the same "Prove it three ways" button, and it opens the seed's own goal topic.

## Scenario 9: One of each interaction type

| Try this foothold | Interaction you should see |
|---|---|
| Equal parts of one whole, check 3 | Tap-to-shade bar with a live count |
| Build amounts from unit fractions, check 2 | Number line with hop arcs and a Bodh marker; **One back** undoes |
| Count unit fractions in a whole, check 1 | Hop from 0 to a whole number and count the hops |
| Multiply a fraction by a fraction, check 1 | Area model with rows, columns, and striped overlap |
| A fraction is also division, check 3 | Bars dealt out to friends in colours |
| Two meanings of division, check 2 | Answer options drawn as dot groups |
| Water cycle, check 1 | Tap steps in order into numbered slots; tap a placed step to remove it |
| Temperature, check 3 | Thermometer scene (readings rotate across retries) |
| Clouds and their types, check 1 | Cumulus, stratus, or cirrus illustration |

## Scenario 10: The grown-up panel and privacy

Open **For grown-ups: how Bodh counts this evidence** at the bottom of the map.

**Expect:**
- All five dot states are explained: Not checked yet, Still forming, Fragile, Firm, Lasting.
- You see how the checks are made (code-generated maths, no AI answer keys).
- "Recent ideas to rebuild" lists your latest misconceptions and notes the ones said with confidence.
- A privacy note says the evidence stays on this device.

**Erase this device's evidence** asks for confirmation before clearing. After it clears, the map returns to empty dots.

To confirm nothing personal is stored, open your browser's developer tools → Application → Local Storage → `bodh:understanding-ledger:v1`. You should see only topic IDs, evidence numbers, true/false, confidence, hint flags, and timestamps. There is no written text.

## Scenario 11: Phone width and keyboard

- **Phone width (about 390px):** the map stacks into one column, the suggestion card stacks, and the page never scrolls sideways.
- **Keyboard only:** Tab to answers and press Enter; confidence is a radio group, so use the arrow keys. After **Check**, focus moves to the feedback. After **Next check**, focus moves to the new question.

## What was verified before handoff

- `npm test`: 132 of 132 checks pass, including 16 new Climb tests and a server-render test. Generated maths answer keys are checked against an independent rational-number oracle, and no wrong option may equal the key.
- `npm run lint` is clean.
- The production build was driven in Chromium through Scenarios 2, 3, 7, and 8 (science path), plus phone width. There were no console errors or sideways scrolling. The hosted preview made no external network requests.

## Known limits to keep in mind

- Several science evidence statements have one authored question, so their retries wait for the spaced review. Writing more questions per statement is the next content task.
- Evidence is per browser. A different device or browser starts fresh, by design.
- "Lasting" means correct, confident, and unaided after a gap on this device. It is not a mastery certificate, and the page says so.
