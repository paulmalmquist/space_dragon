# Unity labs, art and audio merge

The owner's October 31 request to commit, push and merge the completed work was
fulfilled by [PR #30](https://github.com/paulmalmquist/space_dragon/pull/30).
GitHub merged head `308a32d6e21b6e4006e4eaf7bd066d9247aa5bc4` into main as
`a46839adc400660aafa29046d061b824d77baa5a` on November 1 UTC.

The integration used `C:/Projects/space_dragon_unity_merge` to preserve the other
channel's active Luke Lab work in the original checkout. That checkout was not
reset, stashed, switched or blanket-staged. The Oscar Creativo baseline arrived
during verification and is a separate subsequent change; its verification is not
implied by this merge.

## Checks on the integrated content

- Foundation and Python checks passed: 47 Python cases, including two Windows
  symlink privilege skips. Asset hashes, LFS pointers and Unity GUID/import audit
  passed. The snapshot's 1,095 Unity files were unchanged in content by merging.
- Existing Unity Dogfight evidence remains applicable: 74/74 EditMode cases and
  11/11 installed-Chrome cases on each of WebGPU and WebGL2.
- Combined-tree unit/build checks passed (237 units). The initial native browser
  run passed 51/53 and exposed visual-panel wiring lost in the automatic merge.
  Commit `41a3511` restored those controls while retaining controller support;
  all 27 affected browser cases and nine production cases then passed.
- Hosted Drive initially failed because a one-second wall-clock sample contained
  only two rendered frames. Commit `308a32d` waits for completed rendered frames
  and observed simulation progress, with bounded timeout and the same camera,
  steering, cabin, pause and reset assertions. Its focused CI-mode SwiftShader
  run passed locally (1 case, 1.3 minutes).
- All final hosted jobs passed:
  [foundation/game run 41266094902](https://github.com/paulmalmquist/space_dragon/actions/runs/41266094902)
  and [controller run 41266094890](https://github.com/paulmalmquist/space_dragon/actions/runs/41266094890).
  Earlier failed runs remain available; they were not reclassified as passes.

Local logs are retained under
`C:/Projects/space_dragon/artifacts/merge-2026-11-01/`.
The merged art's earlier short flight measurements were 58.1 fps WebGPU and
24.3 fps WebGL2 on the Lenovo; fallback performance, human art/audio review and
sustained performance remain open. No production deployment was performed.
