require('dotenv').config();
const axios = require('axios');
const fs = require('fs');

const KEY = process.env.YOUTUBE_API_KEY;
if (!KEY) { console.error('Missing YOUTUBE_API_KEY in .env'); process.exit(1); }

const SEARCH_QUERIES = [
  'n8n workflow',
  'n8n tutorial',
  'n8n automation',
  'n8n slack integration',
  'n8n google sheets'
];

async function youtubeSearch(query, maxResults=10) {
  const url = 'https://www.googleapis.com/youtube/v3/search';
  const params = { key: KEY, part: 'snippet', q: query, type: 'video', maxResults };
  const res = await axios.get(url, { params });
  return res.data.items || [];
}

async function getVideoStats(ids) {
  if (!ids.length) return [];
  const url = 'https://www.googleapis.com/youtube/v3/videos';
  const params = { key: KEY, part: 'snippet,statistics', id: ids.join(',') };
  const res = await axios.get(url, { params });
  return res.data.items || [];
}

function normalizeKey(title) {
  return title.toLowerCase().replace(/\s+/g,' ').replace(/[^a-z0-9 →>-]/gi,'').trim();
}

(async () => {
  try {
    const workflows = [];
    const seen = new Set();
    for (const q of SEARCH_QUERIES) {
      const results = await youtubeSearch(q, 10);
      const ids = results.map(r => r.id && r.id.videoId).filter(Boolean);
      const stats = await getVideoStats(ids);
      for (const v of stats) {
        const title = v.snippet?.title || 'unknown';
        const videoId = v.id;
        const views = parseInt(v.statistics?.viewCount || '0', 10);
        const likes = parseInt(v.statistics?.likeCount || '0', 10);
        const comments = parseInt(v.statistics?.commentCount || '0', 10);
        const like_to_view_ratio = views ? +(likes/views).toFixed(4) : 0;
        const comment_to_view_ratio = views ? +(comments/views).toFixed(4) : 0;
        const key = normalizeKey(title) + '|YouTube|US';
        if (seen.has(key)) continue;
        seen.add(key);
        workflows.push({
          workflow: title,
          platform: 'YouTube',
          popularity_metrics: { views, likes, comments, like_to_view_ratio, comment_to_view_ratio, source_url: `https://www.youtube.com/watch?v=${videoId}` },
          country: 'US',
          source_id: videoId,
          last_updated: new Date().toISOString()
        });
      }
    }
    if (!fs.existsSync('data')) fs.mkdirSync('data');
    fs.writeFileSync('data/workflows.json', JSON.stringify(workflows, null, 2));
    console.log('Saved', workflows.length, 'workflows to data/workflows.json');
  } catch (err) {
    console.error('Error:', err.response?.data || err.message || err);
  }
})();
