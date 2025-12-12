const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const mainPath = path.join(dataDir, 'workflows.json');
const trendsUSPath = path.join(dataDir, 'trends_US.json');
const trendsINPath = path.join(dataDir, 'trends_IN.json');
const outPath = path.join(dataDir, 'final_workflows.json');

function normalizeTitle(t) {
  if(!t) return '';
  return t.toLowerCase().replace(/\s+/g,' ').replace(/[^a-z0-9 ]/g,'').trim();
}

const main = JSON.parse(fs.readFileSync(mainPath,'utf8'));

// load trends into maps (by keyword normalized)
let trendsUS = {};
let trendsIN = {};
if (fs.existsSync(trendsUSPath)) {
  const arr = JSON.parse(fs.readFileSync(trendsUSPath,'utf8'));
  for (const r of arr) trendsUS[(r.keyword||'').toLowerCase()] = r;
}
if (fs.existsSync(trendsINPath)) {
  const arr = JSON.parse(fs.readFileSync(trendsINPath,'utf8'));
  for (const r of arr) trendsIN[(r.keyword||'').toLowerCase()] = r;
}

// build groups: normalized title -> aggregated object
const groups = new Map();

for (const rec of main) {
  const key = normalizeTitle(rec.workflow);
  if (!groups.has(key)) {
    groups.set(key, {
      workflow: rec.workflow,
      canonical_key: key,
      evidence: [],
      countries: new Set(),
    });
  }
  const g = groups.get(key);
  g.evidence.push({
    platform: rec.platform,
    source_id: rec.source_id,
    source_url: rec.popularity_metrics && rec.popularity_metrics.source_url,
    metrics: rec.popularity_metrics || {},
    last_updated: rec.last_updated
  });
  if (rec.country) g.countries.add(rec.country);
}

// attach trends where keyword matches the title exactly (fallback)
for (const [k, g] of groups) {
  const trendUS = trendsUS[g.workflow.toLowerCase()] || trendsUS[k] || null;
  const trendIN = trendsIN[g.workflow.toLowerCase()] || trendsIN[k] || null;
  g.trends = { US: trendUS, IN: trendIN };
  // compute simple summary metrics from evidence:
  let sum_views = 0, sum_likes = 0, cnt_views = 0;
  for (const e of g.evidence) {
    const v = e.metrics.views || 0;
    if (v) { sum_views += v; cnt_views++; }
    if (e.metrics.likes) sum_likes += e.metrics.likes;
  }
  g.summary = {
    total_views: sum_views,
    avg_like_to_view_ratio: cnt_views ? +(sum_likes / sum_views || 0).toFixed(4) : 0,
    sources: g.evidence.map(x => x.platform).filter((v,i,a)=>a.indexOf(v)===i)
  };
  g.countries = Array.from(g.countries);
}

// write final list
const out = Array.from(groups.values()).map(o => {
  return {
    workflow: o.workflow,
    canonical_key: o.canonical_key,
    countries: o.countries,
    summary: o.summary,
    trends: o.trends,
    evidence: o.evidence,
  };
});

fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log('Saved', out.length, 'final workflows to', outPath);
