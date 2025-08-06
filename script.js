// Frontend: calls Netlify function /.netlify/functions/fetchData to get live signals & metrics
const COINS = ['BTC','ETH','BNB','DOGE','SOL'];
const REFRESH_MS = 60000;
const cardsDiv = document.getElementById('cards');
const metricsDiv = document.getElementById('network-metrics');
const guideDiv = document.getElementById('live-guide');

function createCard(symbol){
  if(document.getElementById('card-'+symbol)) return;
  const el = document.createElement('div'); el.className='card'; el.id='card-'+symbol;
  el.innerHTML = `<div class="coin">${symbol}</div>
    <div class="price" id="price-${symbol}">—</div>
    <div class="info" id="info-${symbol}"></div>
    <div class="signal" id="signal-${symbol}"></div>`;
  cardsDiv.appendChild(el);
}

function updateCard(symbol, data){
  const priceEl = document.getElementById('price-'+symbol);
  priceEl.textContent = data.price !== null ? ('$' + Number(data.price).toLocaleString(undefined,{maximumFractionDigits:2})) : 'N/A';
  document.getElementById('info-'+symbol).textContent = `Confidence: ${Math.round(data.confidence)}% — ${data.reason}`;
  const signalEl = document.getElementById('signal-'+symbol);
  signalEl.textContent = data.action;
  signalEl.className = 'signal ' + (data.action==='Go Long' ? 'green' : data.action==='Go Short' ? 'red' : 'yellow');
}

async function updateAll(){
  guideDiv.textContent = 'Updating...';
  COINS.forEach(createCard);
  try{
    const res = await fetch('/.netlify/functions/fetchData');
    if(!res.ok) throw new Error('Function error');
    const j = await res.json();
    metricsDiv.innerHTML = '';
    const m1 = document.createElement('div'); m1.className='metric'; m1.innerHTML = `<div class="coin">BTC Mempool</div><div>${j.network.btcMempool}</div>`;
    const m2 = document.createElement('div'); m2.className='metric'; m2.innerHTML = `<div class="coin">ETH Gas (est)</div><div>${j.network.ethGas}</div>`;
    metricsDiv.appendChild(m1); metricsDiv.appendChild(m2);
    for(const s of COINS){
      const data = j.coins[s];
      updateCard(s, data);
    }
    const confidences = Object.values(j.coins).map(c=>c.confidence);
    const avg = Math.round(confidences.reduce((a,b)=>a+b,0)/confidences.length);
    let mood = 'Market: Neutral';
    if(avg>=75) mood = 'Market: Bullish';
    else if(avg>=60) mood='Market: Cautious';
    else mood='Market: Bearish';
    guideDiv.textContent = `${mood} — Avg confidence: ${avg}%`;
  }catch(e){
    console.error(e);
    guideDiv.textContent = 'Network error or function not deployed';
  }
}

COINS.forEach(createCard);
updateAll();
setInterval(updateAll, REFRESH_MS);
