/**
 * macro-viz 配置与数据层
 *
 * 该文件负责：
 * 1. 指标配置（名称、单位、数据生成）
 * 2. 时间范围与自定义日期计算
 * 3. 图表渲染（ECharts）
 * 4. 新闻组件与分页
 * 5. 真实 API 接入点（Finhub/CEIC）
 */

// ------------------------
// 配置
// ------------------------
const CONFIG = {
  indicators: [
    { id: 'gdp', name: 'GDP 同比', unit: '%', series: generateGDP },
    { id: 'cpi', name: 'CPI 同比', unit: '%', series: generateCPI },
    { id: 'pmi', name: 'PMI', unit: '', series: generatePMI },
    { id: 'retail', name: '社会消费品零售总额', unit: '亿元', series: generateRetail },
    { id: 'm2', name: 'M2 同比', unit: '%', series: generateM2 },
    { id: 'trade', name: '进出口总额', unit: '万亿元', series: generateTrade },
  ]
};

// ------------------------
// API 配置
// ------------------------
const API_CONFIG = {
  finhubToken: 'd7530u9r01qg1eo7e52gd7530u9r01qg1eo7e530',
};

// ------------------------
// 工具函数
// ------------------------
function generateGDP(start, end) { return macroSeries(start, end, 5.5, 0.3); }
function generateCPI(start, end) { return macroSeries(start, end, 2.1, 0.4); }
function generatePMI(start, end) { return macroSeries(start, end, 50.0, 1.2); }
function generateRetail(start, end) { return macroSeries(start, end, 1200, 60); }
function generateM2(start, end) { return macroSeries(start, end, 9.8, 0.6); }
function generateTrade(start, end) { return macroSeries(start, end, 38, 2); }

function macroSeries(start, end, mean, stddev) {
  const data = [];
  let cursor = new Date(start);
  while (cursor <= end) {
    const value = mean + (Math.random() - 0.5) * 2 * stddev;
    const label = formatLabel(cursor);
    data.push({ label, value: Number(value.toFixed(2)) });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return data;
}

function formatLabel(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function clampDate(d, min, max) {
  return Math.max(min.getTime(), Math.min(max.getTime(), d.getTime()));
}

function dateRangeFromOption(option) {
  const end = new Date();
  const start = new Date();
  switch (option) {
    case '1y': start.setFullYear(end.getFullYear() - 1); break;
    case '3y': start.setFullYear(end.getFullYear() - 3); break;
    case '5y': start.setFullYear(end.getFullYear() - 5); break;
    case '10y': start.setFullYear(end.getFullYear() - 10); break;
    default: start.setFullYear(end.getFullYear() - 3);
  }
  return { start: new Date(start), end: new Date(end) };
}

function dateRangeCustom(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const today = new Date();
  start.setHours(0,0,0,0);
  end.setHours(0,0,0,0);
  const minStart = new Date(today.getFullYear() - 20, 0, 1);
  const maxEnd = new Date(today.getFullYear() + 1, 0, 1);
  const s = clampDate(start, minStart, maxEnd);
  const e = clampDate(end, s, maxEnd);
  return { start: s, end: e };
}

// ------------------------
// 宏观数据 fetch（示例数据，预留真实 API 接入）
// ------------------------
async function fetchMacroDataByConfig(indicatorIds, range) {
  const result = {};
  for (const id of indicatorIds) {
    const cfg = CONFIG.indicators.find(x => x.id === id);
    if (!cfg) continue;
    const series = cfg.series(range.start, range.end);
    result[id] = series;
  }
  return result;
}

// ------------------------
// 新闻数据：接入 Finhub
// ------------------------
let cachedNews = [];
let newsLoading = false;

async function fetchFinhubNews() {
  if (newsLoading) return;
  newsLoading = true;
  
  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
    const toDate = new Date();
    
    const url = `https://finnhub.io/api/v1/news?category=general&from=${fromDate.toISOString().slice(0,10)}&to=${toDate.toISOString().slice(0,10)}&token=${API_CONFIG.finhubToken}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.value && data.value.length > 0) {
      cachedNews = data.value.slice(0, 100).map(n => ({
        source: n.source || 'Finhub',
        title: n.headline || '无标题',
        summary: n.summary || n.headline || '',
        url: n.url || '#',
        published_at: new Date(n.datetime * 1000).toISOString()
      })).sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
      console.log(`✅ 已加载 ${cachedNews.length} 条 Finhub 新闻`);
    } else {
      throw new Error('No data');
    }
  } catch (e) {
    console.warn('⚠️ Finhub API 调用失败，使用示例数据:', e.message);
    cachedNews = [
      { source: 'Finhub', title: '美国 CPI 同比高于预期，市场关注通胀路径', summary: '最新 CPI 数据显示通胀仍具粘性，市场对降息预期进行重新定价。', url: '#', published_at: new Date(Date.now() - 1000*60*60*2).toISOString() },
      { source: 'Finhub', title: '中国 PMI 连续三个月位于扩张区间', summary: '制造业 PMI 连续三月高于 50，经济恢复持续。', url: '#', published_at: new Date(Date.now() - 1000*60*60*24).toISOString() },
      { source: 'Finhub', title: '社会消费品零售总额保持稳健增长', summary: '消费韧性持续，服务消费增速高于商品消费。', url: '#', published_at: new Date(Date.now() - 1000*60*60*48).toISOString() },
      { source: 'Finhub', title: '全球央行货币政策分化加剧', summary: '部分发达经济体维持高利率，新兴市场逐步转向宽松。', url: '#', published_at: new Date(Date.now() - 1000*60*60*72).toISOString() },
      { source: 'Finhub', title: '进出口总额增速回升', summary: '出口结构优化，高附加值产品占比提升。', url: '#', published_at: new Date(Date.now() - 1000*60*60*96).toISOString() },
    ];
  }
  newsLoading = false;
}

async function fetchNewsDataByConfig(sourceFilter = 'all', pageSize = 8) {
  if (cachedNews.length === 0) {
    await fetchFinhubNews();
  }
  
  let list = cachedNews.filter(n => sourceFilter === 'all' || n.source === sourceFilter);
  const total = list.length;
  const currentPage = newsState.page || 1;
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const items = list.slice(start, end);
  
  return { items, pages: Math.max(1, Math.ceil(total / pageSize)), total };
}

// ------------------------
// ECharts 渲染
// ------------------------
let charts = {};

function renderChart(containerId, indicatorId, range, chartType) {
  const cfg = CONFIG.indicators.find(x => x.id === indicatorId);
  if (!cfg) return;
  const container = document.getElementById(containerId);
  if (!container) return;
  let chart = charts[containerId];
  if (!chart) {
    chart = echarts.init(container);
    charts[containerId] = chart;
  }
  const seriesData = cfg.series(range.start, range.end);
  const xData = seriesData.map(d => d.label);
  const yData = seriesData.map(d => d.value);

  const option = {
    backgroundColor: 'transparent',
    tooltip: { 
      trigger: 'axis', 
      formatter: (params) => {
        const p = params[0];
        return `<div style="font-size:12px;">
          <b>${p.name}</b><br/>
          ${cfg.name}: ${p.value}${cfg.unit || ''}
        </div>`;
      }
    },
    grid: { left: '40', right: '20', top: '30', bottom: '30' },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: { color: '#9aa4b0', fontSize: 11, rotate: 45 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#9aa4b0', fontSize: 11 },
      splitLine: { lineStyle: { color: '#232a36' } }
    },
    series: [{
      name: cfg.name,
      type: chartType,
      data: yData,
      smooth: true,
      itemStyle: { color: '#4fd1c5' },
      areaStyle: chartType === 'area' ? { opacity: 0.25 } : null,
      lineStyle: { width: 2 }
    }]
  };
  chart.setOption(option, true);
}

// ------------------------
// 新闻渲染
// ------------------------
let newsState = { currentSource: 'all', page: 1, pageSize: 8, total: 0, pages: 0, items: [] };

function renderNews() {
  const listEl = document.getElementById('newsList');
  if (!listEl) return;
  listEl.innerHTML = '';
  if (newsState.items.length === 0) {
    listEl.innerHTML = '<div style="font-size:12px;color:#9aa4b0;">暂无新闻数据。</div>';
    return;
  }
  for (const n of newsState.items) {
    const div = document.createElement('div');
    div.className = 'news-item';
    const dt = new Date(n.published_at);
    const dateStr = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    div.innerHTML = `
      <h4>${escapeHtml(n.title)}</h4>
      <p>${escapeHtml(n.summary)}</p>
      <div class="news-meta">
        <span>${dateStr}</span>
        <span>来源：${n.source}</span>
        <a href="${n.url || '#'}" target="_blank" style="color:#4fd1c5;text-decoration:none;">阅读</a>
      </div>
    `;
    listEl.appendChild(div);
  }
  const sel = document.getElementById('newsPage');
  sel.innerHTML = '';
  for (let i = 1; i <= newsState.pages; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `第 ${i} 页`;
    if (i === newsState.page) opt.selected = true;
    sel.appendChild(opt);
  }
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ------------------------
// 页面事件绑定
// ------------------------
async function init() {
  // 预加载 Finhub 新闻
  await fetchFinhubNews();
  
  // 生成指标复选框
  const ckContainer = document.getElementById('indicatorCheckboxes');
  if (ckContainer) {
    CONFIG.indicators.forEach(ind => {
      const wrapper = document.createElement('label');
      wrapper.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;color:#e6edf3;margin-bottom:4px;';
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.value = ind.id;
      chk.checked = true;
      wrapper.appendChild(chk);
      wrapper.appendChild(document.createTextNode(ind.name));
      ckContainer.appendChild(wrapper);
    });
  }

  // 初始化日期
  const now = new Date();
  const todayStr = now.toISOString().slice(0,10);
  const startDateEl = document.getElementById('startDate');
  const endDateEl = document.getElementById('endDate');
  if (startDateEl) startDateEl.value = todayStr;
  if (endDateEl) endDateEl.value = todayStr;

  // 新闻组件事件
  const newsSource = document.getElementById('newsSource');
  const newsPage = document.getElementById('newsPage');
  if (newsSource && newsPage) {
    newsPage.addEventListener('change', async (e) => {
      newsState.page = Number(e.target.value);
      await loadNews();
      renderNews();
    });
    newsSource.addEventListener('change', async (e) => {
      newsState.currentSource = e.target.value;
      newsState.page = 1;
      await loadNews();
      renderNews();
    });
    // 首次加载新闻
    await loadNews();
    renderNews();
  }

  // 图表类型切换
  const chartTypeSel = document.getElementById('chartType');
  if (chartTypeSel) {
    chartTypeSel.addEventListener('change', () => {
      const range = computeRange();
      const type = chartTypeSel.value;
      const checked = getCheckedIndicators();
      checked.forEach(id => {
        const mapId = { gdp:'chartGDP', cpi:'chartCPI', pmi:'chartPMI', retail:'chartRetail', m2:'chartM2', trade:'chartTrade' };
        renderChart(mapId[id], id, range, type);
      });
    });
  }

  // 时间范围切换
  const rangeOpt = document.getElementById('timeRange');
  if (rangeOpt) {
    rangeOpt.addEventListener('change', () => refreshAll(rangeOpt.value));
  }

  // 自定义日期
  if (startDateEl && endDateEl) {
    startDateEl.addEventListener('change', () => refreshAll('custom'));
    endDateEl.addEventListener('change', () => refreshAll('custom'));
  }

  // 刷新按钮
  const btnRefresh = document.getElementById('btnRefresh');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => refreshAll(rangeOpt.value));
  }

  // 窗口大小变化重绘
  window.addEventListener('resize', () => {
    Object.values(charts).forEach(ch => ch && ch.resize());
  });

  // 首次渲染图表
  await refreshAll('3y');
}

function getCheckedIndicators() {
  const list = Array.from(document.querySelectorAll('#indicatorCheckboxes input[type=checkbox]'));
  return list.filter(c => c.checked).map(c => c.value);
}

function computeRange() {
  const option = document.getElementById('timeRange').value;
  if (option === 'custom') {
    const s = document.getElementById('startDate').value;
    const e = document.getElementById('endDate').value;
    if (!s || !e) return dateRangeFromOption('3y');
    return dateRangeCustom(s, e);
  }
  return dateRangeFromOption(option);
}

async function refreshAll(rangeOption) {
  const range = rangeOption === 'custom' 
    ? dateRangeCustom(document.getElementById('startDate').value, document.getElementById('endDate').value)
    : dateRangeFromOption(rangeOption);
  const checked = getCheckedIndicators();
  const chartType = document.getElementById('chartType').value;
  
  // 渲染图表
  const mapId = { gdp:'chartGDP', cpi:'chartCPI', pmi:'chartPMI', retail:'chartRetail', m2:'chartM2', trade:'chartTrade' };
  for (const id of checked) {
    renderChart(mapId[id], id, range, chartType);
  }
  
  // 刷新新闻分页
  await loadNews();
  renderNews();
}

async function loadNews() {
  const source = document.getElementById('newsSource').value;
  const page = newsState.page;
  const res = await fetchNewsDataByConfig(source, 8);
  newsState.total = res.total;
  newsState.pages = res.pages;
  newsState.items = res.items;
}

// 启动
document.addEventListener('DOMContentLoaded', init);
