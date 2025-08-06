# Godzilla Crypto Predictor — Clean Light Theme

Client-side preview using CoinGecko and mempool.space. Refresh interval: 1 minute.

Deploy instructions:
1. Create GitHub repo (e.g. godzilla-crypto-live).
2. Upload the four files to repo root.
3. On Netlify: New site → Import from Git → choose repo.
4. Build command: leave blank.
5. Publish directory: `/` (root).
6. Deploy.

Notes:
- For production, use a small backend to cache responses and hide API keys.
- Some network metrics may show N/A if public endpoints block requests or rate-limit.
