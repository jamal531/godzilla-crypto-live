// Client-side Godzilla Crypto Predictor (uses CoinGecko + mempool.space)
// Refresh interval: 60 seconds
const COINS = [
  {id:'bitcoin', symbol:'BTC', vs:'usd'},
  {id:'ethereum', symbol:'ETH', vs:'usd'},
  {id:'binancecoin', symbol:'BNB', vs:'usd'},
  {id:'dogecoin', symbol:'DOGE', vs:'usd'},
  {id:'solana', symbol:'SOL', vs:'usd'}
];

const REFRESH_MS = 60000;
const cardsDiv = document.getElementById('cards');
const metricsDiv = document.getElementById('network-metrics');
const guideDiv = document.getElementById('live-guide');

function createCard(coin){
  const el = document.createElement('div'); el.className='card'; el.id='card-'+coin.symbol;
  el.innerHTML = `<div class="coin">${coin.symbol}</div>
    <div class="price" id="price-${coin.symbol}">—</div>
    <div class="info" id="info-${coin.symbol}"></div>
    <div class="signal" id="signal-${coin.symbol}"></div>`;
  cardsDiv.appendChild(el);
}

function updateCard(coin, data){
  const priceEl = document.getElementById('price-'+coin.symbol);
  priceEl.textContent = data.price !== null ? ('$' + Number(data.price).toLocaleString(undefined,{maximumFractionDigits:2})) : 'N/A';
  document.getElementById('info-'+coin.symbol).textContent = `Confidence: ${Math.round(data.confidence)}% — ${data.reason}`;
  const signalEl = document.getElementById('signal-'+coin.symbol);
  signalEl.textContent = data.action;
  signalEl.className = 'signal ' + (data.action==='Go Long' ? 'green' : data.action==='Go Short' ? 'red' : 'yellow');
}

// Simple RSI calculation from close prices array
function computeRSI(closes, period=14){
  if(!closes || closes.length < period+1) return null;
  let gains=0, losses=0;
  for(let i=1;i<period+1;i++){
    const diff = closes[i]-closes[i-1];
    if(diff>0) gains += diff; else losses += Math.abs(diff);
  }
  if(losses===0) return 100;
  const rs = (gains/period)/(losses/period);
  return 100 - (100/(1+rs));
}

// Simple EMA
function computeEMA(prices, period=10){
  if(!prices || prices.length===0) return 0;
  const k = 2/(period+1);
  let ema = prices[0];
  for(let i=1;i<prices.length;i++){
    ema = prices[i]*k + ema*(1-k);
  }
  return ema;
}

async function fetchCoinData(coin){
  try{
    const url = `https://api.coingecko.com/api/v3/coins/${coin.id}/market_chart?vs_currency=${coin.vs}&days=1&interval=minutely`;
    const res = await fetch(url);
    const json = await res.json();
    const prices = json.prices || [];
    const last = prices.slice(-30).map(p=>p[1]);
    const priceNow = last[last.length-1] || (prices.length ? prices[prices.length-1][1] : null);
    const rsi = computeRSI(last) || 50;
    const ema10 = computeEMA(last.slice(-15),10);
    const ema50 = computeEMA(last.slice(-60 < 0 ? 0 : -60),50);
    let action='Wait', confidence=50, reason='No strong signal';
    if(rsi < 35 && ema10 > ema50) { action='Go Long'; confidence = Math.min(95, 70 + (50 - rsi)); reason='RSI oversold + EMA alignment'; }
    else if(rsi > 65 && ema10 < ema50) { action='Go Short'; confidence = Math.min(95, 70 + (rsi - 50)); reason='RSI overbought + EMA alignment'; }
    else if(ema10 > ema50 && rsi>50) { action='Go Long'; confidence = 60 + Math.max(0, rsi-50); reason='EMA bullish'; }
    else if(ema10 < ema50 && rsi<50) { action='Go Short'; confidence = 60 + Math.max(0, 50 - rsi); reason='EMA bearish'; }
    return { price: priceNow, rsi, ema10, ema50, action, confidence, reason };
  }catch(e){
    console.error('coin data error',e);
    return { price: null, rsi:50, ema10:0, ema50:0, action:'Wait', confidence:40, reason:'Error fetching data' };
  }
}

async function fetchNetworkMetrics(){
  let btcMempool = 'N/A';
  try{
    const r = await fetch('https://mempool.space/api/mempool');
    const j = await r.json();
    btcMempool = (j.vsize/1000000).toFixed(2) + ' MB';
  }catch(e){ btcMempool = 'N/A'; }
  let ethGas = 'N/A';
  try{
    // best-effort; public endpoints vary
    const r = await fetch('https://api.blocknative.com/gasprices/blockprices', {headers:{'Authorization':'demo'}}).catch(()=>null);
    if(r && r.json){
      const j = await r.json();
      ethGas = (j.blockPrices && j.blockPrices[0] && j.blockPrices[0].estimatedPrices && j.blockPrices[0].estimatedPrices[1]) ? j.blockPrices[0].estimatedPrices[1].price : 'N/A';
    } else ethGas='N/A';
  }catch(e){ ethGas='N/A'; }
  return { btcMempool, ethGas };
}

async function updateAll(){
  guideDiv.textContent = 'Updating...';
  for(const coin of COINS){
    if(!document.getElementById('card-'+coin.symbol)) createCard(coin);
  }
  const metrics = await fetchNetworkMetrics();
  metricsDiv.innerHTML = '';
  const m1 = document.createElement('div'); m1.className='metric'; m1.innerHTML = `<div class="coin">BTC Mempool</div><div>${metrics.btcMempool}</div>`;
  const m2 = document.createElement('div'); m2.className='metric'; m2.innerHTML = `<div class="coin">ETH Gas (est)</div><div>${metrics.ethGas}</div>`;
  metricsDiv.appendChild(m1); metricsDiv.appendChild(m2);

  for(const coin of COINS){
    const data = await fetchCoinData(coin);
    updateCard(coin, data);
  }

  const confidences = Array.from(document.querySelectorAll('[id^=info-]')).map(el=>{ const m = el.textContent.match(/(\\d+)%/); return m ? Number(m[1]) : 50; });
  const avg = Math.round(confidences.reduce((a,b)=>a+b,0)/confidences.length);
  let mood = 'Market: Neutral';
  if(avg>=75) mood = 'Market: Bullish';
  else if(avg>=60) mood='Market: Cautious';
  else mood='Market: Bearish';
  guideDiv.textContent = mood + ' — Avg confidence: ' + avg + '%';
}

COINS.forEach(createCard);
updateAll();
setInterval(updateAll, REFRESH_MS);
