
# n8n-pop

cd ~/Desktop/n8n-popularity  
npm install  
python3 -m venv venv  
source venv/bin/activate  
pip install pytrends pandas  

YOUTUBE_API_KEY=YOUR_API_KEY
node collectors/youtube_api.js
node collectors/discourse_collector.js
node scripts/merge_normalize.js

curl "http://localhost:3000/workflows" | jq . | sed -n '1,6p'
curl "http://localhost:3000/workflows?platform=Forum" | jq . | sed -n '1,6p'
curl "http://localhost:3000/workflows?platform=YouTube" | jq . | sed -n '1,6p'

{
  "workflow": "Title",
  "platform": "YouTube" | "Forum",
  "popularity_metrics": { "views":123, "likes":45, "comments":6, "source_url":"..." },
  "country": "US" | "GLOBAL" | "IN",
  "source_id": "GIZzRGYpCbM" | "forum-12345",
  "last_updated": "2025-12-12T11:24:24.849Z"
}


Response:
- `200 OK` — JSON array of workflow objects (each has `workflow`, `canonical_key`, `summary`, `evidence`, `trends`)
- `500` — `{"error":"No data yet. Run collectors first.","details":"..."}`
  
### Record shape (example)
```json
{
  "workflow": "n8n Course for Beginners – Build Complex Workflows & Master AI Integration",
  "canonical_key": "n8n course for beginners build complex workflows master ai integration",
  "countries": ["US"],
  "summary": { "total_views": 92941, "avg_like_to_view_ratio": 0.0328, "sources": ["YouTube"] },
  "trends": { "US": null, "IN": null },
  "evidence": [
    { "platform":"YouTube", "source_id":"GIZzRGYpCbM", "source_url":"...", "metrics":{...}, "last_updated":"..." },
    { "platform":"Forum", "source_id":"forum-12345", "source_url":"...", "metrics":{...}, "last_updated":"..." }
  ]
}


---

## 3) Create a short REPORT.md (methodology + limitations)

Run:

```bash
cat > REPORT.md <<'MD'
# Report — n8n Workflow Popularity (short)

## Goal
Collect multi-source popularity signals for n8n workflows, normalize and merge them into a single dataset that can be queried via a local API.

## Data sources
- **YouTube** — video view/like/comment counts for n8n-related videos (YouTube Data API v3)
- **n8n Community Forum (Discourse)** — topic replies, views, contributors (community.n8n.io)
- **Google Trends (optional)** — relative interest over time (pytrends). This step can be rate-limited; empty trend files are acceptable for the submission.

## Method
1. Collect raw records per source (collectors/*).  
2. Normalize titles to a canonical key by lowercasing, removing punctuation and collapsing whitespace.  
3. Merge records with identical canonical keys into `data/final_workflows.json`. Each merged record contains:
   - `evidence[]` — individual source records
   - `summary` — computed metrics (e.g., total_views, avg_like_to_view_ratio)
   - `trends` — optional recent trend summaries per region
4. Serve the final dataset with a minimal Express API (`api/server.js`).

## Popularity metrics
- **YouTube:** views, likes, comments, like_to_view_ratio, comment_to_view_ratio  
- **Forum:** replies, views, contributors, likes (if available)  
- **Trends:** recent_avg (average interest over last 30 days), change_60d_pct (if available)

## Limitations & caveats
- Title normalization is heuristic; some duplicates or false merges are possible. Manual review recommended for production.
- Google Trends scraping may be rate-limited (429). We provide empty trends as an acceptable fallback.
- Forum views and likes availability depend on Discourse API data; some fields may be null.

## How to reproduce
Follow the commands in `README.md`. Ensure you provide a valid `YOUTUBE_API_KEY` in `.env`.


