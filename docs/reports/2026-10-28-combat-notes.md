# Combat notebook verification receipt - 2026-10-28

## Scope and baseline

Request: create a series of combat notes and evolve them into test specifications.
Initial baseline inspected: `82599acb8b58fb29146db057a41e4a22703f8264`; commit base reconciled through `872959d64bd34d3758db65d822777cc60db6e7c6` to `b27f44cb7ae8c00e3c3d7d83ef1cb456f970de52`, including fighter-jet/alley-oop, keyboard-first and no-dragon-crew owner decisions. Existing main changes are retained in the commit parent.
Read: AGENTS, current milestone, architecture, quality gates, README and the existing combat-system proposal. The latter remains unchanged. Changes are additive: eight notes, index, 43 scenario specifications, a structural checker and 19 checker/integrity tests. No game implementation, dependencies, family assets, existing milestone or deployment configuration changed.

## Results actually observed

Environment: Linux x86_64, Python 3.13.5, isolated staging copy of the new files.

```text
python3 tools/check_combat_notes.py
PASS: combat specification integrity only. Gameplay is NOT EXECUTED by this check; receipts are not independently verified.

python3 -m unittest discover -s tests -p 'test_combat_notes.py' -v
Ran 19 tests (see test summary; elapsed time is environment-dependent)
OK
```

Negative cases cover duplicate IDs, orphan/mismatched mappings, absent note files, path traversal, symlinks, empty expectations, invalid field types, malformed JSON, unsupported schema, results without evidence and promoted maturity without a receipt. An evidence-reference test checks structure only and does not authenticate the receipt's claims.

## Not tested or approved

All 43 gameplay cases: NOT TESTED. No runtime adapter exists in this change. No human playtest, device/performance test, controller test, browser run, agent behavioral test or gameplay correctness claim. Existing foundation/photo suites were not run locally because a full checkout was unavailable. Remote CI results are separate from this receipt. No external candidate repo/license was verified here. No release or deployment approval.

## Compatibility review

The existing family proposal retains harmless resolutions, sparks/suit energy, bonk/revive, accessible tap controls, no story game over and no learning during combat. Precision parry is an optional proposed profile. The confirmed fighter-jet direction replaces corridor-only flight; Cadet/Pilot prototypes and deeper Ace options preserve the child-pilot constraint. Tandems are alley-oops with one result committed on finish resolution, not at launch. Scripted companion assists and future exploration Line Leader remain distinct. Prior candidate GitHub references are explicitly unverified. Detailed balance values are experimental, not accepted design facts. Keyboard is required; Xbox is opportunistic and touch deferred. Dragon crew roles remain removed; pilot-controlled deflection is a separate proposed experiment, not reinstatement of a crew station.

## Revision evidence

The hashes below identify the tested new-file bytes before this receipt was added. They do not claim a whole-repository or playable-build test.

| File | SHA-256 |
| --- | --- |
| `docs/combat/CB-001-core-loop.md` | `aac91f211908a2c348a3d2df294ee1137cba105b1f015779d6c6426cd3513f70` |
| `docs/combat/CB-002-parry.md` | `3f96b5cfce68e289c2bfe13be7236b7499c156a6154561397c521d01b61ed5c3` |
| `docs/combat/CB-003-counter-posture.md` | `e875920cfa949079515c0111f7540a8e32ca9a7d5110d2b6e43bef56412b7f51` |
| `docs/combat/CB-004-dragon.md` | `c15a9b45be4b9c04903bb9df10523a823f4b8b3d20ef4b36fd5b4de5742ba21b` |
| `docs/combat/CB-005-encounters.md` | `779fd9e62a7f5a122f7663f94f5a1b359cc40bead75df1e2506598b107a41b56` |
| `docs/combat/CB-006-contact-feedback.md` | `9027cc20c3d78df3c5507dd6e1b0f25ec3cb183fd5f4d694b51b15d99792d2ae` |
| `docs/combat/CB-007-browser-assistance.md` | `68d88ea9f9b31d920479fb9875bae3a30f79a774b452d5b09601d153dd061d40` |
| `docs/combat/CB-008-family.md` | `af5f2f6e4c8a62a9d47ebf6b6b6f8ec06f73798a2bd7e8b3e1a341b7e893760b` |
| `docs/combat/README.md` | `29f6c6dbe791ec796b7d65fda7702cd68f5ab39c51569334deea94f5701625dd` |
| `tests/combat_cases.json` | `7572955edf5f3dc026ed3d6bf72d57a02da779570221b0da588aa49dd6cad324` |
| `tests/test_combat_notes.py` | `7945a478bf729bcd606a86a304ad33fb674c44fb72c24d48f1fdedf6fe3bd46f` |
| `tools/check_combat_notes.py` | `981377b1e5e812991e413361f1d59d1df37e9c9bdce9087840badb15707ae770` |
