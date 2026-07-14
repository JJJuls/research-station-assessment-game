# Pilot Data-Governance Operational Checklist

Operational checklists for running the Remote Outpost Assessment safely from
internal testing through study closeout. Companion to
`docs/security/RESEARCH-DATA-PRIVACY-THREAT-MODEL.md` (finding IDs `PS-n`),
`docs/ai/OPUS-PRE-PILOT-PRIVACY-SECURITY-GATE.md`, and — for the supported
participant browser/device boundary (`PXA-n`) —
`docs/ai/OPUS-PARTICIPANT-EXPERIENCE-ACCESSIBILITY-GATE.md` +
`docs/testing/PARTICIPANT-BROWSER-DEVICE-MATRIX.md` +
`docs/operations/SUPERVISED-USABILITY-TEST-PROTOCOL.md`.

- **Prepared against**: `fable-autonomous-game-build-v1` @ `1f2c972`.
- Every item lists **Owner**, **Evidence required**, **Blocking?**, **Current
  status**, and a **Reference**. Institutional owners are placeholders
  (`[OWNER: …]`) — no real name is invented.
- Status legend: **PASS** (evidence exists) · **OPEN** (not yet done) ·
  **BLOCKED** (waiting on a decision/`[EXTERNAL]`) · **N/A**.

**Readiness levels**: **L1** internal dev testing · **L2** supervised usability
(non-study data) · **L3** supervised research pilot · **L4** formal participant
data collection.

> **Hard rule**: No real participant data (L4) may be collected until PS-0,
> PS-1, PS-2, PS-3 and the P0 cluster (P0-1..P0-4) are closed **and** external
> items X1..X11 are confirmed. See the readiness gates below.

---

## Readiness gate matrix (per level)

| Dimension                 | L1 internal dev          | L2 supervised usability                                   | L3 supervised pilot                      | L4 formal collection                   |
| ------------------------- | ------------------------ | --------------------------------------------------------- | ---------------------------------------- | -------------------------------------- |
| **Permitted data**        | synthetic only           | synthetic / staff role-play; **no real participant data** | real participant, if L3 gates closed     | real participant                       |
| **Prohibited data**       | real participant         | real participant                                          | —                                        | —                                      |
| **Environment**           | `npm run start` (DEV)    | `npm run bundle` served locally                           | `bundle` on approved host                | `bundle` on approved host `[EXTERNAL]` |
| **Logging**               | DEV console/debug API OK | debug API OK; no external export                          | no debug reliance; export path validated | production export only                 |
| **Identifiers**           | fallback random OK       | `launch_mode=test` tag recommended                        | real IDs + `launch_mode` (INT-5)         | real IDs + full status taxonomy        |
| **Data destination**      | none                     | none (accept no returns)                                  | validated return/export                  | approved store `[EXTERNAL]`            |
| **Approvals**             | none                     | supervisor                                                | + PS-0/1/2/3 closed                      | + X1..X11                              |
| **Failure handling**      | n/a                      | note & discard                                            | fallback UI + logged                     | fallback UI + incident path            |
| **Cleanup**               | n/a                      | clear browser state between runs                          | test-data purge before L4                | per-session purge on shared device     |
| **Verification evidence** | build/tsc green          | bundle external-URL grep clean                            | round-trip + allowlist test              | reproducibility + codebook             |
| **Stop condition**        | —                        | any real datum captured                                   | any P0 reopens                           | any breach / unaccounted data          |

---

## 1. Before internal testing (L1)

| #   | Item                                       | Owner | Evidence required                 | Blocking?    | Status              | Reference                |
| --- | ------------------------------------------ | ----- | --------------------------------- | ------------ | ------------------- | ------------------------ |
| 1.1 | Use only synthetic/fake identity params    | dev   | fabricated `participant_id`       | non-blocking | PASS (fallback ids) | `SessionState.ts:46`     |
| 1.2 | `npm run lint:tsc` + `npm run build` green | dev   | command output                    | blocking     | PASS                | this gate §methods       |
| 1.3 | No real participant data on dev machine    | dev   | attestation                       | blocking     | PASS                | —                        |
| 1.4 | Debug API used only in DEV                 | dev   | DEV-gated (`import.meta.env.DEV`) | non-blocking | PASS                | `ResearchRuntime.ts:190` |

## 2. Before supervised usability testing (L2, non-study data)

| #   | Item                                                                                                                                                    | Owner          | Evidence required | Blocking?    | Status                    | Reference     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------- | ------------ | ------------------------- | ------------- |
| 2.1 | Serve the **participant bundle** (`npm run bundle`), not `npm run build`                                                                                | dev            | bundle build log  | blocking     | OPEN (procedure)          | PS-1 / P1-6   |
| 2.2 | External-URL check: `grep -oE "https?://" dist/index.html` = none                                                                                       | dev            | grep output       | blocking     | PASS (verified this gate) | PS-1          |
| 2.3 | Confirm **no real participant data** collected; sessions are staff/role-play                                                                            | supervisor     | session log       | blocking     | OPEN                      | PS-2          |
| 2.4 | Tag sessions `launch_mode=test` if INT-5 signal available                                                                                               | research owner | param convention  | non-blocking | BLOCKED (INT-5)           | INT-5 §5.8    |
| 2.5 | Accept that **no data returns/exports** (P0-1/P0-2 open)                                                                                                | supervisor     | attestation       | blocking     | OPEN                      | P0-1, P0-2    |
| 2.6 | Clear browser state between participants (no persistence today makes this automatic on reload)                                                          | supervisor     | procedure note    | non-blocking | PASS (volatile)           | PS-3          |
| 2.7 | Run on a **supported environment**: current Chromium-family desktop browser (Chrome/Edge), viewport ≥1280×720; follow the supervised-usability protocol | supervisor     | environment note  | blocking     | OPEN (procedure)          | PXA-1, matrix |

## 3. Before pilot launch (L3, supervised, real participants)

| #    | Item                                                                                                                                                                | Owner                   | Evidence required                      | Blocking? | Status                  | Reference |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------- | --------- | ----------------------- | --------- |
| 3.1  | PS-0 return-scheme/host **allowlist** implemented + tested                                                                                                          | Max + research owner    | hostile-`return_url` test pass         | blocking  | BLOCKED (INT-4)         | PS-0      |
| 3.2  | PS-1 deployment pinned to `npm run bundle` on approved host                                                                                                         | infra                   | deploy runbook                         | blocking  | OPEN                    | PS-1      |
| 3.3  | PS-2 test/production separation signal live (`launch_mode`)                                                                                                         | research owner          | INT-5 ruling + payload field           | blocking  | BLOCKED (INT-5)         | PS-2      |
| 3.4  | PS-3 persistence/data-loss ruling + durable buffer (or accepted risk)                                                                                               | research owner + Max    | P0-3 ruling + buffer tests             | blocking  | BLOCKED (P0-3)          | PS-3      |
| 3.5  | P0-1 production completion→return path validated (round-trip)                                                                                                       | Max                     | hosted round-trip evidence             | blocking  | BLOCKED (INT-1)         | P0-1      |
| 3.6  | P0-2 raw-event export + reproducibility (or formal summaries-only)                                                                                                  | Max + research owner    | mocked-endpoint payload assert         | blocking  | BLOCKED (INT-2)         | P0-2      |
| 3.7  | P1-5/INT-3 empty-identity handling                                                                                                                                  | research owner + Max    | rule + test                            | blocking  | BLOCKED (INT-3)         | PS-8      |
| 3.8  | Ethics protocol + consent approved                                                                                                                                  | `[OWNER: ethics board]` | approval ref `[EXTERNAL]`              | blocking  | BLOCKED                 | X1, X2    |
| 3.9  | Storage region/provider approved                                                                                                                                    | `[OWNER: institution]`  | policy ref `[EXTERNAL]`                | blocking  | BLOCKED                 | X4, X5    |
| 3.10 | Fallback "data may not have saved" UI present                                                                                                                       | Max                     | UI evidence                            | blocking  | BLOCKED (INT-1.6)       | PS-4      |
| 3.11 | Incident/breach path defined                                                                                                                                        | `[OWNER: institution]`  | procedure `[EXTERNAL]`                 | blocking  | BLOCKED                 | X8        |
| 3.12 | **Supported participant browser pinned** (Chromium-family) or non-Chromium engine verified; loading-indicator (PXA-8) + transient-instruction (PXA-3) items bounded | research owner + Max    | browser lock or cross-browser evidence | blocking  | BLOCKED (PXA-1, PXA-X2) | PXA-1     |
| 3.13 | **Accessibility eligibility ruled** (canvas-only game, no AT support — PXA-2)                                                                                       | `[OWNER: ethics board]` | inclusion-criteria ruling `[EXTERNAL]` | blocking  | BLOCKED (PXA-X1)        | PXA-2     |

## 4. Before formal data collection (L4)

| #   | Item                                                      | Owner                  | Evidence required      | Blocking? | Status       | Reference     |
| --- | --------------------------------------------------------- | ---------------------- | ---------------------- | --------- | ------------ | ------------- |
| 4.1 | All L3 items PASS                                         | research owner         | checklist              | blocking  | OPEN         | §3            |
| 4.2 | Reproducibility validated (summary recomputable from raw) | Max                    | Unit-6 evidence        | blocking  | BLOCKED      | P0-2, INT-2.8 |
| 4.3 | Codebook 1:1 with exported fields + `scoring_version`     | research owner         | codebook               | blocking  | BLOCKED (D2) | D2.9          |
| 4.4 | DPIA covering raw-event export                            | `[OWNER: DPO]`         | DPIA ref `[EXTERNAL]`  | blocking  | BLOCKED      | X11           |
| 4.5 | Withdrawal/deletion procedure operational                 | research owner         | procedure `[EXTERNAL]` | blocking  | BLOCKED      | X6            |
| 4.6 | Qualtrics permitted to store summary fields               | `[OWNER: institution]` | approval `[EXTERNAL]`  | blocking  | BLOCKED      | X9            |
| 4.7 | Deployed artifact hash matches audited artifact           | infra                  | hash record            | blocking  | OPEN         | PS-6          |

## 5. Each participant session

| #   | Item                                                                     | Owner    | Evidence required    | Blocking?    | Status          | Reference |
| --- | ------------------------------------------------------------------------ | -------- | -------------------- | ------------ | --------------- | --------- |
| 5.1 | Launch from Qualtrics with correct identity params (no manual URL edits) | operator | launch record        | blocking     | OPEN            | PS-8      |
| 5.2 | Confirm `launch_mode=production` (not test/dev)                          | operator | payload check        | blocking     | BLOCKED (INT-5) | PS-2      |
| 5.3 | On shared device: fresh browser context per participant                  | operator | procedure            | blocking     | OPEN            | PS-3      |
| 5.4 | Verify return to survey (or record fallback shown)                       | operator | return/fallback note | blocking     | BLOCKED (INT-1) | PS-4      |
| 5.5 | Do not read/screenshot participant scores as identifying                 | operator | training             | non-blocking | OPEN            | PS-11     |

## 6. Daily pilot monitoring

| #   | Item                                                               | Owner          | Evidence required | Blocking?    | Status                 | Reference |
| --- | ------------------------------------------------------------------ | -------------- | ----------------- | ------------ | ---------------------- | --------- |
| 6.1 | Reconcile launched vs returned vs exported counts                  | research owner | daily tally       | blocking     | BLOCKED (INT-5 status) | PS-7      |
| 6.2 | Check for duplicate `game_session_id` / export ids                 | research owner | dedupe query      | blocking     | BLOCKED (idempotency)  | PS-7      |
| 6.3 | Confirm no `launch_mode=test/dev` rows in the production set       | research owner | filter query      | blocking     | BLOCKED (INT-5)        | PS-2      |
| 6.4 | Endpoint/return error-rate within threshold `[EXTERNAL threshold]` | infra          | monitoring        | non-blocking | BLOCKED                | PS-5      |

## 7. Export verification

| #   | Item                                                      | Owner          | Evidence required | Blocking? | Status          | Reference |
| --- | --------------------------------------------------------- | -------------- | ----------------- | --------- | --------------- | --------- |
| 7.1 | Every completed session has a summary in Qualtrics        | research owner | join check        | blocking  | BLOCKED (INT-1) | P0-1      |
| 7.2 | Every session has raw events (or summaries-only accepted) | research owner | endpoint count    | blocking  | BLOCKED (INT-2) | P0-2      |
| 7.3 | Summary recomputes from raw (spot-check)                  | research owner | recompute script  | blocking  | BLOCKED         | INT-2.8   |
| 7.4 | Idempotency holds (no duplicate export rows)              | research owner | key uniqueness    | blocking  | BLOCKED         | PS-7      |

## 8. Failed-session handling

| #   | Item                                                               | Owner          | Evidence required           | Blocking?    | Status                    | Reference |
| --- | ------------------------------------------------------------------ | -------------- | --------------------------- | ------------ | ------------------------- | --------- |
| 8.1 | Fallback UI shown on return/export failure                         | Max            | UI + `return_status=failed` | blocking     | BLOCKED (INT-1.6/INT-5.7) | PS-4      |
| 8.2 | Incomplete session tagged (`session_status`), not silently dropped | research owner | status field                | blocking     | BLOCKED (INT-5.4)         | PS-2      |
| 8.3 | Buffered data retained until acked; retry per rule                 | Max            | buffer state                | blocking     | BLOCKED (INT-2 E)         | PS-3      |
| 8.4 | Interrupted/reloaded session outcome recorded                      | operator       | session note                | non-blocking | OPEN                      | PS-3      |

## 9. Test-data cleanup

| #   | Item                                                | Owner          | Evidence required | Blocking? | Status            | Reference |
| --- | --------------------------------------------------- | -------------- | ----------------- | --------- | ----------------- | --------- |
| 9.1 | Purge `launch_mode=test/dev` rows before analysis   | research owner | purge log         | blocking  | BLOCKED (INT-5)   | PS-2      |
| 9.2 | Clear any local buffer test records                 | dev            | cleanup run       | blocking  | BLOCKED (INT-2 E) | PS-3      |
| 9.3 | Confirm no synthetic ids leaked into production set | research owner | id-prefix filter  | blocking  | OPEN              | PS-2      |

## 10. Production-data access

| #    | Item                                                           | Owner                     | Evidence required           | Blocking?    | Status  | Reference |
| ---- | -------------------------------------------------------------- | ------------------------- | --------------------------- | ------------ | ------- | --------- |
| 10.1 | Access limited to authorised researchers                       | `[OWNER: research owner]` | access list `[EXTERNAL]`    | blocking     | BLOCKED | X7        |
| 10.2 | Pseudonymous linkage kept separate from any direct identifiers | research owner            | storage design `[EXTERNAL]` | blocking     | BLOCKED | X4        |
| 10.3 | Access logged                                                  | `[OWNER: institution]`    | audit log `[EXTERNAL]`      | non-blocking | BLOCKED | X8        |

## 11. Incident escalation

| #    | Item                                                       | Owner                  | Evidence required         | Blocking? | Status  | Reference  |
| ---- | ---------------------------------------------------------- | ---------------------- | ------------------------- | --------- | ------- | ---------- |
| 11.1 | Breach/incident procedure documented                       | `[OWNER: institution]` | procedure `[EXTERNAL]`    | blocking  | BLOCKED | X8         |
| 11.2 | Contact chain (research owner → DPO → institution) defined | research owner         | contact list `[EXTERNAL]` | blocking  | BLOCKED | X8         |
| 11.3 | Stop-collection trigger on unaccounted data                | research owner         | stop rule                 | blocking  | OPEN    | §readiness |

## 12. Study closeout

| #    | Item                                                                       | Owner                  | Evidence required            | Blocking?    | Status             | Reference |
| ---- | -------------------------------------------------------------------------- | ---------------------- | ---------------------------- | ------------ | ------------------ | --------- |
| 12.1 | Final dataset reconciled (launched = analysed + accounted-for)             | research owner         | reconciliation               | blocking     | OPEN               | PS-7      |
| 12.2 | Retention/deletion applied per policy                                      | `[OWNER: institution]` | deletion record `[EXTERNAL]` | blocking     | BLOCKED            | X3        |
| 12.3 | `scoring_version`/`game_version`/`asset_set_version` recorded with dataset | research owner         | version manifest             | blocking     | BLOCKED (D2/INT-6) | PS-7      |
| 12.4 | Researcher handover documentation complete                                 | research owner         | handover doc                 | non-blocking | OPEN               | —         |
| 12.5 | Test/local buffers purged                                                  | dev                    | cleanup log                  | blocking     | OPEN               | PS-3      |

---

## Owner placeholder key

- `[OWNER: research owner]` — the study's principal researcher / data owner.
- `[OWNER: ethics board]` — the approving ethics/IRB body.
- `[OWNER: institution]` — institutional data-governance / IT.
- `[OWNER: DPO]` — data-protection officer.
- `dev` / `Max` — implementing engineer(s); `infra` — deployment/hosting.

No placeholder implies that the named role exists or has approved anything; each
`[EXTERNAL]` item is unconfirmed until evidence is attached.
