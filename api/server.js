const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const finalPath = path.join(__dirname, '..', 'data', 'final_workflows.json');
const fallbackPath = path.join(__dirname, '..', 'data', 'workflows.json');

function readData() {
  const p = fs.existsSync(finalPath) ? finalPath : fallbackPath;
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

function paginate(array, page = 1, limit = 20) {
  const total = array.length;
  const perPage = Math.max(1, Math.min(100, parseInt(limit) || 20)); // cap 100
  const current = Math.max(1, parseInt(page) || 1);
  const start = (current - 1) * perPage;
  const end = start + perPage;
  const data = array.slice(start, end);
  const pages = Math.max(1, Math.ceil(total / perPage));
  return { data, meta: { total, perPage, currentPage: current, totalPages: pages } };
}

app.get('/workflows', (req, res) => {
  try {
    let data = readData();

    // platform filter - matches any evidence.platform field
    if (req.query.platform) {
      const want = req.query.platform.toLowerCase();
      data = data.filter(x => (x.evidence || []).some(e => (e.platform || '').toLowerCase() === want));
    }

    // country filter (matches countries array)
    if (req.query.country) {
      const wantC = req.query.country.toLowerCase();
      data = data.filter(x => (x.countries || []).map(c => c.toLowerCase()).includes(wantC));
    }

    // full-text q filter on workflow title (optional)
    if (req.query.q) {
      const term = req.query.q.toLowerCase();
      data = data.filter(x => (x.workflow || '').toLowerCase().includes(term));
    }

    // sorting (optional) - supports 'views' (desc) as example
    if (req.query.sort === 'views') {
      data = data.sort((a,b) => (b.summary?.total_views || 0) - (a.summary?.total_views || 0));
    }

    // pagination
    const limit = req.query.limit || 20;
    const page = req.query.page || 1;
    const pageRes = paginate(data, page, limit);

    res.json({
      meta: pageRes.meta,
      data: pageRes.data
    });
  } catch (e) {
    res.status(500).json({ error: 'No data yet. Run collectors first.', details: e.message });
  }
});

app.get('/workflows/:source_id', (req, res) => {
  try {
    const data = readData();
    const id = req.params.source_id;
    const found = data.filter(x => (x.evidence || []).some(e => e.source_id === id) || (x.canonical_key === id));
    if (!found.length) return res.status(404).json({ error: 'Not found' });
    res.json(found);
  } catch (e) {
    res.status(500).json({ error: 'Server error', details: e.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('API listening on port', port, 'using final_path_exists=', fs.existsSync(finalPath)));
