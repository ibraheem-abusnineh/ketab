"""
Trim-point discovery + trimming for the number videos (0-10).

Each clip starts with the teacher saying "one, two, three, start" and ends
with "one, two, three, stop" (ASR hears both as "stop"). We transcribe with
faster-whisper (VAD-filtered, word timestamps) and compute the keep region:

  remove  [0 .. opener_end]                opening phrase
  keep    [opener_end .. closer_start]     writing + the number word
  remove  [closer_start .. duration]       closing phrase

The spoken number word (e.g. "Seven!") sits between the two phrases and must
never be clipped, so the keep window is:

  keep_start = opener_end - HEAD_PAD          (may shave the opener's tail)
  keep_end   = max(number_end + 0.05, closer_start - END_PAD)
                                               (never before the number word)

VAD filtering matters: without it, Whisper stretches word boundaries across
silence (e.g. 1.mp4's closer "one" was stamped 4.20-5.40 while the real speech
burst was 5.10-6.86), which would cut into the number word.

Usage:
  python scripts/trim-number-videos.py            # discover, write trim-points.json
  python scripts/trim-number-videos.py --apply    # also cut videos into public/numbers
"""

import json
import os
import re
import subprocess
import sys

from faster_whisper import WhisperModel

SRC = r"C:\Users\iblfe\Documents\qra\ketab\ketab-main\ketab-main\to add\number vid"
DEST = r"C:\Users\iblfe\Documents\qra\ketab\ketab-main\ketab-main\public\numbers"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "trim-points.json")

COUNT_WORDS = {"one", "two", "three"}
STOPISH = {"stop", "stops", "start", "stopped", "stock"}
DIGIT_WORDS = {"0": "zero", "1": "one", "2": "two", "3": "three", "4": "four",
               "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine"}
HEAD_WINDOW = 8.0   # opener "one" must start within this many seconds
FADE = 0.08         # audio fade-in/out to avoid clicks at the cuts


def is_count(w):
    return norm(w["word"]) in COUNT_WORDS


def is_stopish(w):
    return norm(w["word"]) in STOPISH


def norm(w):
    s = re.sub(r"[^a-z0-9]", "", w.lower())
    return DIGIT_WORDS.get(s, s)  # Whisper sometimes hears "1 2 3" as digits


def find_opener_end(words):
    """End time of the opening one-two-three[stop] phrase.

    Anchor on the first count word, then take at most three count words
    plus a trailing stop-ish word. Never walks past a 4th-word boundary,
    so a number word like "one" right after the phrase is not consumed.
    """
    for i, w in enumerate(words):
        if is_count(w) and w["start"] < HEAD_WINDOW:
            counts = 0
            j = i
            last_end = w["end"]
            while j < len(words) and counts < 3 and (is_count(words[j]) or (counts > 0 and is_stopish(words[j]))):
                if is_count(words[j]):
                    counts += 1
                last_end = words[j]["end"]
                j += 1
            # A leading stop-ish word directly after the counts ("start"/ASR "stop").
            if j < len(words) and is_stopish(words[j]) and words[j]["start"] - last_end < 0.4:
                last_end = words[j]["end"]
            return last_end
    return None


def find_closer_start(words, after):
    """Start time of the closing one-two-three-stop run (search after `after`).

    Walks back from the last stop-ish word over count/stop-ish words, then
    takes the third-from-last count word — that is the closer's own "one"
    even when the spoken number word (e.g. "two") merged into the run.
    """
    k = None
    for i in range(len(words) - 1, -1, -1):
        if words[i]["start"] > after and is_stopish(words[i]):
            k = i
            break
    if k is None:
        return None
    j = k
    while j > 0 and words[j - 1]["start"] > after and (is_count(words[j - 1]) or is_stopish(words[j - 1])):
        j -= 1
    run = words[j:k + 1]
    counts = [w for w in run if is_count(w)]
    if len(counts) >= 3:
        return counts[-3]["start"]
    if len(counts) >= 2:
        return counts[-2]["start"]
    return words[k]["start"] - 0.2


def find_number_end(words, opener_end):
    """End of the first word spoken after the opener (the number word)."""
    for w in words:
        if w["start"] >= opener_end - 0.01:
            return w["end"]
    return None


def find_gap_after(path, after, before, noise="-35dB", min_len=0.15):
    """Start of the first silence gap in [after, before], from ffmpeg silencedetect.

    Used to cut the tail inside the *real* gap between the spoken number word
    and the closing phrase, because VAD/ASR can merge the two into one
    stretch (closer_start == number_end).
    """
    cmd = [
        "ffmpeg", "-v", "info", "-i", path,
        "-af", f"silencedetect=noise={noise}:d={min_len}",
        "-f", "null", "-",
    ]
    err = subprocess.run(cmd, capture_output=True, text=True).stderr
    for m in re.finditer(r"silence_start:\s*([0-9.]+)", err):
        t = float(m.group(1))
        if after - 0.05 <= t <= before + 0.2:
            return t
    return None


def probe_codec(path):
    """Report v:coded width/height + vcodec of a video (for matching settings)."""
    cmd = [
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=codec_name,width,height",
        "-of", "csv=p=0", path,
    ]
    out = subprocess.run(cmd, capture_output=True, text=True).stdout.strip()
    return out  # e.g. "h264,720,1280"


def cut(src, dst, keep_start, keep_end):
    duration = max(0.1, keep_end - keep_start)
    fade_out_start = max(0.0, duration - FADE)
    cmd = [
        "ffmpeg", "-y", "-v", "error",
        "-ss", f"{keep_start:.3f}", "-i", src,
        "-t", f"{duration:.3f}",
        "-c:v", "libx264", "-preset", "medium", "-crf", "23",
        "-c:a", "aac", "-b:a", "128k",
        "-af", f"afade=t=in:st=0:d={FADE},afade=t=out:st={fade_out_start:.3f}:d={FADE}",
        "-movflags", "+faststart",
        dst,
    ]
    subprocess.run(cmd, check=True)


# Hand-picked cut windows for clips whose number word runs directly into the
# closing phrase (VAD merges them, so auto-detection cuts too early). Ends sit
# inside measured silence (-35dB) before the closing phrase's real speech
# onset; starts are pinned to the shipped windows (extend the end only, so the
# clip plays ~2s like 0/1/10).
OVERRIDES = {
    "2.mp4": {"start": 2.32, "end": 4.40},
    "3.mp4": {"start": 2.02, "end": 4.35},
    "4.mp4": {"start": 1.62, "end": 3.66},
    "5.mp4": {"start": 2.30, "end": 4.38},
    "6.mp4": {"start": 2.21, "end": 4.25},
    "7.mp4": {"start": 2.08, "end": 4.50},
    "8.mp4": {"start": 2.09, "end": 4.10},
    "9.mp4": {"start": 2.06, "end": 4.05},
}


def main():
    apply = "--apply" in sys.argv
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
    files = [f"{n}.mp4" for n in range(0, 11)]
    if only is not None:
        files = [f for f in files if f in only]
    model = WhisperModel("small", device="cpu", compute_type="int8")

    results = {}
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as f:
            results = json.load(f)  # keep entries for clips not being re-run
    problems = []
    for fname in files:
        if fname in OVERRIDES:
            ov = OVERRIDES[fname]
            keep_start, keep_end = ov["start"], ov["end"]
            print(f"=== {fname} (manual override)")
            print(f"    keep=[{keep_start}, {keep_end}]  duration={keep_end - keep_start:.2f}s")
            results[fname] = {
                "file": fname, "manual": True,
                "keep_start": keep_start, "keep_end": keep_end,
            }
            if apply:
                dst = os.path.join(DEST, fname)
                cut(os.path.join(SRC, fname), dst, keep_start, keep_end)
                print(f"    -> wrote {dst}")
            continue
        path = os.path.join(SRC, fname)
        if not os.path.exists(path):
            print(f"MISSING: {fname}", file=sys.stderr)
            continue
        segments, info = model.transcribe(
            path, language="en", word_timestamps=True, beam_size=5,
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 300},
        )
        words = []
        for seg in segments:
            for w in seg.words:
                words.append({"word": w.word, "start": w.start, "end": w.end})

        opener_end = find_opener_end(words)
        closer_start = (
            find_closer_start(words, opener_end if opener_end is not None else 0.0)
            if opener_end is not None else None
        )
        transcript = " ".join(w["word"] for w in words)
        print(f"=== {fname} (duration {info.duration:.2f}s)")
        print(f"    transcript: {transcript}")
        if opener_end is None or closer_start is None or closer_start - opener_end < 0.4:
            print("    !! DOES NOT FIT PHRASE MODEL — needs manual review")
            problems.append(fname)
            results[fname] = {
                "file": fname, "duration": round(info.duration, 3),
                "opener_end": None, "closer_start": None,
                "transcript": transcript, "review": True,
            }
            continue

        number_end = find_number_end(words, opener_end)
        keep_start = round(max(0.0, opener_end), 3)
        # Never cut before the spoken number word ends; otherwise stop just
        # before the closing phrase. (VAD start of the closer can be stretched
        # back over silence, so floor at number_end + margin.)
        end_floor = (number_end + 0.05) if number_end is not None else 0.0
        keep_end = max(end_floor, closer_start - 0.05)
        # Prefer cutting inside the measured silence between the number word
        # and the closer (VAD merges them on some clips).
        gap = find_gap_after(path, number_end, closer_start)
        if gap is not None:
            keep_end = min(keep_end, max(number_end + 0.02, gap + 0.08))
        keep_end = round(min(info.duration, keep_end), 3)
        gap_note = f"  gap={gap:.2f}" if gap is not None else "  gap=None"
        print(f"    opener_end={opener_end:.2f}  number_end={number_end:.2f}  closer_start={closer_start:.2f}{gap_note}  keep=[{keep_start}, {keep_end}]")
        results[fname] = {
            "file": fname, "duration": round(info.duration, 3),
            "opener_end": round(opener_end, 3), "number_end": round(number_end, 3),
            "closer_start": round(closer_start, 3),
            "keep_start": keep_start, "keep_end": keep_end,
            "transcript": transcript, "review": False,
        }

        if apply:
            dst = os.path.join(DEST, fname)
            cut(path, dst, keep_start, keep_end)
            print(f"    -> wrote {dst}")

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\nWrote {OUT}")
    if problems:
        print(f"REVIEW NEEDED: {', '.join(problems)}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
