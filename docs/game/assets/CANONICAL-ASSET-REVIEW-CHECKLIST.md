# Canonical asset review checklist (human approval gate)

Every generated candidate stays `human_approval: PENDING` until the
reviewer (research owner for anything measurement-adjacent) works through
this checklist per candidate and records a decision in
`canonical-asset-candidate-manifest.json`
(`APPROVED` / `REJECTED: <reason>` / `REVISE: <instruction>`). Selection
between A/B variants is itself a human decision — the producing agent
never picks the final stimulus.

## 1. Per-candidate checks (all families)

- [ ] Style: matches the Polar Meridian direction (cold slate/gunmetal,
      single-colour outline, basic shading, low top-down) and sits
      convincingly next to `style-anchor-v1` and the committed Wave 3
      props at 1x.
- [ ] Palette discipline: cyan `#5fd3c4` only on interactable/active
      cues; no rust-orange (player-only); amber only on hazard-semantics
      assets (`ITEM-WARNTAG`, `PROP-WARNPANEL`, `UI-WARNFRAME`,
      `FX-WARNPULSE`, `TILE-HAZARD`).
- [ ] No embedded text: no letters, numbers, logos, watermarks, or
      pseudo-text that could be read as words (stencil abstract marks
      acceptable per the dock-signage precedent, but prefer none).
- [ ] No copyrighted resemblance: no recognisable characters, brands,
      UI kits, or traceable third-party pixel art.
- [ ] No excluded-feature content: nothing that reads as fishing,
      farming, combat, weapons, currency, shop, rarity, romance, or
      open-world exploration content.
- [ ] Transparency: true alpha channel; no matte halo against `#101820`
      or the slate deck.
- [ ] Dimensions: match the manifest record (or the trimmed export is
      recorded as the new authoritative size, per the Wave 3 precedent).
- [ ] Duplicate check: not a near-duplicate of an existing committed
      asset or of another candidate outside its own A/B pair.
- [ ] Provenance recorded: job/generation ID, date, SHA-256 appended to
      the manifest record.

## 2. Neutrality checks (research owner)

- [ ] No candidate signals a scientifically "correct" or desirable
      choice: completion/consequence visuals read _recorded/settled_,
      never _rewarded/punished_; no green/red valence anywhere.
- [ ] The four ethical-scenario stations use ONE identical console
      visual (`PROP-SCENARIO-CONSOLE`); no per-scenario styling drift;
      no salience advantage or deficit vs canonical stations.
- [ ] NPC neutrality: Kai and Vale equally calm-neutral; Vale carries no
      suspect/furtive cues (Scenario D subject); no NPC warmer or more
      salient than the player; no moral-authority costume.
- [ ] Duty board / progress chips / status surfaces stay labels-only:
      nothing readable as bars, stars, grades, percentages, or scores.
- [ ] Competing-task station and comms beacon are not more attractive
      or urgent-looking than original-task stations (offer balance is a
      measured validity property).
- [ ] Warning assets are factual, not fearful: restrained amber area,
      no red, no strobe framing.
- [ ] Bench clutter (Q04 surface) reads as state, not fault — and its
      integration remains blocked until psychometric sign-off.
- [ ] Decor (monitors, decals) is visibly duller than the room's
      interactables (data-panels salience-inversion rule must not
      recur).
- [ ] No visual element derives from or evokes Q01-Q33 questionnaire
      wording.

## 3. Salience and accessibility checks

- [ ] Uniform guidance: the same pulse/focus/logged cues at the same
      strength for every station type in every room.
- [ ] No colour-only state signal: every UI state (active / focus /
      disabled / completed) and every warning also differs by
      shape/brightness/glyph.
- [ ] Focus ring visible at 1x on both `#101820` and slate deck.
- [ ] Icons legible at 32 px on the panel background; UI states legible
      at 1x at the 800x600 FIT canvas; runtime label areas keep >= 14 px
      effective text.
- [ ] Animation safety: no strobe/flash risk (slow cycles, low contrast
      deltas); effects are never the only cue for a state change.
- [ ] Bins/containers distinguishable by shape marker as well as hue.

## 4. Licensing / provenance checks

- [ ] Every file generated under the project's PixelLab subscription (or
      another explicitly approved tool recorded in the manifest); no
      stock, scraped, or reference-pasted imagery.
- [ ] No prompt referenced a copyrighted property or living person.
- [ ] SHA-256 + job ID recorded per committed file (Wave 3 convention).

## 5. Integration preconditions (before any approved candidate ships)

- [ ] Explicit research-owner selection of the winning variant recorded
      in the manifest.
- [ ] `ASSET_SET_VERSION` bump planned in the integrating change
      (frozen-stimuli rule); stimulus-freeze checklist updated.
- [ ] Integration is its own gated, one-room-at-a-time beat: art swaps
      never move stations/doors/spawns or change interaction radii,
      event identifiers, scoring, or byte-pinned strings.
- [ ] Gated items double-checked: `PROP-CLUTTER-SET` (Q04 sign-off),
      `UI-PROGRESS` (status-surface ruling + ADV-5 re-pin),
      `UI-EVIDENCE` (V1 ships between studies, never mid-sample).
- [ ] `research-data-reviewer`, `gameplay-implementation-reviewer` and
      `browser-qa-reviewer` runs scheduled for the integrating beat.
