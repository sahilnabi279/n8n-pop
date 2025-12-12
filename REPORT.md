# N8N Popularity Analysis

This report summarizes the popularity of n8n workflows from YouTube and the n8n community forum. Google Trends was attempted but rate-limited; trend fields may be null.

## 1. YouTube Metrics
Collected via YouTube API: views, likes, comments, and engagement ratios.

## 2. Forum Metrics
Scraped from community.n8n.io: topic replies, views, and contributors.

## 3. Google Trends (US & India)
Attempted using pytrends. Due to rate limits (HTTP 429) some trend values are null. The pipeline supports retry/backoff if needed.

## 4. Final Dataset
`data/final_workflows.json` contains merged records:
- canonical workflow name
- aggregated summary metrics (total_views, avg_like_to_view_ratio)
- evidence array (per-source records)
- trend placeholders (US, IN)

## 5. API
Local API serves the final dataset:


## 6. Notes & Limitations
- Title normalization is heuristic — manual review recommended.
- Google Trends scraping can be rate-limited. Empty trend files are an acceptable fallback for submission.
- To refresh data, run the collectors and then `node scripts/merge_normalize.js`.

