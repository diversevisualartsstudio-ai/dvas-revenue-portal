const CONFIG = window.DVAS_CONFIG || {};
const hasSupabaseConfig = Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && CONFIG.organizationId);
const dateNow = new Date();
const demo = {
  clients: [
    { id: 'c1', name: 'Crestline Studios' }, { id: 'c2', name: 'Northwest Media Group' },
    { id: 'c3', name: 'Helio Labs' }, { id: 'c4', name: 'NovaWorks' }
  ],
  opportunities: [
    { id: 'o1', title: 'Enterprise expansion', client: 'Crestline Studios', stage: 'negotiation', amount: 420000, currency: 'USD', close: daysFromNow(18) },
    { id: 'o2', title: 'AI risk automation', client: 'Northwest Media Group', stage: 'proposal', amount: 310000, currency: 'USD', close: daysFromNow(32) },
    { id: 'o3', title: 'Security compliance suite', client: 'Helio Labs', stage: 'qualified', amount: 280000, currency: 'USD', close: daysFromNow(54) },
    { id: 'o4', title: 'Creative platform renewal', client: 'NovaWorks', stage: 'lead', amount: 145000, currency: 'USD', close: daysFromNow(76) },
    { id: 'o5', title: 'Studio workflow expansion', client: 'Crestline Studios', stage: 'won', amount: 95000, currency: 'USD', close: daysFromNow(-22) },
    { id: 'o6', title: 'Media archive pilot', client: 'Northwest Media Group', stage: 'lost', amount: 65000, currency: 'USD', close: daysFromNow(-48) }
  ],
  revenue: Array.from({ length: 12 }, (_, i) => ({
    recognized_on: new Date(dateNow.getFullYear(), dateNow.getMonth() - (11 - i), 15).toISOString().slice(0, 10),
    amount: [84000, 91000, 88000, 104000, 112000, 98000, 123000, 116000, 131000, 127000, 142000, 151000][i], currency: 'USD'
  })),
  security: [
    { control_name: 'Access review', status: 'healthy', owner_name: 'Security' },
    { control_name: 'Data encryption', status: 'healthy', owner_name: 'Platform' },
    { control_name: 'AI governance', status: 'monitor', owner_name: 'Operations' },
    { control_name: 'Third-party audit', status: 'action', owner_name: 'Legal' }
  ]
};
let supabase;
let data = null;
let sort = { key: 'amount', direction: 'desc' };
const $ = (id) => document.getElementById(id);

function daysFromNow(days) { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function escapeHTML(value = '') { return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function money(value, currency = 'USD') { return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value) || 0); }
function formatDate(value) { if (!value) return '—'; return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T00:00:00`)); }
function setLoading(loading) { document.querySelector('.metrics').setAttribute('aria-busy', String(loading)); $('refresh-button').disabled = loading; $('refresh-button').classList.toggle('is-loading', loading); }
function showError(error) { $('error-message').textContent = error?.message || 'Check your connection and try again.'; $('error-state').classList.remove('hidden'); }
function stageLabel(stage) { return ({ lead: 'Lead', qualified: 'Qualified', proposal: 'Proposal', negotiation: 'Negotiation', won: 'Won', lost: 'Lost' })[stage] || stage; }

async function initialize() {
  if (!hasSupabaseConfig) {
    $('data-mode').textContent = 'Demo data';
    $('notice').textContent = 'You’re viewing sample data. Connect Supabase in config.js to use your private workspace.';
    $('notice').classList.remove('hidden');
    data = demo;
    render();
    return;
  }
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
    $('data-mode').textContent = 'Private workspace';
    $('auth-panel').classList.remove('hidden');
    $('dashboard').classList.add('hidden');
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (session) await enterWorkspace();
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) { $('auth-panel').classList.add('hidden'); $('dashboard').classList.remove('hidden'); loadData(); }
      else { $('auth-panel').classList.remove('hidden'); $('dashboard').classList.add('hidden'); }
    });
  } catch (error) { showError(error); }
}

async function enterWorkspace() { $('auth-panel').classList.add('hidden'); $('dashboard').classList.remove('hidden'); $('sign-out').classList.remove('hidden'); await loadData(); }
async function loadData() {
  if (!supabase) { render(); return; }
  setLoading(true); $('error-state').classList.add('hidden');
  try {
    const org = CONFIG.organizationId;
    const [clientsRes, opportunitiesRes, revenueRes, securityRes] = await Promise.all([
      supabase.from('clients').select('id,name').eq('org_id', org),
      supabase.from('opportunities').select('id,title,stage,amount,currency,expected_close_date,clients(name)').eq('org_id', org),
      supabase.from('revenue_records').select('id,amount,currency,recognized_on').eq('org_id', org),
      supabase.from('security_checks').select('id,control_name,status,owner_name,due_date').eq('org_id', org)
    ]);
    const failed = [clientsRes, opportunitiesRes, revenueRes, securityRes].find((result) => result.error);
    if (failed) throw failed.error;
    data = {
      clients: clientsRes.data || [],
      opportunities: (opportunitiesRes.data || []).map((item) => ({ id: item.id, title: item.title, client: item.clients?.name || 'Unassigned', stage: item.stage, amount: item.amount, currency: item.currency || 'USD', close: item.expected_close_date })),
      revenue: revenueRes.data || [], security: securityRes.data || []
    };
    render(); $('updated-at').textContent = `Updated ${new Date().toLocaleString()}`;
  } catch (error) { showError(error); }
  finally { setLoading(false); }
}

function render() {
  if (!data) return;
  const days = Number($('range-select').value);
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
  const revenue = data.revenue.filter((row) => row.recognized_on && new Date(`${row.recognized_on}T00:00:00`) >= cutoff);
  const total = revenue.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const open = data.opportunities.filter((item) => !['won', 'lost'].includes(item.stage));
  const pipelineTotal = open.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const actionCount = data.security.filter((item) => item.status !== 'healthy').length;
  $('kpi-revenue').textContent = money(total, revenue[0]?.currency || 'USD');
  $('kpi-clients').textContent = new Intl.NumberFormat().format(data.clients.length);
  $('kpi-pipeline').textContent = money(pipelineTotal, open[0]?.currency || 'USD');
  $('kpi-security').textContent = new Intl.NumberFormat().format(actionCount);
  $('security-foot').textContent = actionCount === 1 ? 'Control requiring attention' : 'Controls requiring attention';
  renderChart(revenue); renderPipeline(open); renderTable(); renderSecurity();
}

function renderChart(rows) {
  const months = Number($('range-select').value) <= 30 ? 4 : Number($('range-select').value) <= 90 ? 3 : 12;
  const points = Array.from({ length: months }, (_, index) => {
    const d = new Date(); d.setMonth(d.getMonth() - (months - 1 - index));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { key, label: d.toLocaleDateString(undefined, { month: 'short' }), value: rows.filter((r) => String(r.recognized_on).startsWith(key)).reduce((s, r) => s + Number(r.amount || 0), 0) };
  });
  const max = Math.max(1, ...points.map((p) => p.value));
  const coords = points.map((p, i) => `${34 + (i * 632 / Math.max(1, points.length - 1))},${166 - (p.value / max) * 126}`).join(' ');
  const dots = points.map((p, i) => `<circle cx="${34 + (i * 632 / Math.max(1, points.length - 1))}" cy="${166 - (p.value / max) * 126}" r="4" fill="var(--chart)"/><text x="${34 + (i * 632 / Math.max(1, points.length - 1))}" y="198" text-anchor="middle">${escapeHTML(p.label)}</text>`).join('');
  const area = `${coords} 666,166 34,166`;
  $('revenue-chart').innerHTML = rows.length ? `<svg viewBox="0 0 700 215" role="img" aria-labelledby="svg-title svg-desc"><title id="svg-title">Revenue trend</title><desc id="svg-desc">Revenue over the selected period, based on ${rows.length} records.</desc><line x1="34" y1="40" x2="666" y2="40" class="grid-line"/><line x1="34" y1="103" x2="666" y2="103" class="grid-line"/><line x1="34" y1="166" x2="666" y2="166" class="grid-line"/><polygon points="${area}" class="chart-area"/><polyline points="${coords}" class="chart-line"/>${dots}</svg>` : '<div class="chart-empty">No revenue recorded in this period.</div>';
  $('chart-summary').textContent = points.map((p) => `${p.label}: ${money(p.value)}`).join('. ');
}

function renderPipeline(open) {
  const stages = ['lead', 'qualified', 'proposal', 'negotiation'];
  $('pipeline-summary').innerHTML = stages.map((stage) => {
    const value = open.filter((item) => item.stage === stage).reduce((s, item) => s + Number(item.amount || 0), 0);
    const percentage = open.length ? Math.max(0, Math.min(100, (value / Math.max(1, ...stages.map((s) => open.filter((item) => item.stage === s).reduce((sum, item) => sum + Number(item.amount || 0), 0)))) * 100)) : 0;
    return `<div class="stage-row"><div class="stage-row-label"><span>${stageLabel(stage)}</span><strong>${money(value)}</strong></div><div class="progress-track" role="progressbar" aria-label="${stageLabel(stage)} pipeline value" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percentage)}"><span style="width:${percentage}%"></span></div></div>`;
  }).join('');
}

function renderTable() {
  const query = $('search-input').value.trim().toLowerCase(); const stage = $('stage-filter').value;
  const items = data.opportunities.filter((item) => (stage === 'all' || item.stage === stage) && `${item.title} ${item.client} ${item.stage}`.toLowerCase().includes(query));
  items.sort((a, b) => { let x = sort.key === 'client' ? a.client : sort.key === 'close' ? a.close || '' : sort.key === 'amount' ? Number(a.amount) : sort.key === 'stage' ? a.stage : a.title; let y = sort.key === 'client' ? b.client : sort.key === 'close' ? b.close || '' : sort.key === 'amount' ? Number(b.amount) : sort.key === 'stage' ? b.stage : b.title; return (x > y ? 1 : x < y ? -1 : 0) * sort.direction; });
  $('opportunities-body').innerHTML = items.map((item) => `<tr><td class="deal-name">${escapeHTML(item.title)}</td><td>${escapeHTML(item.client)}</td><td><span class="stage-chip stage-${escapeHTML(item.stage)}">${escapeHTML(stageLabel(item.stage))}</span></td><td class="amount-cell">${money(item.amount, item.currency)}</td><td>${formatDate(item.close)}</td></tr>`).join('');
  $('empty-state').classList.toggle('hidden', items.length > 0);
  document.querySelector('.table-scroll').classList.toggle('hidden', items.length === 0);
}

function renderSecurity() {
  const items = data.security || []; const issueCount = items.filter((item) => item.status !== 'healthy').length;
  $('security-status').textContent = issueCount ? `${issueCount} need attention` : 'All healthy';
  $('security-status').className = `status-pill ${issueCount ? 'status-warning' : 'status-good'}`;
  $('security-list').innerHTML = items.length ? items.map((item) => `<div class="security-row"><span class="security-dot status-${escapeHTML(item.status)}" aria-hidden="true"></span><strong>${escapeHTML(item.control_name)}</strong><span>${escapeHTML(item.owner_name || 'Unassigned')}</span><span class="status-text status-${escapeHTML(item.status)}">${escapeHTML(stageLabel(item.status))}</span></div>`).join('') : '<p class="muted">No security checks have been added.</p>';
}

$('theme-toggle').addEventListener('click', () => { const light = document.documentElement.dataset.theme !== 'light'; document.documentElement.dataset.theme = light ? 'light' : 'dark'; $('theme-toggle').setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme'); localStorage.setItem('dvas-theme', light ? 'light' : 'dark'); });
const savedTheme = localStorage.getItem('dvas-theme'); if (savedTheme) { document.documentElement.dataset.theme = savedTheme; $('theme-toggle').setAttribute('aria-label', savedTheme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'); }
$('range-select').addEventListener('change', render); $('search-input').addEventListener('input', renderTable); $('stage-filter').addEventListener('change', renderTable);
document.querySelectorAll('.sort-button').forEach((button) => button.addEventListener('click', () => { const key = button.dataset.sort; sort = { key, direction: sort.key === key ? -sort.direction : 1 }; document.querySelectorAll('.sort-button').forEach((b) => b.setAttribute('aria-pressed', String(b === button))); renderTable(); }));
$('clear-filters').addEventListener('click', () => { $('search-input').value = ''; $('stage-filter').value = 'all'; renderTable(); $('search-input').focus(); });
$('refresh-button').addEventListener('click', loadData); $('retry-button').addEventListener('click', loadData);
$('login-form').addEventListener('submit', async (event) => { event.preventDefault(); const message = $('auth-message'); message.textContent = 'Signing in…'; const { error } = await supabase.auth.signInWithPassword({ email: $('email').value, password: $('password').value }); message.textContent = error ? error.message : 'Signed in. Loading your workspace…'; if (!error) await enterWorkspace(); });
$('sign-out').addEventListener('click', async () => { const { error } = await supabase.auth.signOut(); if (error) showError(error); });
initialize();
