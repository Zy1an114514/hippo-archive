# hippo-archive

**English** | [简体中文](README.zh-CN.md)

Export [dsh-hippocampus](https://github.com/coner13/dsh-hippocampus) conversations to plain markdown, one file per day.

Hippocampus is good at *recall* — searching what happened. It is not an archive. It stores an append-only event stream (`stream.jsonl`). Nothing is lost on a reinstall — the data lives in `$DSH_HOME/hippocampus/`, outside the plugin package — but the format is only readable by the plugin itself: awkward to open elsewhere, awkward to take with you.

This turns it into something you can open in any text editor in ten years.

## What it does

- Reads every `<hippocampus>/<session>/stream.jsonl`
- Writes `archive/YYYY-MM-DD.md`, one file per day
- Keeps the full text of every message. No summarising, no truncation
- Groups by conversation: two sessions on the same day stay separate, instead of interleaving into what looks like one person answering themselves
- Drops prompt scaffolding (persona blocks, memory injections, timestamps) — recognised by its shape, never by its length, so a long message from either side still makes it in
- Optionally appends a per-day count of tool calls

## Install

Three ways, pick one. Node 18+.

**1. Just download the file** (simplest):

```bash
curl -O https://raw.githubusercontent.com/Zy1an114514/hippo-archive/main/export.mjs
node export.mjs
```

**2. Clone it:**

```bash
git clone https://github.com/Zy1an114514/hippo-archive.git
cd hippo-archive
node export.mjs
```

**3. Install as a command** (so you can run `hippo-archive` from anywhere):

```bash
npm install -g github:Zy1an114514/hippo-archive
hippo-archive --out ./archive
```

No dependencies. Nothing to build.

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

# also drop anything over 1200 characters (blunt; off by default)
node export.mjs --drop-long
```

Environment variables work too: `HIPPO_HOME`, `HIPPO_OUT`, `HIPPO_TZ`.

Requires Node 18+. No dependencies.

## Why one file per day

Because a single growing file gets slow to open, and because a day is the natural unit when you want to look back at "what happened on the 5th".

Plain markdown, not JSONL: you should be able to read your own history without writing code.

## Note

This only reads. It never writes to your hippocampus directory.

The `tool/call` entries are counted but their output is not stored — tool results are usually machine noise and would swamp the transcript.
