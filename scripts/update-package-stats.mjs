#!/usr/bin/env node
// Refresh stars / forks / last-updated for every package in packages/packages.json.
//
// packages.json is emitted by System.Text.Json with \uXXXX escapes for all non-ASCII
// (500+ of them, em-dashes and emoji included). Round-tripping it through JSON.stringify
// would rewrite every one of those escapes and bury the real change in a giant diff — so
// instead we parse it only to read ids and fetch fresh numbers, then surgically rewrite
// just the three value lines per package. Every other byte is left exactly as-is.
//
// Zero dependencies — uses the built-in fetch (Node 18+). Set GITHUB_TOKEN to lift the
// GitHub API rate limit to 5000/hr (the Actions default token is plenty); without it
// GitHub allows 60/hr, which still covers a single run of this catalog.
//
// Usage:  node scripts/update-package-stats.mjs [--dry]
//   --dry  fetch and report what would change, but don't write the file.

import { readFile, writeFile } from 'node:fs/promises';

const FILE = new URL('../packages/packages.json', import.meta.url);
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const DRY = process.argv.includes('--dry');
const CONCURRENCY = 8;

// owner/repo (GitHub) or group/…/repo path (GitLab) from a repo or git URL,
// stripping a trailing .git, a ?path= subfolder and a #ref.
function parseRepo(u){
  if(!u) return null;
  const base = String(u).split(/[?#]/)[0].replace(/\.git$/i,'').replace(/\/+$/,'');
  let m;
  if((m = base.match(/github\.com[/:]+([^/]+)\/([^/]+)/i))) return { host:'github', owner:m[1], repo:m[2] };
  if((m = base.match(/gitlab\.com[/:]+(.+)$/i)))            return { host:'gitlab', path:m[1] };
  return null;
}
const isoDate = s => (typeof s === 'string' && s.length >= 10) ? s.slice(0,10) : null; // YYYY-MM-DD

async function fetchStats(r){
  if(r.host === 'github'){
    const headers = { 'Accept':'application/vnd.github+json', 'User-Agent':'basisvr-stats-bot', 'X-GitHub-Api-Version':'2022-11-28' };
    if(TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
    const res = await fetch(`https://api.github.com/repos/${r.owner}/${r.repo}`, { headers });
    if(!res.ok) throw new Error(`GitHub ${res.status}`);
    const j = await res.json();
    return { stars:j.stargazers_count, forks:j.forks_count, updated:isoDate(j.pushed_at) };
  }
  const res = await fetch(`https://gitlab.com/api/v4/projects/${encodeURIComponent(r.path)}`, { headers:{ 'User-Agent':'basisvr-stats-bot' } });
  if(!res.ok) throw new Error(`GitLab ${res.status}`);
  const j = await res.json();
  return { stars:j.star_count, forks:j.forks_count, updated:isoDate(j.last_activity_at) };
}

// ---- read + fetch (fresh: id -> {stars?,forks?,updated?}, only fields the API returned) ----
const raw = await readFile(FILE, 'utf8');
const pkgs = JSON.parse(raw);
const fresh = new Map();
let failed = 0;

async function worker(list){
  for(const p of list){
    const r = parseRepo(p.repoUrl || p.gitUrl);
    if(!r) continue;
    try{
      const s = await fetchStats(r);
      const clean = {};
      for(const k of ['stars','forks','updated']) if(s[k] != null) clean[k] = s[k];
      fresh.set(p.id, clean);
    }catch(e){ failed++; console.error(`! ${p.id}: ${e.message}`); }
  }
}
const lanes = Array.from({ length: CONCURRENCY }, () => []);
pkgs.forEach((p,i) => lanes[i % CONCURRENCY].push(p));   // round-robin so one slow lane doesn't stall
await Promise.all(lanes.map(worker));

// ---- report what changed (old -> new), independent of the surgical rewrite ----
const report = [];
for(const p of pkgs){
  const s = fresh.get(p.id); if(!s) continue;
  const diffs = [];
  for(const k of ['stars','forks','updated'])
    if(s[k] != null && p[k] !== s[k]) diffs.push(`${k} ${JSON.stringify(p[k])}→${JSON.stringify(s[k])}`);
  if(diffs.length) report.push(`  ${p.id}: ${diffs.join(', ')}`);
}

// ---- surgical rewrite: only the stars/forks/updated value line of the current package ----
let currentId = null;
const lines = raw.split('\n').map(line => {
  const idm = line.match(/^\s*"id":\s*"([^"]+)"/);
  if(idm){ currentId = idm[1]; return line; }
  const s = currentId && fresh.get(currentId);
  if(!s) return line;
  let m;
  if(s.stars   != null && (m = line.match(/^(\s*)"stars":\s*\d+(,?)\s*$/)))            return `${m[1]}"stars": ${s.stars}${m[2]}`;
  if(s.forks   != null && (m = line.match(/^(\s*)"forks":\s*\d+(,?)\s*$/)))            return `${m[1]}"forks": ${s.forks}${m[2]}`;
  if(s.updated != null && (m = line.match(/^(\s*)"updated":\s*"[^"]*"(,?)\s*$/)))      return `${m[1]}"updated": "${s.updated}"${m[2]}`;
  return line;
});
const out = lines.join('\n');

// ---- write / report ----
if(report.length){ console.log(`${report.length} package(s) changed:`); console.log(report.join('\n')); }
if(out !== raw && !DRY){
  await writeFile(FILE, out);
  console.log(`Wrote packages.json (${fresh.size} looked up${failed ? `, ${failed} failed` : ''}).`);
}else{
  console.log(DRY ? '[dry run] not writing.' : `No changes${failed ? ` (${failed} lookup failure(s))` : ''}.`);
}

// Surface a systemic failure (bad token / rate limit) instead of committing a no-op.
if(failed && fresh.size === 0){ console.error('Every lookup failed — aborting.'); process.exit(1); }
