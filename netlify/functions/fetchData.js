// netlify/functions/fetchData.js
const fetch = require('node-fetch');
const COINS = [
  { id: 'bitcoin', symbol: 'BTC' },
  { id: 'ethereum', symbol: 'ETH' },
  { id: 'binancecoin', symbol: 'BNB' },
  { id: 'dogecoin', symbol: 'DOGE' },
  { id: 'solana', symbol: 'SOL' }
];

function computeRSI(closes, period = 14) {
  if (!closes || closes.length < period+1) return null;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i-1];
    if (diff > 0) gains += diff; else losses += Math.abs(diff);
  }
  if (losses === 0) return 100;
  const rs = (gains/period)/(losses/period);
  return 100 - (100 / (1 + rs));
}

function computeEMA(prices, period = 10) {
  if (!prices || prices.length === 0) return 0;
  const k = 2/(period+1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = prices[i]*k + ema*(1-k);
  }
  return ema;
}

exports.handler = async function(event, context) {
  try {
    const results = {};
    for (const coin of COINS) {
      const url = `https://api.coingecko.com/api/v3/coins/${coin.id}/market_chart?vs_currency=usd&days=1&interval=minutely`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`CoinGecko ${coin.id} ${res.status}`);
      const json = await res.json();
      const prices = (json.prices || []).map(p=>p[1]);
      const last = prices.slice(-60);
      const priceNow = last[last.length-1] ?? null;
      const rsi = computeRSI(last,14) ?? 50;
      const ema10 = computeEMA(last.slice(-30),10);
      const ema50 = computeEMA(last.slice(-60<0?0:-60),50);
      let action='Wait', confidence=50, reason='No strong signal';
      if (rsi < 35 && ema10 > ema50) { action='Go Long'; confidence = Math.min(95, 70 + (50 - rsi)); reason='RSI oversold + EMA alignment'; }
      else if (rsi > 65 && ema10 < ema50) { action='Go Short'; confidence = Math.min(95, 70 + (rsi - 50)); reason='RSI overbought + EMA alignment'; }
      else if (ema10 > ema50 && rsi > 50) { action='Go Long'; confidence = 60 + Math.max(0, rsi - 50); reason='EMA bullish'; }
      else if (ema10 < ema50 && rsi < 50) { action='Go Short'; confidence = 60 + Math.max(0, 50 - rsi); reason='EMA bearish'; }
      results[coin.symbol] = { price: priceNow, rsi: Math.round(rsi*100)/100, ema10: Math.round(ema10*100)/100, ema50: Math.round(ema50*100)/100, action, confidence: Math.round(confidence), reason };
    }

    let btcMempool = 'N/A';
    try {
      const r = await fetch('https://mempool.space/api/mempool');
      if (r.ok) {
        const j = await r.json();
        btcMempool = (j.vsize / 1000000).toFixed(2) + ' MB';
      }
    } catch (e) { btcMempool = 'N/A'; }

    let ethGas = 'N/A';
    try {
      const r = await fetch('https://api.blocknative.com/gasprices/blockprices', { headers: { 'Authorization': 'demo' } }).catch(()=>null);
      if (r && r.ok) {
        const j = await r.json();
        ethGas = j.blockPrices?.[0]?.estimatedPrices?.[1]?.price ?? 'N/A';
      }
    } catch (e) { ethGas = 'N/A'; }

    const payload = { coins: results, network: { btcMempool, ethGas }, ts: Date.now() };
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, max-age=0' }, body: JSON.stringify(payload) };
  } catch (err) {
    console.error('fetchData error', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
