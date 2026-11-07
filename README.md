# hippo-archive

Export [dsh-hippocampus](https://github.com/coner13/dsh-hippocampus) conversations to plain markdown, one file per day.

Hippocampus is good at *recall* — searching what happened. It is not an archive. It stores an append-only event stream (`stream.jsonl`) that is awkward to read, awkward to keep, and goes away if you reinstall.

This turns it into something you can open in any text editor in ten years.

## What it does

- Reads every `<hippocampus>/<session>/stream.jsonl`
- Writes `archive/YYYY-MM-DD.md`, one file per day
- Keeps the full text of every message. No summarising, no truncation
- Drops prompt scaffolding (persona blocks, memory injections, timestamps) — those are not things anyone said
- Optionally appends a per-day count of tool calls

## Usage

```bash
# defaults: ~/.dsh/hippocampus -> ./archive
node export.mjs

# explicit paths
node export.mjs --home "C:\Users\me\.dsh\hippocampus" --out "D:\journal"

# different timezone for day boundaries (default UTC+8)
node export.mjs --tz -7

# skip the tool-call summary
node export.mjs --no-tools
```

Environment variables work too: `HIPPO_HOME`, `HIPPO_OUT`, `HIPPO_TZ`.

Requires Node 18+. No dependencies.

## Why one file per day

Because a single growing file gets slow to open, and because a day is the natural unit when you want to look back at "what happened on the 5th".

Plain markdown, not JSONL: you should be able to read your own history without writing code.

## Note

This only reads. It never writes to your hippocampus directory.

The `tool/call` entries are counted but their output is not stored — tool results are usually machine noise and would swamp the transcript.
