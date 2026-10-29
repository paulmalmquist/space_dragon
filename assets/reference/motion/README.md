# Motion and camera references

Four to six short clips are enough to start. Aim for 5–20 seconds each and describe one useful quality: the dragon's landing weight, wing-fold timing, camera distance, a child's run, a panel locking into place, or the pod unfolding. Exact amounts are suggestions, not required homework.

Keep new files in the ignored `assets/reference/local/motion/` folder. A link and timestamps in the idea inbox also work. Include what to borrow, what to change, and the source/usage permission if known. Existing family photos remain in their current manifest-backed collection.

For a custom gesture, use a stationary phone, even light, the whole body in frame, and one action per take. Idle, walk/turn, reach, place an object, celebrate, and react are useful first actions. Motion video informs timing; consistent front/side/rear views are better for deciding exact model geometry.

Extract a short frame board after FFmpeg and ffprobe are installed:

```powershell
powershell -NoProfile -File tools/reference-frames.ps1 `
  -InputFile assets/reference/local/motion/landing.mp4 `
  -OutputDirectory assets/reference/local/motion/landing-frames-v001 `
  -StartSeconds 2 -DurationSeconds 8 -FramesPerSecond 2
```

The helper creates a new folder, preserves the original, and writes frames, a capture receipt, and `notes.txt`. Choose a new output directory for every run. You can pass `-FfmpegPath` and `-FfprobePath` if the tools are installed outside the current PATH. Frames are sampled references; consult the original video for precise movement timing.
