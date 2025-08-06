// netlify/functions/fetchData.js
const fetch = require('node-fetch');

exports.handler = async function () {
    try {
const API_KEY = process.env.COINGECKO_API_KEY;

const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`, {
  headers: {
    'x-cg-pro-api-key': API_KEY
  }
});

        // Fetch data for all coins
        const results = {};
        for (let coin of coins) {
            const url = `https://api.coingecko.com/api/v3/coins/${coin.id}`;
            const resp = await fetch(url, {
                headers: {
                    'accept': 'application/json',
                    'x-cg-pro-api-key': apiKey // PRO API key header
                }
            });

            if (!resp.ok) {
                throw new Error(`Failed to fetch ${coin.symbol} data: ${resp.status}`);
            }

            const data = await resp.json();
            results[coin.symbol] = {
                price: data.market_data.current_price.usd,
                change_24h: data.market_data.price_change_percentage_24h,
                market_cap: data.market_data.market_cap.usd
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(results)
        };

    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
};

