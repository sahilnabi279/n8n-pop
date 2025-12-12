const fs = require('fs');
const path = require('path');

const mainPath = path.join(__dirname, '..', 'data', 'workflows.json');
const forumPath = path.join(__dirname, '..', 'data', 'discourse_workflows.json');

if (!fs.existsSync(mainPath)) {
  console.error('Main workflows.json missing:', mainPath);
  process.exit(1);
}
if (!fs.existsSync(forumPath)) {
  console.error('Forum file missing:', forumPath);
  process.exit(1);
}

const main = JSON.parse(fs.readFileSync(mainPath,'utf8'));
const forum = JSON.parse(fs.readFileSync(forumPath,'utf8'));

const existing = new Set(main.map(x => x.source_id));
let added = 0;
for (const f of forum) {
  if (!existing.has(f.source_id)) {
    const record = {
      workflow: f.workflow,
      platform: f.platform,
      popularity_metrics: f.popularity_metrics || {},
      country: f.country || 'GLOBAL',
      source_id: f.source_id,
      last_updated: f.last_updated || new Date().toISOString()
    };
    main.push(record);
    existing.add(f.source_id);
    added++;
  }
}

fs.writeFileSync(mainPath, JSON.stringify(main, null, 2));
console.log('Appended', added, 'forum items to', mainPath);
