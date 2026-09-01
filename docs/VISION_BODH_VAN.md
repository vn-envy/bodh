# Bodh Van — a growth-graph world for curious kids

> **Van** (वन) — a forest. A place you wander into because you want to, not because a bell rang.

## Why this exists

Bodh began as a misconception tutor: bring a doubt, find the atomic idea underneath, rebuild it visually, transfer it, return to the doubt. That loop is right, and it stays. What it lacked was memory, freedom, and a body.

- **Memory.** Bodh forgot every child the moment the receipt was shared. A friend who forgets is not a friend.
- **Freedom.** The child could only enter through nine reviewed doubts. Curiosity does not arrive as a homework question.
- **A body.** The child watched an artifact move. Understanding grows faster when the child moves the thing, breaks it, and tries again.

Bodh Van adds those three without loosening a single existing safety or pedagogy decision. The elephant still listens first, probes before teaching, never grades, and never runs generated code in front of a child.

## What it feels like

You open Bodh and you are standing in a small world. There is a puddle by a ghat, a chowk where rotis are being torn into pieces, paths that lead into mist. Bodh the elephant is beside you. You can walk anywhere that is lit. Some places are foggy — not locked, not "level 4", just not yet reachable — and the fog thins as you learn the things that lead there.

At the puddle you can drag the sun closer, drop a lid on, blow wind across the surface. A small counter shows that the water never stops existing; it only changes state and place. You will probably do something wrong first. Good. That is where the next question comes from.

Zoom out and the whole world becomes a map. This is your **growth graph**: every place you have noticed, tinkered in, explained, carried somewhere new, or taught back to Bodh. It is not a score. It is a record of where you have been and what is now within reach.

Later, a place you already know lights up again gently. Bodh says, "Remember the lid? Something new is happening there." That is spaced return, wearing a story.

## What "does not feel like education" means, concretely

| Education pattern we refuse | What Bodh Van does instead |
|---|---|
| Levels, XP, streaks, leaderboards | An evidence ladder per concept, visible as terrain, never as a number to beat |
| Lesson list, chapter order | A world with places; the graph decides what is lit, the child decides where to go |
| Right/wrong buzzer | Failed attempts are recorded as evidence and shape the next probe; Bodh stays emotionally steady (D-006) |
| "Watch, then answer" | Tinker first, notice, then Bodh names the idea the child already saw |
| Translation of English content | Hindi, Tamil and English are first-class; glossary terms are pinned, never machine-drifted |
| Generated worksheets | Generation fills story slots inside authored atom templates; the mechanics and the truth predicates are shipped code |

## Scientific basis

Each design choice below is grounded in a body of learning-science evidence. None of this is novel pedagogy; the novelty is delivering it in a coherent, deterministic, Indic-first system.

- **Productive failure** (Kapur, 2008; Kapur & Bielaczyc, 2012). Letting learners struggle with a well-designed problem *before* instruction produces deeper conceptual understanding than instruction first. Bodh Van's physics stations are designed so the first attempt is likely to fail informatively, and Bodh's explanation comes *after* the child has noticed the gap.
- **Concreteness fading / concrete–representational–abstract** (Fyfe, McNeil, Son & Goldstone, 2014). Start with a manipulable object (a roti on a seesaw), move to a representation (fraction bar, number line), then to the symbol (`3/4 ÷ 1/8`). The existing fraction journey already does the last two steps; the world adds the first.
- **Retrieval and spaced return** (Roediger & Karpicke, 2006; Cepeda et al., 2006). Re-encountering an idea after a gap, in a slightly different context, strengthens it far more than re-reading. The growth graph carries a `dueTick` per node; the frontier lights due places first.
- **Self-explanation and the protégé effect** (Chi et al., 1994; Chase, Chin, Oppezzo & Schwartz, 2009). Explaining to someone — or something — that will "use" the explanation deepens learning. The top rung of the ladder, `taught-back`, is the child teaching Bodh.
- **Knowledge in pieces** (diSessa, 1993). Misconceptions are not wrong facts to delete but partially-right fragments assembled in the wrong context. Bodh's original probe-before-teach design rests on this; the growth graph now keeps those fragments (as misconception signal IDs) as evidence about the next representation to try.
- **Self-determination theory** (Deci & Ryan, 1985; Ryan & Deci, 2000). Autonomy, competence and relatedness sustain intrinsic motivation. The child chooses where to walk (autonomy), the ladder shows real capability rather than a score (competence), and Bodh remembers (relatedness).
- **Interleaving** (Rohrer & Taylor, 2007). Mixing related concepts beats blocked practice. Wandering a world where fractions and evaporation are neighbours interleaves naturally.
- **Embodied and enactive cognition** (Abrahamson & Lindgren, 2014). Physical manipulation, even mediated by a screen, recruits motor and spatial systems that support abstraction. Deterministic physics makes the manipulation trustworthy and replayable.

## The four layers

```text
growth graph  →  what is true about this child        (lib/growth-graph.ts)
world         →  how that truth is rendered as places  (lib/world/*)
tools         →  the only way anything in the world moves  (lib/world-tools.ts)
voice         →  Hindi / Tamil / English, spoken and heard  (worker/sarvam.ts)
```

Every layer is deterministic. The same growth graph and seed produce the same world. The same sequence of tool calls produces the same state. A child's tap, Bodh's own tutor agent, an external agent in a WebMCP-capable browser, and the test suite all drive the world through the same typed tools — see `docs/WEBMCP_TOOLS.md`.

## What we borrowed and what we did not

- From **gods-eye-view** (MIT): the pattern of *one world, one camera, planet to street*, and a voice agent that acts only through a small set of typed tools. We did not borrow its CesiumJS / Google Photorealistic 3D Tiles stack: it is built for real geography, and Google tile terms are not suitable for a children's product.
- From **Box2D / Box3D** (MIT): the standard that physics must be cross-platform deterministic. Box3D has no JavaScript bindings yet, so the 2D world runs on Rapier's deterministic build (Apache-2.0). A 3D layer can swap engines later without touching the growth graph or tools.
- From **Marble Skill Taxonomy** (ODbL / CC BY-SA): the prerequisite graph, unchanged. Bodh's atoms hang off Marble nodes.

## Boundaries

- Bodh Van is a prototype for ages 8–12, Hindi, Tamil and English. It is not a curriculum, not a replacement for a teacher, and not a mastery certificate.
- No accounts. The growth graph lives on the device and can be exported as a Bodhi seed (D-020). Nothing a child says or does is stored on a server beyond the privacy-minimised metadata already declared.
- Model output never becomes executable interface. Generation fills story slots; code owns truth.
