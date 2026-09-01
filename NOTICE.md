# Third-party notices

## Marble Skill Taxonomy

This project includes bounded extracts of the Marble Skill Taxonomy for Bodh's fraction-division and evaporation/water-cycle journeys.

> Marble Skill Taxonomy (v1) · © Generative Spark, Inc. (Marble) · https://withmarble.com · licensed under ODbL 1.0 (database) and CC BY-SA 4.0 (content).

- Source: https://github.com/withmarbleapp/os-taxonomy
- Source commit: `96a7933754af672e1bfdbf7ecb05c325860c6e0d`
- Database license: Open Database License 1.0 — https://opendatacommons.org/licenses/odbl/1-0/
- Text-content license: Creative Commons Attribution-ShareAlike 4.0 — https://creativecommons.org/licenses/by-sa/4.0/

The extracts in `data/taxonomy/fractions-division.slice.json` and `data/taxonomy/evaporation-water-cycle.slice.json` preserve Marble's canonical topic IDs and dependency statements. The extracts are offered under the same applicable ODbL 1.0 and CC BY-SA 4.0 terms. Bodh-specific selection metadata and diagnostic labels are marked separately from copied taxonomy fields.

Only references to curriculum standard identifiers are retained; the third-party curriculum-standard text is not copied into this repository. See the upstream project’s `PROVENANCE.md` for the provenance and terms of those frameworks.

Use of Marble names or data does not imply endorsement of Bodh by Marble or Generative Spark, Inc.

## Rapier physics engine

Bodh Van's deterministic 2D stations use the Rapier physics engine through the official JavaScript bindings.

> Rapier · © Dimforge · https://rapier.rs · licensed under the Apache License 2.0.

- Package: `@dimforge/rapier2d-deterministic-compat`
- License: Apache-2.0 — https://www.apache.org/licenses/LICENSE-2.0

## Design inspiration

- **gods-eye-view** (https://github.com/bilawalsidhu/gods-eye-view, MIT) inspired the pattern of one continuous world driven by a small set of typed agent tools. No code, imagery, or data from that project is included.
- **Box2D / Box3D** (https://github.com/erincatto/box3d, MIT) set the standard for cross-platform deterministic physics that Bodh Van follows. No code from those projects is included.
