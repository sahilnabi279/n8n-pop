const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function searchYouTube(query) {
  const q = encodeURIComponent(query);
  const url = `https://www.youtube.com/results?search_query=${q}`;
  const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
  const $ = cheerio.load(res.data);
  const results = [];
  $('a').each((i, el) => {
    const href = $(el).attr('href') || '';
    if (href.startsWith('/watch')) {
      const title = $(el).attr('title') || $(el).text().trim();
      const videoUrl = 'https://www.youtube.com' + href.split('&')[0];
      if (title && results.findIndex(r => r.url === videoUrl) === -1) {
        results.push({ title, url: videoUrl });
      }
    }
  });
  return results.slice(0, 10);
}

(async () => {
  try {
    const items = await searchYouTube('n8n workflow tutorial');
    if (!fs.existsSync('data')) fs.mkdirSync('data');
    fs.writeFileSync('data/youtube_poc.json', JSON.stringify(items, null, 2));
    console.log('Saved', items.length, 'results to data/youtube_poc.json');
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
