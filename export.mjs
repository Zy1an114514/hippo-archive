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
 *   node export.mjs --drop-long        # also drop any message over 1200 chars
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
const DROP_LONG = has("drop-long");

if (!fs.existsSync(HOME)) {
  console.error("hippocampus dir not found: " + HOME);
  console.error("pass --home <dir> if it lives elsewhere");
  process.exit(1);
}

/** Session ids arrive as "session-<hex>"; the prefix is noise in a heading. */
const shortSid = (sid) => String(sid).replace(/^session-/, "").slice(0, 8);
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
/**
 * Length is deliberately NOT a signal. People write long messages too, and an
 * archive that quietly drops them is worse than one that keeps a little noise.
 * Judge the shape instead: scaffolding is a template built from labelled
 * sections, a person speaking is not.
 */
function isInjection(text) {
  if (INJECT_PREFIX.some((k) => text.startsWith(k))) return true;
  if (text.includes("【目的】") || text.includes("【需求】")) return true;
  // A block assembled from two or more 【labelled sections】 is a prompt.
  if ((text.match(/【[^】]{1,12}】/g) || []).length >= 2) return true;
  // A dense template: several markdown headings AND a long bullet list.
  // Either alone is something a person may well write by hand.
  const headings = (text.match(/^#{1,4}\s/gm) || []).length;
  const bullets = (text.match(/^\s*[-*•]\s/gm) || []).length;
  if (headings >= 3 && bullets >= 5) return true;
  // Opt-in escape hatch for streams that carry unusually noisy scaffolding.
  if (DROP_LONG && text.length > 1200) return true;
  return false;
}

const SPEAKER = { he: "user", me: "assistant", act: "(tool)", meta: "(meta)" };

/** Not utterances: tool plumbing, and the auto-generated session title (which is
 *  not something anyone said - it is a truncation of the first injected line). */
const SKIP_TYPE = new Set(["tool/call", "tool/result", "session/title"]);

/**
 * day -> session id -> events.
 *
 * Grouped by session on purpose. Two conversations running on the same day used
 * to be interleaved line by line, which reads like one person answering
 * themselves; a session is the unit a conversation actually has.
 */
const days = new Map();
let scanned = 0;
let unreadable = 0;
for (const entry of fs.readdirSync(HOME)) {
  const file = path.join(HOME, entry, "stream.jsonl");
  if (!fs.existsSync(file)) continue;
  scanned++;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line) continue;
    let e;
    try { e = JSON.parse(line); } catch { unreadable++; continue; }
    const ms = typeof e.ts === "number" ? e.ts : Date.parse(e.ts);
    if (!Number.isFinite(ms)) { unreadable++; continue; }
    e._ms = ms;
    const day = dayOf(ms);
    const sid = String(e.sid || entry);
    if (!days.has(day)) days.set(day, new Map());
    const bySid = days.get(day);
    if (!bySid.has(sid)) bySid.set(sid, []);
    bySid.get(sid).push(e);
  }
}

fs.mkdirSync(OUT, { recursive: true });

let files = 0;
let messages = 0;
let conversations = 0;
for (const [day, bySid] of [...days].sort()) {
  const parts = [];
  for (const [sid, events] of bySid) {
    events.sort((a, b) => a._ms - b._ms || (a.turn ?? 0) - (b.turn ?? 0));
    const lines = [];
    let said = 0;
    for (const e of events) {
      if (SKIP_TYPE.has(e.type)) continue;
      const text = String(e.text ?? "").trim();
      if (!text || isInjection(text)) continue;
      const who = SPEAKER[e.who] || String(e.who || "?");
      // A heading, not bold text: message bodies contain bold lines of their own,
      // and two things that look identical make an archive unreadable.
      lines.push("### " + timeOf(e._ms) + " · " + who, "", text, "");
      said++;
    }
    if (SHOW_TOOLS) {
      const calls = events.filter((e) => e.type === "tool/call");
      if (calls.length) {
        const counts = {};
        for (const c of calls) {
          const name = String(c.text || "").split(/[\s(]/)[0] || "?";
          counts[name] = (counts[name] || 0) + 1;
        }
        lines.push("---", "", "## tool calls (" + calls.length + ")", "");
        for (const [name, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
          lines.push("- " + name + " x " + n);
        }
        lines.push("");
      }
    }
    if (!lines.length) continue;
    messages += said;
    conversations++;
    parts.push({ at: events[0]._ms, sid, lines });
  }
  if (!parts.length) continue;
  parts.sort((a, b) => a.at - b.at);
  const out = ["# " + day, ""];
  for (const part of parts) {
    if (parts.length > 1) out.push("## 会话 " + shortSid(part.sid), "");
    for (const l of part.lines) out.push(l);
  }
  fs.writeFileSync(path.join(OUT, day + ".md"), out.join("\n"), "utf8");
  files++;
}

console.log("sessions scanned: " + scanned);
console.log("days written:     " + files);
console.log("conversations:    " + conversations);
console.log("messages:         " + messages);
if (unreadable) console.log("unreadable lines: " + unreadable);
console.log("output:           " + OUT);
