# Godzilla Crypto Predictor - Netlify-ready (Live API + Signals)

Folder structure:

- index.html
- style.css
- script.js
- netlify/functions/fetchData.js
- package.json

## Steps to deploy
1. Create a GitHub repo (e.g., godzilla-crypto-live) and push all files.
2. On Netlify: New site > Import from Git > select the repo.
3. Build command: leave blank. Publish directory: `/` (root).
4. Deploy. Wait for Netlify to finish build (it installs dependencies and deploys functions).
5. Test function URL: https://<your-site>.netlify.app/.netlify/functions/fetchData - should return JSON.

## Notes
- This uses CoinGecko and mempool.space public APIs. For production, consider adding caching and API keys.
- If function returns errors, check Netlify function logs on Netlify dashboard.
