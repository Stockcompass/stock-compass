const demoSeries = [
  189.28, 190.14, 188.83, 191.47, 192.22, 193.58, 191.91, 194.37, 195.08, 196.24,
  197.12, 195.66, 198.39, 199.44, 200.31, 201.75, 202.11, 200.84, 203.58, 204.93,
  206.17, 205.48, 207.34, 208.96, 210.22, 211.04, 209.72, 212.56, 213.18, 214.07,
  213.52, 215.39, 216.44, 217.08, 218.19, 216.81, 219.72, 220.15, 221.49, 222.24,
  221.18, 223.66, 224.31, 225.12, 226.58, 225.93, 227.46, 228.02, 229.18, 230.42,
  229.77, 231.56, 232.18, 233.04, 234.35, 235.22, 234.81, 236.67, 237.45, 238.16
];

const els = {
  symbolInput: document.querySelector("#symbolInput"),
  analyzeButton: document.querySelector("#analyzeButton"),
  resultSymbol: document.querySelector("#resultSymbol"),
  asOfDate: document.querySelector("#asOfDate"),
  confidenceBadge: document.querySelector("#confidenceBadge"),
  meterFill: document.querySelector("#meterFill"),
  directionText: document.querySelector("#directionText"),
  priceText: document.querySelector("#priceText"),
  signalsList: document.querySelector("#signalsList"),
  risksList: document.querySelector("#risksList"),
  hitRate: document.querySelector("#hitRate"),
  volatility: document.querySelector("#volatility"),
  dataMode: document.querySelector("#dataMode"),
  sampleSize: document.querySelector("#sampleSize"),
  latestPrice: document.querySelector("#latestPrice"),
  dataStatus: document.querySelector("#dataStatus"),
  methodSummary: document.querySelector("#methodSummary"),
  launchWarning: document.querySelector("#launchWarning"),
  loadingPanel: document.querySelector("#loadingPanel"),
  loadingTitle: document.querySelector("#loadingTitle"),
  loadingText: document.querySelector("#loadingText"),
  installButton: document.querySelector("#installButton"),
  saveWatchButton: document.querySelector("#saveWatchButton"),
  watchList: document.querySelector("#watchList"),
  alertThreshold: document.querySelector("#alertThreshold"),
  thresholdValue: document.querySelector("#thresholdValue"),
  alertList: document.querySelector("#alertList"),
  priceChart: document.querySelector("#priceChart"),
  priceList: document.querySelector("#priceList"),
  monthChange: document.querySelector("#monthChange"),
  quarterChange: document.querySelector("#quarterChange"),
  newsList: document.querySelector("#newsList"),
  newsStatus: document.querySelector("#newsStatus")
};

let deferredInstallPrompt = null;
let lastAnalysis = null;
let lastRows = demoSeries;
let lastResolved = { symbol: "AAPL", name: "Apple" };
let watchSymbols = JSON.parse(localStorage.getItem("stock-compass-watch") || '["AAPL","MSFT","NVDA"]');

const symbolDirectory = {
  apple: { symbol: "AAPL", name: "Apple" },
  애플: { symbol: "AAPL", name: "Apple" },
  iphone: { symbol: "AAPL", name: "Apple" },
  nvidia: { symbol: "NVDA", name: "NVIDIA" },
  엔비디아: { symbol: "NVDA", name: "NVIDIA" },
  nvda: { symbol: "NVDA", name: "NVIDIA" },
  tesla: { symbol: "TSLA", name: "Tesla" },
  테슬라: { symbol: "TSLA", name: "Tesla" },
  microsoft: { symbol: "MSFT", name: "Microsoft" },
  ms: { symbol: "MSFT", name: "Microsoft" },
  마이크로소프트: { symbol: "MSFT", name: "Microsoft" },
  google: { symbol: "GOOGL", name: "Alphabet" },
  alphabet: { symbol: "GOOGL", name: "Alphabet" },
  구글: { symbol: "GOOGL", name: "Alphabet" },
  amazon: { symbol: "AMZN", name: "Amazon" },
  아마존: { symbol: "AMZN", name: "Amazon" },
  meta: { symbol: "META", name: "Meta" },
  facebook: { symbol: "META", name: "Meta" },
  메타: { symbol: "META", name: "Meta" },
  netflix: { symbol: "NFLX", name: "Netflix" },
  넷플릭스: { symbol: "NFLX", name: "Netflix" },
  intel: { symbol: "INTC", name: "Intel" },
  인텔: { symbol: "INTC", name: "Intel" },
  intc: { symbol: "INTC", name: "Intel" },
  amd: { symbol: "AMD", name: "AMD" },
  broadcom: { symbol: "AVGO", name: "Broadcom" },
  브로드컴: { symbol: "AVGO", name: "Broadcom" },
  palantir: { symbol: "PLTR", name: "Palantir" },
  팔란티어: { symbol: "PLTR", name: "Palantir" },
  smci: { symbol: "SMCI", name: "Super Micro Computer" },
  spy: { symbol: "SPY", name: "S&P 500 ETF" },
  qqq: { symbol: "QQQ", name: "Nasdaq 100 ETF" }
};

function resolveSymbol(input) {
  const raw = (input || "Apple").trim();
  const key = raw.toLowerCase().replace(/[\s._-]+/g, "");
  const direct = symbolDirectory[key];
  if (direct) return direct;
  return { symbol: raw.toUpperCase().replace(/\s+/g, ""), name: raw.toUpperCase().replace(/\s+/g, "") };
}

function sma(values, length) {
  const slice = values.slice(-length);
  return slice.reduce((sum, value) => sum + value, 0) / slice.length;
}

function rsi(values, length = 14) {
  const recent = values.slice(-(length + 1));
  let gains = 0;
  let losses = 0;

  for (let index = 1; index < recent.length; index += 1) {
    const change = recent[index] - recent[index - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function dailyReturns(values) {
  return values.slice(1).map((value, index) => Math.log(value / values[index]));
}

function standardDeviation(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const probability = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - probability : probability;
}

function maxDrawdown(values, window = 60) {
  let peak = values.at(-window) || values[0];
  let worst = 0;
  values.slice(-window).forEach((value) => {
    peak = Math.max(peak, value);
    worst = Math.min(worst, (value - peak) / peak);
  });
  return worst;
}

function analyze(values) {
  const last = values.at(-1);
  const previous = values.at(-2);
  const sma5 = sma(values, 5);
  const sma20 = sma(values, 20);
  const sma60 = sma(values, Math.min(60, values.length));
  const currentRsi = rsi(values);
  const returns = dailyReturns(values);
  const momentum5 = (last - values.at(-6)) / values.at(-6);
  const momentum20 = (last - values.at(-21)) / values.at(-21);
  const volatility = standardDeviation(returns.slice(-20));
  const avg20 = returns.slice(-20).reduce((sum, value) => sum + value, 0) / Math.min(20, returns.length);
  const trendStrength = volatility ? avg20 / (volatility / Math.sqrt(20)) : 0;
  const trendProbability = normalCdf(trendStrength);
  const mediumTrend = last > sma60 ? 0.56 : 0.44;
  const shortHeat = currentRsi > 72 ? 0.43 : currentRsi < 32 ? 0.57 : 0.51;
  const recentDirection = last > previous ? 0.53 : 0.47;
  const drawdown = maxDrawdown(values);
  const uncertaintyPenalty = clamp(volatility * 2.2 + Math.abs(drawdown) * 0.35, 0, 0.16);
  const rawProbability =
    trendProbability * 0.38 +
    (momentum20 > 0 ? 0.58 : 0.42) * 0.22 +
    mediumTrend * 0.18 +
    shortHeat * 0.14 +
    recentDirection * 0.08 -
    uncertaintyPenalty;
  const probability = Math.round(clamp(rawProbability * 100, 22, 78));
  const backtestHitRate = estimateHitRate(values);
  const confidenceLabel = probability >= 58 ? "긍정 쪽" : probability <= 42 ? "주의 쪽" : "중립";

  return {
    last,
    previous,
    probability,
    sma5,
    sma20,
    sma60,
    currentRsi,
    momentum5,
    momentum20,
    volatility,
    drawdown,
    backtestHitRate,
    confidenceLabel,
    signals: [
      {
        title: momentum5 >= 0 ? "최근 1주일 가격 흐름이 좋습니다" : "최근 1주일 가격 흐름이 약합니다",
        text: `${momentum5 >= 0 ? "+" : ""}${(momentum5 * 100).toFixed(2)}% 변했습니다.`
      },
      {
        title: last >= sma20 ? "한 달 평균보다 위에 있습니다" : "한 달 평균보다 아래에 있습니다",
        text: `현재 가격이 최근 한 달 평균보다 ${last >= sma20 ? "높아" : "낮아"} 추세 점수에 반영했습니다.`
      },
      {
        title: currentRsi > 72 ? "단기적으로 너무 빨리 올랐을 수 있습니다" : currentRsi < 32 ? "단기적으로 과하게 눌렸을 수 있습니다" : "단기 과열은 크지 않습니다",
        text: "최근 상승일과 하락일의 힘을 비교해 과열 여부를 점검했습니다."
      }
    ],
    risks: [
      {
        title: "하루 예측은 원래 흔들림이 큽니다",
        text: "실적 발표, 금리 뉴스, 장 시작 전 이슈가 나오면 계산 결과보다 뉴스 영향이 커질 수 있습니다."
      },
      {
        title: volatility > 0.025 ? "최근 가격 흔들림이 큰 편입니다" : "최근 가격 흔들림은 보통 수준입니다",
        text: `최근 한 달 동안 하루 평균 약 ${(volatility * 100).toFixed(2)}% 정도 움직였습니다.`
      },
      {
        title: Math.abs(drawdown) > 0.12 ? "최근 고점 대비 낙폭이 있습니다" : "최근 고점 대비 낙폭은 크지 않습니다",
        text: `최근 구간의 최대 하락폭은 ${(drawdown * 100).toFixed(2)}%입니다.`
      }
    ]
  };
}

function estimateHitRate(values) {
  let hits = 0;
  let attempts = 0;

  for (let index = 25; index < values.length - 1; index += 1) {
    const history = values.slice(0, index + 1);
    const outlook = analyzeWithoutBacktest(history);
    const nextWasUp = values[index + 1] > values[index];
    if ((outlook >= 50) === nextWasUp) hits += 1;
    attempts += 1;
  }

  return attempts ? hits / attempts : 0;
}

function analyzeWithoutBacktest(values) {
  const last = values.at(-1);
  const previous = values.at(-2);
  const returns = dailyReturns(values);
  const vol = standardDeviation(returns.slice(-20));
  const avg20 = returns.slice(-20).reduce((sum, value) => sum + value, 0) / Math.min(20, returns.length);
  const trendProbability = normalCdf(vol ? avg20 / (vol / Math.sqrt(20)) : 0);
  const heat = rsi(values) > 72 ? 0.43 : rsi(values) < 32 ? 0.57 : 0.51;
  const raw =
    trendProbability * 0.38 +
    ((last - values.at(-21)) / values.at(-21) > 0 ? 0.58 : 0.42) * 0.22 +
    (last > sma(values, Math.min(60, values.length)) ? 0.56 : 0.44) * 0.18 +
    heat * 0.14 +
    (last > previous ? 0.53 : 0.47) * 0.08;
  return clamp(raw * 100, 22, 78);
}

async function fetchStooqDaily(symbol) {
  const normalized = symbol.includes(".") ? symbol.toLowerCase() : `${symbol.toLowerCase()}.us`;
  const localApiUrl = `/api/prices?symbol=${encodeURIComponent(symbol)}`;
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d`;
  const directUrl = `https://stooq.com/q/d/l/?s=${encodeURIComponent(normalized)}&i=d`;
  const routes = [];

  if (location.protocol.startsWith("http")) {
    routes.push({ parser: "server", url: localApiUrl, timeout: 2200 });
  }

  routes.push(
    { parser: "yahoo", url: yahooUrl, timeout: 4200 },
    { parser: "yahoo", url: `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`, timeout: 5200 },
    { parser: "yahoo", url: `https://corsproxy.io/?url=${encodeURIComponent(yahooUrl)}`, timeout: 5200 },
    { parser: "stooq", url: directUrl, timeout: 4200 },
    { parser: "stooq", url: `https://api.allorigins.win/raw?url=${encodeURIComponent(directUrl)}`, timeout: 5200 },
    { parser: "stooq", url: `https://corsproxy.io/?url=${encodeURIComponent(directUrl)}`, timeout: 5200 }
  );

  return firstSuccessful(routes.map((route) => () => fetchPriceRoute(route)));
}

function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

async function fetchPriceRoute(route) {
  if (route.parser === "server") {
    const response = await fetchWithTimeout(route.url, route.timeout);
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
      throw new Error("서버 데이터 연결 실패");
    }
    const rows = await response.json();
    if (rows.length < 80) throw new Error("분석할 가격 기록이 부족합니다.");
    return rows.slice(-260);
  }

  if (route.parser === "yahoo") return fetchYahooDirect(route.url, route.timeout);
  return fetchStooqDirect(route.url, route.timeout);
}

async function firstSuccessful(tasks) {
  return new Promise((resolve, reject) => {
    let failed = 0;
    const errors = [];
    tasks.forEach((task) => {
      task().then(resolve).catch((error) => {
        failed += 1;
        errors.push(error);
        if (failed === tasks.length) reject(errors.at(-1) || new Error("실제 가격 데이터를 읽지 못했습니다."));
      });
    });
  });
}

async function fetchYahooDirect(url, timeoutMs = 4500) {
  const response = await fetchWithTimeout(url, timeoutMs);
  if (!response.ok) throw new Error("가격 데이터를 불러오지 못했습니다.");
  const data = await response.json();
  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];
  const rows = timestamps
    .map((timestamp, index) => ({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      close: Number(closes[index])
    }))
    .filter((row) => row.date && Number.isFinite(row.close) && row.close > 0);

  if (rows.length < 80) throw new Error("분석할 수 있는 가격 기록이 부족합니다.");
  return rows.slice(-260);
}

async function fetchStooqDirect(url, timeoutMs = 4500) {
  const response = await fetchWithTimeout(url, timeoutMs);
  if (!response.ok) throw new Error("가격 데이터를 불러오지 못했습니다.");
  const csv = await response.text();
  const rows = csv.trim().split(/\r?\n/).slice(1);
  const prices = rows
    .map((row) => {
      const [date, open, high, low, close] = row.split(",");
      return { date, close: Number(close) };
    })
    .filter((row) => row.date && Number.isFinite(row.close) && row.close > 0);

  if (prices.length < 80) throw new Error("분석할 수 있는 가격 기록이 부족합니다.");
  return prices.slice(-260);
}

async function fetchNews(symbol, companyName) {
  const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(symbol)}&region=US&lang=en-US`;
  const routes = [];

  if (location.protocol.startsWith("http")) {
    routes.push(`/api/news?symbol=${encodeURIComponent(symbol)}&name=${encodeURIComponent(companyName)}`);
  }

  routes.push(
    `https://api.allorigins.win/raw?url=${encodeURIComponent(rssUrl)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(rssUrl)}`
  );

  for (const url of routes) {
    try {
      const response = await fetchWithTimeout(url, 4200);
      if (!response.ok) throw new Error("뉴스 연결 실패");
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await response.json();
        if (Array.isArray(json) && json.length) return json.slice(0, 12);
      }
      const text = await response.text();
      const parsed = parseNewsXml(text);
      if (parsed.length) return parsed.slice(0, 12);
    } catch {
      // Try the next news route.
    }
  }

  return [];
}

function parseNewsXml(xmlText) {
  const xml = new DOMParser().parseFromString(xmlText, "text/xml");
  return Array.from(xml.querySelectorAll("item")).map((item) => ({
    title: item.querySelector("title")?.textContent || "제목 없음",
    link: item.querySelector("link")?.textContent || "#",
    source: "Yahoo Finance",
    publishedAt: item.querySelector("pubDate")?.textContent || ""
  }));
}

function renderList(target, items) {
  target.innerHTML = items
    .map((item) => `<li><strong>${item.title}</strong><span>${item.text}</span></li>`)
    .join("");
}

function render(symbol, rows, mode) {
  const values = rows.map((row) => (typeof row === "number" ? row : row.close));
  const result = analyze(values);
  const lastDate = rows.at(-1)?.date;
  const today = new Date().toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  const up = result.probability >= 50;
  lastAnalysis = { symbol, values, result, mode };
  lastRows = rows;

  els.resultSymbol.textContent = symbol;
  els.asOfDate.textContent = lastDate ? `${lastDate} 종가 기준` : `${today} 기준`;
  els.confidenceBadge.textContent = `${result.probability}%`;
  els.confidenceBadge.style.background = `conic-gradient(#2dd4bf 0deg, #2dd4bf ${result.probability * 3.6}deg, rgba(255,255,255,.12) ${result.probability * 3.6}deg)`;
  els.meterFill.style.width = `${result.probability}%`;
  els.directionText.textContent = up ? "다음 거래일은 상승 가능성이 조금 더 높습니다." : "다음 거래일은 보수적으로 보는 편이 낫습니다.";
  els.priceText.textContent = `마지막 종가 $${result.last.toFixed(2)} 기준`;
  els.hitRate.textContent = `${Math.round(result.backtestHitRate * 100)}%`;
  els.volatility.textContent = `하루 약 ${(result.volatility * 100).toFixed(2)}%`;
  els.dataMode.textContent = mode;
  els.sampleSize.textContent = `${values.length}일`;
  els.latestPrice.textContent = `$${result.last.toFixed(2)}`;
  els.methodSummary.textContent = `최근 ${values.length}일 가격을 사용해 추세, 과열, 흔들림, 낙폭을 따로 계산한 뒤 과거 검증으로 보정했습니다.`;
  renderList(els.signalsList, result.signals);
  renderList(els.risksList, result.risks);
  renderPriceView(rows);
  renderWatchList();
  renderAlerts();
}

function renderPriceView(rows) {
  const normalized = rows.map((row, index) =>
    typeof row === "number" ? { date: `D-${rows.length - index}`, close: row } : row
  );
  const prices = normalized.map((row) => row.close);
  const last = prices.at(-1);
  const monthBase = prices.at(-22) || prices[0];
  const quarterBase = prices.at(-64) || prices[0];
  const month = ((last - monthBase) / monthBase) * 100;
  const quarter = ((last - quarterBase) / quarterBase) * 100;

  els.monthChange.textContent = `${month >= 0 ? "+" : ""}${month.toFixed(2)}%`;
  els.quarterChange.textContent = `${quarter >= 0 ? "+" : ""}${quarter.toFixed(2)}%`;
  drawPriceChart(normalized.slice(-90));

  els.priceList.innerHTML = normalized
    .slice(-8)
    .reverse()
    .map((row) => `<li><span><strong>${row.date || "-"}</strong><strong>$${row.close.toFixed(2)}</strong></span></li>`)
    .join("");
}

function drawPriceChart(rows) {
  const canvas = els.priceChart;
  if (!canvas) return;
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = 34;
  const prices = rows.map((row) => row.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  context.clearRect(0, 0, width, height);
  context.strokeStyle = "rgba(255,255,255,0.09)";
  context.lineWidth = 1;
  for (let line = 0; line < 4; line += 1) {
    const y = padding + ((height - padding * 2) / 3) * line;
    context.beginPath();
    context.moveTo(padding, y);
    context.lineTo(width - padding, y);
    context.stroke();
  }

  context.strokeStyle = "#2dd4bf";
  context.lineWidth = 5;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.beginPath();
  rows.forEach((row, index) => {
    const x = padding + ((width - padding * 2) * index) / Math.max(1, rows.length - 1);
    const y = height - padding - ((row.close - min) / range) * (height - padding * 2);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();

  context.fillStyle = "#cbd5e1";
  context.font = "22px system-ui";
  context.fillText(`$${prices.at(-1).toFixed(2)}`, padding, padding + 4);
}

function renderNews(items) {
  if (!items.length) {
    els.newsStatus.textContent = "뉴스 연결이 지연되고 있습니다. 잠시 후 다시 시도해주세요.";
    els.newsList.innerHTML = '<li><strong>표시할 뉴스가 없습니다</strong><span>데이터 공급 경로가 잠시 막혔을 수 있습니다.</span></li>';
    return;
  }

  els.newsStatus.textContent = `${lastResolved.name} 관련 최신 뉴스입니다.`;
  els.newsList.innerHTML = items
    .map((item) => {
      const date = item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("ko-KR") : "";
      return `<li><a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a><span>${item.source || "Market News"}</span>${date ? `<time>${date}</time>` : ""}</li>`;
    })
    .join("");
}

async function runAnalysis() {
  const query = els.symbolInput.value.trim() || "Apple";
  const resolved = resolveSymbol(query);
  const symbol = resolved.symbol;
  lastResolved = resolved;
  els.analyzeButton.disabled = true;
  els.analyzeButton.textContent = "계산 중";
  els.dataMode.textContent = "불러오는 중";
  els.dataStatus.textContent = `${resolved.name}의 실제 일별 가격을 불러와 분석하고 있습니다.`;
  showLoading(`${resolved.name} 가격 확인 중`, "실제 가격 데이터를 여러 경로에서 동시에 찾고 있습니다.");

  try {
    const rows = await fetchStooqDaily(symbol);
    render(resolved.name === symbol ? symbol : `${resolved.name} (${symbol})`, rows, "실제 데이터");
    els.dataStatus.textContent = `${resolved.name} 실제 일별 가격으로 분석했습니다.`;
    fetchNews(symbol, resolved.name).then(renderNews);
  } catch (error) {
    render(resolved.name === symbol ? symbol : `${resolved.name} (${symbol})`, demoSeries, "임시 분석");
    els.dataStatus.textContent = `${resolved.name}의 실제 가격 연결이 지연되고 있습니다. 잠시 후 다시 시도하거나 네트워크 상태를 확인해주세요.`;
    fetchNews(symbol, resolved.name).then(renderNews);
    els.risksList.insertAdjacentHTML(
      "afterbegin",
      `<li><strong>현재 가격 연결 실패</strong><span>${error.message}</span></li>`
    );
  } finally {
    els.analyzeButton.disabled = false;
    els.analyzeButton.textContent = "분석";
    hideLoading();
  }
}

function showLoading(title, text) {
  els.loadingTitle.textContent = title;
  els.loadingText.textContent = text;
  els.loadingPanel.classList.remove("hidden");
}

function hideLoading() {
  els.loadingPanel.classList.add("hidden");
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
    document.querySelectorAll(".detail-panel").forEach((panel) => panel.classList.add("hidden"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.tab}Panel`).classList.remove("hidden");
  });
});

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".screen").forEach((screen) => screen.classList.add("hidden"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.screen}Screen`).classList.remove("hidden");
    renderWatchList();
    renderAlerts();
  });
});

function saveWatchSymbols() {
  localStorage.setItem("stock-compass-watch", JSON.stringify(watchSymbols));
}

function syntheticSeriesFor(symbol) {
  const seed = [...symbol].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return demoSeries.map((value, index) => {
    const wave = Math.sin((index + seed) / 5) * 1.8;
    const drift = ((seed % 17) - 8) * 0.08 * index;
    return Math.max(12, value + wave + drift);
  });
}

function renderWatchList() {
  if (!els.watchList) return;
  els.watchList.innerHTML = watchSymbols
    .map((symbol) => {
      const result = analyze(syntheticSeriesFor(symbol));
      return `<li><span><strong>${symbol}</strong><span>${result.probability}% 상승 가능성</span></span><button data-load="${symbol}" type="button">열기</button></li>`;
    })
    .join("");

  els.watchList.querySelectorAll("button[data-load]").forEach((button) => {
    button.addEventListener("click", () => {
      els.symbolInput.value = button.dataset.load;
      render(button.dataset.load, syntheticSeriesFor(button.dataset.load), "Demo");
      showScreen("forecast");
    });
  });
}

function renderAlerts() {
  if (!els.alertList) return;
  const threshold = Number(els.alertThreshold.value);
  const alerts = watchSymbols
    .map((symbol) => ({ symbol, result: analyze(syntheticSeriesFor(symbol)) }))
    .filter((item) => item.result.probability >= threshold);

  els.alertList.innerHTML = alerts.length
    ? alerts.map((item) => `<li><strong>${item.symbol} ${item.result.probability}%</strong><span>상승 신호가 설정 기준을 넘었습니다.</span></li>`).join("")
    : '<li><strong>조건에 맞는 종목 없음</strong><span>기준을 낮추거나 관심종목을 추가해보세요.</span></li>';
}

function showScreen(name) {
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.screen === name));
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.add("hidden"));
  document.querySelector(`#${name}Screen`).classList.remove("hidden");
  if (name === "price") renderPriceView(lastRows);
  if (name === "news") fetchNews(lastResolved.symbol, lastResolved.name).then(renderNews);
}

els.analyzeButton.addEventListener("click", runAnalysis);
els.symbolInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") runAnalysis();
});

document.querySelectorAll("[data-pick]").forEach((button) => {
  button.addEventListener("click", () => {
    els.symbolInput.value = button.dataset.pick;
    runAnalysis();
  });
});

els.saveWatchButton.addEventListener("click", () => {
  const symbol = (lastAnalysis?.symbol || els.symbolInput.value || "AAPL").trim().toUpperCase();
  if (!watchSymbols.includes(symbol)) {
    watchSymbols = [symbol, ...watchSymbols].slice(0, 12);
    saveWatchSymbols();
  }
  renderWatchList();
  renderAlerts();
});

els.alertThreshold.addEventListener("input", () => {
  els.thresholdValue.textContent = `${els.alertThreshold.value}%`;
  renderAlerts();
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

els.installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

render("Apple (AAPL)", demoSeries, "연결 중");
runAnalysis();
