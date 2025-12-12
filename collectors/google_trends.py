#!/usr/bin/env python3
"""
Robust Google Trends collector using pytrends with retry/backoff.
Writes data/trends_US.json and data/trends_IN.json
"""
import json, time, os, random
from pytrends.request import TrendReq

ROOT = os.path.join(os.path.dirname(__file__), '..')
DATA_IN = os.path.join(ROOT, 'data', 'workflows.json')
OUT_US = os.path.join(ROOT, 'data', 'trends_US.json')
OUT_IN = os.path.join(ROOT, 'data', 'trends_IN.json')

# simple list of User-Agents to rotate (helps a bit)
UAS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]

def load_keywords(limit=20):
    with open(DATA_IN, 'r', encoding='utf-8') as f:
        items = json.load(f)
    seen = set(); kws = []
    for it in items:
        title = it.get('workflow','').strip()
        if not title: continue
        key = ' '.join(title.lower().split())[:120]
        if key in seen: continue
        seen.add(key)
        kws.append(title)
        if len(kws) >= limit: break
    return kws

def fetch_for_region(region_code, out_file, keywords):
    results = []
    from pytrends.request import TrendReq
    for kw in keywords:
        ua = random.choice(UAS)
        pytrends = TrendReq(hl='en-US', tz=360, requests_args={'headers':{'User-Agent':ua}})
        # Try up to N times with exponential backoff
        max_retries = 6
        backoff = 1
        success = False
        for attempt in range(1, max_retries+1):
            try:
                pytrends.build_payload([kw], timeframe='today 3-m', geo=region_code, cat=0)
                df = pytrends.interest_over_time()
                if not df.empty and kw in df.columns:
                    series = df[kw].astype(float)
                    recent_avg = float(series[-30:].mean()) if len(series) >= 30 else float(series.mean())
                    results.append({'keyword': kw, 'recent_avg': recent_avg})
                else:
                    results.append({'keyword': kw, 'recent_avg': None})
                success = True
                break
            except Exception as e:
                msg = str(e)
                print(f"[{region_code}] Error fetching '{kw}' attempt {attempt}/{max_retries}: {msg}")
                # If it's 429-like, backoff longer
                if '429' in msg or 'Too Many Requests' in msg or 'rate' in msg.lower():
                    time.sleep(backoff + random.uniform(0.5,1.5))
                    backoff *= 2
                else:
                    # small sleep and retry for other transient errors
                    time.sleep(1 + random.uniform(0,0.8))
        if not success:
            print(f"[{region_code}] Giving up on '{kw}' after {max_retries} attempts")
            results.append({'keyword': kw, 'recent_avg': None})
        # polite pause between keywords
        time.sleep(2 + random.uniform(0,2))
    with open(out_file, 'w', encoding='utf-8') as of:
        json.dump(results, of, indent=2, ensure_ascii=False)
    print('Saved', len(results), 'trend records to', out_file)

if __name__ == '__main__':
    kws = load_keywords(limit=20)
    print('Keywords to query:', len(kws))
    fetch_for_region('US', OUT_US, kws)
    time.sleep(1)
    fetch_for_region('IN', OUT_IN, kws)
