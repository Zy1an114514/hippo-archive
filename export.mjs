#!/usr/bin/env node
/**
 * hippo-archive — export dsh-hippocampus conversations to plain markdown.
 *
 * Why: dsh-hippocampus gives you recall/search over an event stream, but no
 * durable human-readable archive. This reads its stream.jsonl files and writes
 * one markdown file per day. No summarising, no filtering of what was said.
 *
 * Usage:
 *   node export.mjs                    # default: ~/.dsh/hippocampus -> ./archive
 *   node export.mjs --out D:\archive
 *   node export.mjs --home C:\Users\me\.dsh\hippocampus --out ./archive
 *   node export.mjs --tz 8             # hours offset for date grouping (default 8)
 *   node export.mjs --no-tools         # drop the per-day tool summary
 *
 * Config via env also works: HIPPO_HOME, HIPPO_OUT, HIPPO_TZ
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function arg(name, fallback) {
  const i = process.argv.indexOf("--" + name);
  if (i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) return process.argv[i + 1];
  return fallback;
}
const has = (name) => process.argv.includes("--" + name);

const HOME = arg("home", process.env.HIPPO_HOME || path.join(os.homedir(), ".dsh", "hippocampus"));
const OUT = path.resolve(arg("out", process.env.HIPPO_OUT || path.join(process.cwd(), "archive")));
const TZ = Number(arg("tz", process.env.HIPPO_TZ || 8));
const SHOW_TOOLS = !has("no-tools");

if (!fs.existsSync(HOME)) {
  console.error("hippocampus dir not found: " + HOME);
  console.error("pass --home <dir> if it lives elsewhere");
  process.exit(1);
}

const pad = (n) => String(n).padStart(2, "0");
function dayOf(ms) {
  const d = new Date(ms + TZ * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}
function timeOf(ms) {
  const d = new Date(ms + TZ * 3600 * 1000);
  return d.toISOString().slice(11, 19);
}

/** Messages that are prompt scaffolding, not something either party said. */
const INJECT_PREFIX = [
  "【当前时间】", "【主动找主人", "【人格卡", "【你的身份", "【系统",
  "【语气提示", "【记忆卡", "【唤醒", "【目的】", "【需求】",
];
function isInjection(text) {
  if (INJECT_PREFIX.some((k) => text.startsWith(k))) return true;
  if (text.includes("【目的】") || text.includes("【需求】")) return true;
  // Real utterances are short; scaffolding blocks are long.
  if (text.length > 1200) return true;
  return false;
}

const SPEAKER = { he: "user", me: "assistant", act: "(tool)", meta: "(meta)" };

const days = new Map();
let scanned = 0;
for (const entry of fs.readdirSync(HOME)) {
  const file = path.join(HOME, entry, "stream.jsonl");
  if (!fs.existsSync(file)) continue;
  scanned++;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    const ms = typeof e.ts === "number" ? e.ts : Date.parse(e.ts);
    if (!Number.isFinite(ms)) continue;
    e._ms = ms;
    const day = dayOf(ms);
    if (!days.has(day)) days.set(day, []);
    days.get(day).push(e);
  }
}

fs.mkdirSync(OUT, { recursive: true });

let files = 0;
let messages = 0;
for (const [day, events] of [...days].sort()) {
  events.sort((a, b) => a._ms - b._ms);
  const out = ["# " + day, ""];
  for (const e of events) {
    if (e.type === "tool/call" || e.type === "tool/result") continue;
    const text = String(e.text ?? "").trim();
    if (!text || isInjection(text)) continue;
    const who = SPEAKER[e.who] || String(e.who || "?");
    out.push("**" + timeOf(e._ms) + "  " + who + "**", "", text, "");
    messages++;
  }
  if (SHOW_TOOLS) {
    const calls = events.filter((e) => e.type === "tool/call");
    if (calls.length) {
      const counts = {};
      for (const c of calls) {
        const name = String(c.text || "").split(/[\s(]/)[0] || "?";
        counts[name] = (counts[name] || 0) + 1;
      }
      out.push("---", "", "## tool calls (" + calls.length + ")", "");
      for (const [name, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
        out.push("- " + name + " x " + n);
      }
      out.push("");
    }
  }
  fs.writeFileSync(path.join(OUT, day + ".md"), out.join("\n"), "utf8");
  files++;
}

console.log("sessions scanned: " + scanned);
console.log("days written:     " + files);
console.log("messages:         " + messages);
console.log("output:           " + OUT);
