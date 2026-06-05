function parseYahooRss(xml) {
  return xml
    .split("<item>")
    .slice(1)
    .map((chunk) => {
      const pick = (tag) => {
        const match = chunk.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
        return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : "";
      };

      return {
        title: pick("title"),
        link: pick("link"),
        source: "Yahoo Finance",
        publishedAt: pick("pubDate")
      };
    })
    .filter((item) => item.title && item.link);
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const symbol = String(req.query.symbol || "AAPL").trim().toUpperCase();
  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;

  try {
    const response = await fetch(url, { headers: { "User-Agent": "StockCompass/1.0" } });
    if (!response.ok) throw new Error("news request failed");
    const items = parseYahooRss(await response.text()).slice(0, 12);
    res.status(200).json(items);
  } catch {
    res.status(502).json({ error: "뉴스를 가져오지 못했습니다." });
  }
};
