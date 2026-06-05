function parseStooqCsv(csv) {
  return csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((row) => {
      const [date, open, high, low, close, volume] = row.split(",");
      return {
        date,
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
        volume: Number(volume)
      };
    })
    .filter((row) => row.date && Number.isFinite(row.close) && row.close > 0);
}

async function fetchAlphaVantageRows(symbol) {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) throw new Error("Alpha Vantage key missing");

  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&outputsize=compact&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`;
  const response = await fetch(url, { headers: { "User-Agent": "StockCompass/1.0" } });
  if (!response.ok) throw new Error(`Alpha Vantage HTTP ${response.status}`);

  const data = await response.json();
  const series = data["Time Series (Daily)"];
  if (!series) throw new Error(data.Note || data.Information || data["Error Message"] || "Alpha Vantage empty response");

  return Object.entries(series)
    .map(([date, row]) => ({
      date,
      open: Number(row["1. open"]),
      high: Number(row["2. high"]),
      low: Number(row["3. low"]),
      close: Number(row["4. close"]),
      volume: Number(row["5. volume"])
    }))
    .filter((row) => row.date && Number.isFinite(row.close) && row.close > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchYahooRows(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`;
  const response = await fetch(url, { headers: { "User-Agent": "StockCompass/1.0" } });
  if (!response.ok) throw new Error(`Yahoo HTTP ${response.status}`);

  const data = await response.json();
  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};

  return timestamps
    .map((timestamp, index) => ({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      open: Number(quote.open?.[index]),
      high: Number(quote.high?.[index]),
      low: Number(quote.low?.[index]),
      close: Number(quote.close?.[index]),
      volume: Number(quote.volume?.[index])
    }))
    .filter((row) => row.date && Number.isFinite(row.close) && row.close > 0);
}

async function fetchStooqRows(symbol) {
  const stooqSymbol = symbol.includes(".") ? symbol.toLowerCase() : `${symbol.toLowerCase()}.us`;
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqSymbol)}&i=d`;
  const response = await fetch(url, { headers: { "User-Agent": "StockCompass/1.0" } });
  if (!response.ok) throw new Error(`Stooq HTTP ${response.status}`);
  return parseStooqCsv(await response.text());
}

async function firstProvider(symbol) {
  const errors = {};

  try {
    const rows = await fetchAlphaVantageRows(symbol);
    if (rows.length >= 80) return { provider: "alpha_vantage", rows };
    errors.alphaVantage = `not enough rows: ${rows.length}`;
  } catch (error) {
    errors.alphaVantage = error.message;
  }

  try {
    const rows = await fetchYahooRows(symbol);
    if (rows.length >= 80) return { provider: "yahoo", rows };
    errors.yahoo = `not enough rows: ${rows.length}`;
  } catch (error) {
    errors.yahoo = error.message;
  }

  try {
    const rows = await fetchStooqRows(symbol);
    if (rows.length >= 80) return { provider: "stooq", rows };
    errors.stooq = `not enough rows: ${rows.length}`;
  } catch (error) {
    errors.stooq = error.message;
  }

  const failure = new Error("Price data unavailable");
  failure.details = errors;
  throw failure;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=3600");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const symbol = String(req.query.symbol || "AAPL").trim().toUpperCase();

  try {
    const { provider, rows } = await firstProvider(symbol);
    res.setHeader("X-Data-Provider", provider);
    res.status(200).json(rows.slice(-260));
  } catch (error) {
    res.status(502).json({
      error: error.message,
      details: error.details || {}
    });
  }
};
