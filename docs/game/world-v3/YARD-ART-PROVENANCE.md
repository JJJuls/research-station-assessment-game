# World V3 — open Recovery Yard: art provenance

**Status: PROVISIONAL MODEL-SELECTED — NOT HUMAN-APPROVED.** Asset-set
version not bumped; nothing frozen. PixelLab use was explicitly authorised
by the research owner on 2026-09-19 for the Recovery Yard rebuild, enlarged
room artwork and replacement world sprites. Generations spent on this unit:
**320–350** (six ground calls at 40 each = 240, the account balance dropped
by 270; four sprite calls at 20 each = 80). Exact prompts, seeds where
returned, style references, candidate lists and sha256 hashes are in
`docs/game/world-v3/yard-sources/ground-provenance.json` and
`sprites-provenance.json`; the generator outputs are kept beside them.

All pieces used `create_image_pro` with the V2 yard painting as the style
reference (a 256×144 crop of `docs/game/world-v2/plate-sources/yard-plate.v2.png`);
no commercial reference imagery.

| Runtime file (`public/assets/world-v3/yard/`) | Source                                                                                                                                                        | Job                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `yard-field.png` (1792×768)                   | composed by `scripts/world-v2/compose_yard_field.py` from the five pieces below + the V2 airlock alcove                                                       | —                                      |
| — ground                                      | `ground-a.png` (688×384), mirrored repeats                                                                                                                    | `f808cab5-d7b8-4748-9fd3-8a2f1712a95b` |
| — north storm ridge                           | `north-ridge.png` (688×192), mirrored repeats, snow foot faded into the ground                                                                                | `946885db-ea7b-4606-80a0-2dbf723f4627` |
| — station roof (south)                        | `station-roof.png` (688×160), mirrored repeats                                                                                                                | `4a050e2a-4b79-4c11-bd41-d47677318c3c` |
| — fenced side banks                           | `side-bank.png` top 368 rows (second attempt; the delivered bottom 16 rows carry a fence corner — cropped)                                                    | `91ff03b2-4b4f-497b-bdcb-af147d538eba` |
| — airlock alcove                              | keyed out of the V2 yard painting (`key_yard_props.py`)                                                                                                       | V2 job `e5fa5c46…` (see V2 manifest)   |
| `uplink-rack.png`, `uplink-post.png`          | PixelLab redraw of the V2 painting's rack (candidate 0 of 4; its flat ground-shadow colours made transparent); the post is the rack sprite's own left antenna | `e57626a5-7042-46d3-9f98-836e22cded1b` |
| `mast.png`                                    | PixelLab redraw of the V2 Mast 04 (second attempt; the first clipped the crown)                                                                               | `bfa9fcc4-8e38-4009-a8bb-2875f79fdc7f` |
| `gantry.png`                                  | PixelLab redraw of the V2 gantry magnet rig (single candidate)                                                                                                | `7afe0526-9a5f-43b6-a124-0acd2cd32a2a` |
| every other sprite                            | keyed out of the V2 yard painting by snow flood-fill (`scripts/world-v2/key_yard_props.py`) — the painting's own pixels                                       | V2 jobs (see V2 manifest)              |

Rejected / unused: `side-bank.rejected1.png` (`bbe2eabf-…`, diagonal fence
corner), `mast-04.rejected1.png` (crown clipped), `ground-b.png`
(`590354c5-…`, accepted but unused — slightly darker than ground-a).

Known weaknesses for the human art review: the mirrored ground repeats show
X-shaped drift patterns at the mirror seams (x 688 / 1376, y 384); the side
banks read as low drifts with a fence rather than tall banks; the mast
redraw is ~0.89× the painting's scale.
