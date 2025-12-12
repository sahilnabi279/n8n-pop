/**
 * collectors/discourse_collector.js
 *
 * Fetches recent topics from community.n8n.io and writes data/discourse_workflows.json
 *
 * Usage:
 *   node collectors/discourse_collector.js
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE = 'https://community.n8n.io';
const OUT_DIR = path.join(__dirname, '..', 'data');
const OUT_FILE = path.join(OUT_DIR, 'discourse_workflows.json');

// friendly delay between requests to avoid rate limits
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchLatest() {
  const url = `${BASE}/latest.json`;
  const res = await axios.get(url, { headers: { 'User-Agent': 'n8n-popularity-bot/1.0 (+https://github.com)' } });
  return res.data;
}

async function fetchTopicDetails(topic_id) {
  const url = `${BASE}/t/${topic_id}.json`;
  const res = await axios.get(url, { headers: { 'User-Agent': 'n8n-popularity-bot/1.0 (+https://github.com)' } });
  return res.data;
}

function normalizeTitle(title) {
  return title.toLowerCase().replace(/\s+/g,' ').replace(/[^\w\s→>-]/g,'').trim();
}

(async () => {
  try {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

    console.log('Fetching latest topics from', BASE);
    const latest = await fetchLatest();
    const topics = (latest && latest.topic_list && latest.topic_list.topics) || [];
    console.log('Found', topics.length, 'topics in latest.json (fetching details for top 50)...');

    const results = [];
    const limit = Math.min(topics.length, 50); // cap to 50 for now
    for (let i = 0; i < limit; i++) {
      const t = topics[i];
      try {
        await delay(1000); // 1s pause
        const id = t.id || t.topic_id || t.id;
        if (!id) {
          console.warn('Skipping topic with no id:', t);
          continue;
        }
        const detail = await fetchTopicDetails(id);
        // safe extraction with fallbacks
        const title = detail.title || t.title || 'unknown';
        const slug = detail.slug || t.slug || '';
        const topic_id = detail.id || id;
        const url = `${BASE}/t/${slug}/${topic_id}`;
        const posts_count = detail.posts_count ?? t.posts_count ?? 0;
        const replies = Math.max(0, posts_count - 1);
        const views = detail.views ?? t.views ?? null;
        const participants = (detail.details && detail.details.participants && detail.details.participants.length) || (detail.posters && detail.posters.length) || null;
        // try to estimate likes: sum likes on posts if available
        let total_likes = 0;
        if (Array.isArray(detail.post_stream?.posts)) {
          for (const p of detail.post_stream.posts) {
            if (typeof p.like_count === 'number') total_likes += p.like_count;
          }
        }
        // Build record to match your schema
        const rec = {
          workflow: title,
          platform: 'Forum',
          popularity_metrics: {
            replies,
            views,
            likes: total_likes || undefined,
            contributors: participants || undefined,
            source_url: url
          },
          country: 'GLOBAL',
          source_id: `forum-${topic_id}`,
          last_updated: new Date().toISOString()
        };
        // small normalization key (not written to file, used if merging later)
        rec.__key = normalizeTitle(title);
        results.push(rec);
        console.log(`+ ${i+1}/${limit} fetched: ${title} (replies:${replies} views:${views || 'N/A'} likes:${total_likes})`);
      } catch (errTopic) {
        console.warn('Error fetching topic details:', errTopic?.message || errTopic);
      }
    }

    // write the output (strip internal keys)
    const writeable = results.map(r => {
      const copy = { ...r };
      delete copy.__key;
      return copy;
    });

    fs.writeFileSync(OUT_FILE, JSON.stringify(writeable, null, 2));
    console.log('Saved', writeable.length, 'forum workflows to', OUT_FILE);
  } catch (err) {
    console.error('Collector failed:', err.response ? err.response.data || err.response.statusText : err.message || err);
    process.exit(1);
  }
})();
