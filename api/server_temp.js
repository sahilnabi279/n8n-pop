const http = require('http');
const fs = require('fs');
const path = require('path');
const dataPath = path.join(__dirname, '..', 'data', 'workflows.json');
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/workflows')) {
    try {
      const raw = fs.readFileSync(dataPath, 'utf8');
      res.writeHead(200, {'Content-Type':'application/json'});
      res.end(raw);
    } catch (e) {
      res.writeHead(500, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ error: 'No data yet. Run collectors first.', details: e.message }));
    }
    return;
  }
  res.writeHead(404); res.end();
});
server.listen(port, () => console.log('Temp server listening on', port, 'reading', dataPath));
