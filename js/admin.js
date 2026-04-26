const SUPA_URL  = 'https://coymqpazmzvxanabnhre.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveW1xcGF6bXp2eGFuYWJuaHJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4OTEzMDgsImV4cCI6MjA5MTQ2NzMwOH0.-SSDHl4DrGWfxfPIsPuUMr1NkSdoHVAZSis3KhSQEUk';
const PLACEHOLDER_IMG = 'https://res.cloudinary.com/dg7zncjcv/image/upload/v1776842338/RBWSLogo_buildings_ywbl6a.png';

const supa = window.supabase.createClient(SUPA_URL, SUPA_ANON);
function bizImg(url) { return url || PLACEHOLDER_IMG; }

let allBizCache = [], allStatusFilter = 'all', editingId = null, pendingCache = [];

// ── AUTH ──────────────────────────────────────────────────────────────────────

let _adminCheckDone = false;

supa.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_OUT') { _adminCheckDone = false; showAuthGate(); return; }
  if (event === 'INITIAL_SESSION') {
    if (session) await checkAdminAccess(session);
    else showAuthGate();
  }
});

async function checkAdminAccess(session) {
  if (_adminCheckDone) return;
  _adminCheckDone = true;
  try {
    const { data, error } = await supa.from('admin_users').select('email')
      .eq('email', session.user.email).maybeSingle();
    if (error || !data) {
      document.getElementById('denied-email').textContent = session.user.email;
      document.getElementById('auth-access-denied').classList.add('show');
      _adminCheckDone = false;
      await supa.auth.signOut();
      return;
    }
    showAdmin(session);
  } catch {
    _adminCheckDone = false;
    showAuthError('Connection error — please try again.');
    showAuthGate();
  }
}

function showAdmin(session) {
  document.getElementById('auth-gate').style.display = 'none';
  document.getElementById('admin-app').classList.add('ready');
  document.getElementById('nav-user').textContent = session.user.email;
  initAdmin();
}

function showAuthGate() {
  document.getElementById('auth-gate').style.display = 'flex';
  document.getElementById('admin-app').classList.remove('ready');
  const btn = document.getElementById('auth-btn');
  btn.disabled = false; btn.textContent = 'Sign In →';
}

async function loginWithEmail() {
  const email = document.getElementById('auth-email').value.trim();
  const pass  = document.getElementById('auth-pass').value;
  if (!email || !pass) { showAuthError('Enter your email and password.'); return; }
  const btn = document.getElementById('auth-btn');
  btn.disabled = true; btn.textContent = 'Signing in…';
  clearAuthError();
  try {
    const { data, error } = await supa.auth.signInWithPassword({ email, password: pass });
    if (error) { showAuthError(error.message); btn.disabled = false; btn.textContent = 'Sign In →'; return; }
    if (data?.session) await checkAdminAccess(data.session);
    else { showAuthError('Sign-in succeeded but no session was returned.'); btn.disabled = false; btn.textContent = 'Sign In →'; }
  } catch {
    showAuthError('Network error — check your connection and try again.');
    btn.disabled = false; btn.textContent = 'Sign In →';
  }
}

async function logout() { await supa.auth.signOut(); }

async function resetPassword() {
  const email = document.getElementById('auth-email').value.trim();
  if (!email) { showAuthError('Enter your email address first.'); return; }
  const { error } = await supa.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
  if (error) { showAuthError(error.message); return; }
  showAuthError('Password reset email sent — check your inbox.', true);
}

function showAuthError(msg, info = false) {
  const el = document.getElementById('auth-err');
  el.textContent = msg; el.style.color = info ? 'var(--green)' : ''; el.classList.add('show');
}
function clearAuthError() {
  document.getElementById('auth-err').classList.remove('show');
  document.getElementById('auth-access-denied').classList.remove('show');
}

// ── API ───────────────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const { data: { session } } = await supa.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  const opts = {
    method,
    headers: {
      apikey: SUPA_ANON, Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: method !== 'GET' ? 'return=minimal' : '',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(SUPA_URL + path, opts);
  if (!res.ok) { const txt = await res.text(); throw new Error(`${res.status}: ${txt}`); }
  if (method === 'GET') return res.json();
  return null;
}

// ── INIT ──────────────────────────────────────────────────────────────────────

async function initAdmin() {
  await Promise.all([loadStats(), loadPending(), loadTakedowns(), loadAll(), loadSiteSettings()]);
}

// ── SITE SETTINGS ─────────────────────────────────────────────────────────────

async function loadSiteSettings() {
  try {
    const rows = await api('GET', '/rest/v1/site_settings?select=key,value');
    rows.forEach(r => {
      if (r.key === 'show_category_counts')
        document.getElementById('toggle-cat-counts')?.classList.toggle('on', r.value !== 'false');
    });
  } catch(e) { console.error('Settings load error', e); }
}

async function toggleSetting(key, btn) {
  const isOn = btn.classList.toggle('on');
  try {
    await api('PATCH', `/rest/v1/site_settings?key=eq.${key}`, { value: String(isOn) });
    const msg = document.getElementById('settings-saved-msg');
    if (msg) { msg.textContent = 'Saved ' + new Date().toLocaleTimeString(); setTimeout(() => msg.textContent = '', 3000); }
    toast(isOn ? 'Category counts visible' : 'Category counts hidden', 'success');
  } catch(e) { btn.classList.toggle('on'); toast('Error: ' + e.message, 'error'); }
}

// ── STATS ─────────────────────────────────────────────────────────────────────

async function loadStats() {
  try {
    const all = await api('GET', '/rest/v1/businesses?select=status');
    const counts = { pending: 0, approved: 0, rejected: 0 };
    all.forEach(b => counts[b.status] = (counts[b.status] || 0) + 1);
    document.getElementById('stat-pending').textContent  = counts.pending;
    document.getElementById('stat-approved').textContent = counts.approved;
    document.getElementById('stat-total').textContent    = all.length;
    document.getElementById('tc-all').textContent        = all.length;
  } catch(e) { console.error('Stats error', e); }
  try {
    const tds = await api('GET', '/rest/v1/takedown_requests?select=status&status=eq.pending');
    document.getElementById('stat-takedowns').textContent = tds.length;
    document.getElementById('tc-takedowns').textContent   = tds.length;
  } catch { document.getElementById('stat-takedowns').textContent = '—'; }
}

// ── PENDING ───────────────────────────────────────────────────────────────────

async function loadPending() {
  const grid = document.getElementById('pending-grid');
  grid.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading…</p></div>';
  try {
    pendingCache = await api('GET', '/rest/v1/businesses?select=*&status=eq.pending&order=created_at.asc');
    document.getElementById('tc-pending').textContent = pendingCache.length;
    renderPending(pendingCache);
  } catch(e) {
    grid.innerHTML = `<div class="empty-state"><p style="color:var(--red)">Error: ${e.message}</p></div>`;
  }
}

function renderPending(list) {
  const grid = document.getElementById('pending-grid');
  document.getElementById('pending-count-label').textContent = `${list.length} business${list.length !== 1 ? 'es' : ''}`;
  if (!list.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div><p>No pending businesses — you\'re all caught up.</p></div>';
    return;
  }
  grid.innerHTML = list.map(pendingCard).join('');
  wireImages(grid);
}

function filterPending(q) {
  const filtered = q
    ? pendingCache.filter(b => [b.name, b.city, b.owner_name, b.email].join(' ').toLowerCase().includes(q.toLowerCase()))
    : pendingCache;
  renderPending(filtered);
}

const CAT_NAMES = {
  1:'Food & Restaurant', 2:'Fashion & Apparel', 3:'Health & Wellness', 4:'Technology',
  5:'Beauty & Personal Care', 6:'Art & Creative', 7:'Finance & Legal', 8:'Education & Tutoring',
  9:'Freelancers', 10:'Handyman Services', 12:'Transportation & Logistics',
  13:'Digital & Social Media', 14:'Others'
};

function val(v, fallback = '—') { return (v !== null && v !== undefined && v !== '') ? v : fallback; }

function esc(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function pendingCard(b) {
  const date = new Date(b.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  return `
  <div class="pending-card" id="pc-${b.id}">
    <div class="pc-header">
      <img src="${bizImg(b.image_url)}" alt="${esc(b.name)}" data-fallback style="width:52px;height:52px;object-fit:cover;border-radius:4px;flex-shrink:0;border:1px solid var(--border)">
      <div>
        <div class="pc-title">${esc(b.name)}</div>
        <div class="pc-sub">${esc(CAT_NAMES[b.category_id] || '')} &nbsp;·&nbsp; ${esc(b.location || b.city + ', ' + b.state_code)}</div>
      </div>
      <div class="pc-actions">
        <button class="btn-edit"    data-action="edit"    data-id="${b.id}">Edit</button>
        <button class="btn-reject"  data-action="reject"  data-id="${b.id}">Reject</button>
        <button class="btn-approve" data-action="approve" data-id="${b.id}">Approve ✓</button>
      </div>
    </div>
    <div class="pc-body">
      <div class="pc-grid">
        <div class="pc-field"><label>Owner</label><span class="${!b.owner_name?'empty':''}">${esc(val(b.owner_name))}</span></div>
        <div class="pc-field"><label>Email</label><span class="${!b.email?'empty':''}">${esc(val(b.email))}</span></div>
        <div class="pc-field"><label>Phone</label><span class="${!b.phone?'empty':''}">${esc(val(b.phone))}</span></div>
        <div class="pc-field"><label>Website</label><span class="${!b.website?'empty':''}">${b.website ? `<a href="${/^https?:\/\//i.test(b.website) ? esc(b.website) : 'https://' + esc(b.website)}" target="_blank" rel="noopener" style="color:var(--green)">${esc(b.website)}</a>` : '—'}</span></div>
        <div class="pc-field"><label>Address</label><span class="${!b.address?'empty':''}">${esc(val(b.address))}</span></div>
        <div class="pc-field"><label>Hours</label><span class="${!b.hours?'empty':''}">${esc(val(b.hours))}</span></div>
        <div class="pc-field"><label>Price Range</label><span>${esc(val(b.price_range))}</span></div>
        <div class="pc-field"><label>Verification Score</label><span class="${!b.verification_score?'empty':''}">${b.verification_score ? b.verification_score + '%' : '—'}</span></div>
      </div>
      ${b.description || b.short_desc ? `<p class="pc-desc">${esc(b.description || b.short_desc)}</p>` : ''}
      ${b.verification_notes ? `<p class="pc-desc" style="margin-top:10px;color:var(--amber)">📋 ${esc(b.verification_notes)}</p>` : ''}
    </div>
    <div class="pc-footer">
      <span>Submitted ${date}</span>
      <span>ID: ${b.id}</span>
      <span>Slug: ${esc(b.slug)}</span>
      <button class="btn-sm red" data-action="delete" data-id="${b.id}" data-name="${esc(b.name)}" style="margin-left:auto">Delete</button>
    </div>
  </div>`;
}

async function approveBiz(id) {
  try {
    await api('PATCH', `/rest/v1/businesses?id=eq.${id}`, { status: 'approved' });
    document.getElementById(`pc-${id}`)?.remove();
    pendingCache = pendingCache.filter(b => b.id !== id);
    updatePendingCount(); toast('Approved ✓', 'success'); loadStats();
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

async function rejectBiz(id) {
  if (!confirm('Reject this listing? It will be hidden from the directory.')) return;
  try {
    await api('PATCH', `/rest/v1/businesses?id=eq.${id}`, { status: 'rejected' });
    document.getElementById(`pc-${id}`)?.remove();
    pendingCache = pendingCache.filter(b => b.id !== id);
    updatePendingCount(); toast('Rejected', 'error'); loadStats();
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

async function deleteBiz(id, name) {
  if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
  try {
    await api('DELETE', `/rest/v1/businesses?id=eq.${id}`);
    document.getElementById(`pc-${id}`)?.remove();
    pendingCache = pendingCache.filter(b => b.id !== id);
    allBizCache  = allBizCache.filter(b => b.id !== id);
    updatePendingCount(); renderAllTable(filteredAll()); toast('Deleted', 'error'); loadStats();
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

function updatePendingCount() {
  const n = document.querySelectorAll('.pending-card').length;
  document.getElementById('tc-pending').textContent = n;
  document.getElementById('pending-count-label').textContent = `${n} business${n !== 1 ? 'es' : ''}`;
}

// ── TAKEDOWNS ─────────────────────────────────────────────────────────────────

async function loadTakedowns() {
  const wrap = document.getElementById('takedown-list-wrap');
  wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading…</p></div>';
  try {
    const rows = await api('GET', '/rest/v1/takedown_requests?select=*&order=submitted_at.desc');
    document.getElementById('tc-takedowns').textContent = rows.filter(r => r.status === 'pending').length;
    document.getElementById('takedown-count-label').textContent = `${rows.length} request${rows.length !== 1 ? 's' : ''}`;
    document.getElementById('stat-takedowns').textContent = rows.filter(r => r.status === 'pending').length;
    if (!rows.length) { wrap.innerHTML = '<div class="empty-state"><div class="empty-icon">🏳️</div><p>No takedown requests.</p></div>'; return; }
    wrap.innerHTML = `<div class="takedown-list">${rows.map(takedownRow).join('')}</div>`;
  } catch(e) {
    if (e.message.includes('42P01') || e.message.includes('does not exist')) {
      document.getElementById('takedown-setup').style.display = 'block'; wrap.innerHTML = '';
    } else {
      wrap.innerHTML = `<div class="empty-state"><p style="color:var(--red)">Error: ${e.message}</p></div>`;
    }
  }
}

function takedownRow(r) {
  const date = new Date(r.submitted_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
  const isPending = r.status === 'pending';
  return `
  <div class="takedown-row" id="td-${r.id}">
    <div><div class="tr-name">${esc(r.business_name)}</div></div>
    <div class="tr-email">${esc(r.email)}</div>
    <div class="tr-date">${date}</div>
    <span class="badge badge-${r.status}">${r.status}</span>
    <div style="display:flex;gap:8px">
      ${isPending ? `
        <button class="btn-sm red" data-action="takedown-approve" data-id="${r.id}" data-name="${esc(r.business_name)}">Remove Listing</button>
        <button class="btn-sm"     data-action="takedown-dismiss" data-id="${r.id}">Dismiss</button>
      ` : ''}
    </div>
  </div>`;
}

async function processTakedown(reqId, bizName, action) {
  if (action === 'approve') {
    if (!confirm(`Find and DELETE "${bizName}" from the directory?`)) return;
    try {
      const matches = await api('GET', `/rest/v1/businesses?select=id,name&name=ilike.${encodeURIComponent(bizName)}`);
      if (matches.length === 0) { toast(`No listing found matching "${bizName}"`, 'error'); }
      else if (matches.length === 1) {
        await api('DELETE', `/rest/v1/businesses?id=eq.${matches[0].id}`);
        allBizCache = allBizCache.filter(b => b.id !== matches[0].id);
        toast(`Deleted "${matches[0].name}"`, 'success'); loadStats(); loadAll();
      } else { toast(`${matches.length} listings match — use All Listings tab to manually delete`, 'error'); switchTab('all'); return; }
      await api('PATCH', `/rest/v1/takedown_requests?id=eq.${reqId}`, { status: 'approved', resolved_at: new Date().toISOString() });
    } catch(e) { toast('Error: ' + e.message, 'error'); return; }
  } else {
    try {
      await api('PATCH', `/rest/v1/takedown_requests?id=eq.${reqId}`, { status: 'dismissed', resolved_at: new Date().toISOString() });
      toast('Request dismissed', 'success');
    } catch(e) { toast('Error: ' + e.message, 'error'); return; }
  }
  loadTakedowns();
}

// ── ALL LISTINGS ──────────────────────────────────────────────────────────────

async function loadAll() {
  try {
    allBizCache = await api('GET', '/rest/v1/businesses?select=*&order=created_at.desc');
    document.getElementById('tc-all').textContent = allBizCache.length;
    renderAllTable(filteredAll());
  } catch(e) {
    document.getElementById('all-tbody').innerHTML =
      `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--red)">Error: ${e.message}</td></tr>`;
  }
}

function filteredAll() {
  const q = document.querySelector('#panel-all .toolbar-search')?.value.toLowerCase() || '';
  return allBizCache.filter(b => {
    const matchStatus = allStatusFilter === 'all' || b.status === allStatusFilter;
    const matchQ = !q || [b.name, b.city, b.state_code, b.owner_name, b.email].join(' ').toLowerCase().includes(q);
    return matchStatus && matchQ;
  });
}

function filterAll() { renderAllTable(filteredAll()); }

function setStatusFilter(s, btn) {
  allStatusFilter = s;
  document.querySelectorAll('#panel-all .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAllTable(filteredAll());
}

function renderAllTable(list) {
  const tbody = document.getElementById('all-tbody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted)">No listings found.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(b => {
    const date = new Date(b.created_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
    return `
    <tr>
      <td class="td-name" style="display:flex;align-items:center;gap:10px">
        <img src="${bizImg(b.image_url)}" alt="" data-fallback style="width:36px;height:36px;object-fit:cover;border-radius:3px;flex-shrink:0;border:1px solid var(--border)">
        <div>
          ${esc(b.name)}
          <div style="font-size:.75rem;font-weight:400;color:var(--muted);margin-top:2px">${esc(b.slug)}</div>
        </div>
      </td>
      <td class="td-muted">${esc(CAT_NAMES[b.category_id] || '—')}</td>
      <td class="td-muted">${esc(b.city)}, ${esc(b.state_code)}</td>
      <td><span class="badge badge-${b.status}">${b.status}</span></td>
      <td>
        <div class="featured-toggle ${b.featured ? 'on' : ''}" data-action="toggle-featured" data-id="${b.id}" data-featured="${b.featured}" title="Toggle featured"></div>
      </td>
      <td class="td-muted" style="white-space:nowrap">${date}</td>
      <td class="td-actions">
        <button class="btn-sm"       data-action="edit"         data-id="${b.id}">Edit</button>
        ${b.status !== 'approved' ? `<button class="btn-sm green" data-action="quick-approve" data-id="${b.id}">Approve</button>` : ''}
        ${b.status === 'approved'  ? `<button class="btn-sm red"  data-action="quick-reject"  data-id="${b.id}">Reject</button>`  : ''}
        <button class="btn-sm red"   data-action="delete"       data-id="${b.id}" data-name="${esc(b.name)}">Delete</button>
      </td>
    </tr>`;
  }).join('');
  wireImages(tbody);
}

async function quickStatus(id, status) {
  try {
    await api('PATCH', `/rest/v1/businesses?id=eq.${id}`, { status });
    const biz = allBizCache.find(b => b.id === id);
    if (biz) biz.status = status;
    const pc = document.getElementById(`pc-${id}`);
    if (pc && status !== 'pending') { pc.remove(); pendingCache = pendingCache.filter(b => b.id !== id); updatePendingCount(); }
    renderAllTable(filteredAll());
    toast(status === 'approved' ? 'Approved ✓' : 'Rejected', status === 'approved' ? 'success' : 'error');
    loadStats();
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

async function toggleFeatured(id, current) {
  try {
    await api('PATCH', `/rest/v1/businesses?id=eq.${id}`, { featured: !current });
    const biz = allBizCache.find(b => b.id === id);
    if (biz) biz.featured = !current;
    renderAllTable(filteredAll());
    toast(!current ? '⭐ Marked as featured' : 'Removed from featured', 'success');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

// ── EDIT MODAL ────────────────────────────────────────────────────────────────

async function openEdit(id) {
  let biz = allBizCache.find(b => b.id === id) || pendingCache.find(b => b.id === id);
  if (!biz) {
    try { [biz] = await api('GET', `/rest/v1/businesses?select=*&id=eq.${id}`); } catch { return; }
  }
  editingId = id;
  document.getElementById('edit-modal-title').textContent = 'Edit: ' + biz.name;
  document.getElementById('edit-modal-sub').textContent   = `ID ${biz.id} · ${biz.slug}`;
  const s = v => v ?? '';
  document.getElementById('e-name').value       = s(biz.name);
  document.getElementById('e-cat').value        = s(biz.category_id);
  document.getElementById('e-price').value      = s(biz.price_range);
  document.getElementById('e-status').value     = s(biz.status);
  document.getElementById('e-featured').value   = String(biz.featured);
  document.getElementById('e-short-desc').value = s(biz.short_desc);
  document.getElementById('e-desc').value       = s(biz.description);
  document.getElementById('e-city').value       = s(biz.city);
  document.getElementById('e-state').value      = s(biz.state_code);
  document.getElementById('e-address').value    = s(biz.address);
  document.getElementById('e-lat').value        = s(biz.lat);
  document.getElementById('e-lng').value        = s(biz.lng);
  document.getElementById('e-owner').value      = s(biz.owner_name);
  document.getElementById('e-email').value      = s(biz.email);
  document.getElementById('e-phone').value      = s(biz.phone);
  document.getElementById('e-website').value    = s(biz.website);
  document.getElementById('e-hours').value      = s(biz.hours);
  document.getElementById('e-vscore').value     = s(biz.verification_score);
  document.getElementById('e-year').value       = s(biz.year_established);
  document.getElementById('e-vnotes').value     = s(biz.verification_notes);
  document.getElementById('edit-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('e-name').focus(), 50);
}

function closeEdit() {
  document.getElementById('edit-modal').classList.remove('open');
  document.body.style.overflow = '';
  editingId = null;
}

async function saveEdit() {
  if (!editingId) return;
  const btn = document.getElementById('btn-save');
  btn.disabled = true; btn.textContent = 'Saving…';
  const g = id => document.getElementById(id).value.trim() || null;
  const state = document.getElementById('e-state').value.trim().toUpperCase().slice(0, 2);
  const city  = document.getElementById('e-city').value.trim();
  const payload = {
    name: g('e-name'), category_id: parseInt(document.getElementById('e-cat').value),
    price_range: document.getElementById('e-price').value, status: document.getElementById('e-status').value,
    featured: document.getElementById('e-featured').value === 'true',
    short_desc: g('e-short-desc'), description: g('e-desc'), city, state_code: state,
    location: city && state ? `${city}, ${state}` : null, address: g('e-address'),
    lat:  document.getElementById('e-lat').value  ? parseFloat(document.getElementById('e-lat').value)  : null,
    lng:  document.getElementById('e-lng').value  ? parseFloat(document.getElementById('e-lng').value)  : null,
    owner_name: g('e-owner'), email: g('e-email'), phone: g('e-phone'),
    website: g('e-website'), hours: g('e-hours'),
    verification_score: document.getElementById('e-vscore').value ? parseFloat(document.getElementById('e-vscore').value) : null,
    year_established:   document.getElementById('e-year').value   ? parseInt(document.getElementById('e-year').value)    : null,
    verification_notes: g('e-vnotes'),
  };
  try {
    await api('PATCH', `/rest/v1/businesses?id=eq.${editingId}`, payload);
    const updateCache = cache => {
      const idx = cache.findIndex(b => b.id === editingId);
      if (idx !== -1) cache[idx] = { ...cache[idx], ...payload };
    };
    updateCache(allBizCache); updateCache(pendingCache);
    renderAllTable(filteredAll()); renderPending(pendingCache);
    toast('Saved ✓', 'success'); closeEdit(); loadStats();
  } catch(e) { toast('Error: ' + e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Save Changes'; }
}

// ── TABS ──────────────────────────────────────────────────────────────────────

function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`panel-${name}`).classList.add('active');
  document.getElementById(`tab-btn-${name}`).classList.add('active');
}

// ── TOAST ─────────────────────────────────────────────────────────────────────

let toastTimer;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ── IMAGE FALLBACKS ────────────────────────────────────────────────────────────

function wireImages(container) {
  container.querySelectorAll('img[data-fallback]').forEach(img => {
    img.addEventListener('error', function() {
      this.src = PLACEHOLDER_IMG;
    }, { once: true });
  });
}

// ── EVENT DELEGATION (replaces all inline onclick in dynamic HTML) ─────────────

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  const id     = parseInt(el.dataset.id);
  const name   = el.dataset.name || '';

  switch (action) {
    case 'edit':             openEdit(id); break;
    case 'approve':          approveBiz(id); break;
    case 'reject':           rejectBiz(id); break;
    case 'delete':           deleteBiz(id, name); break;
    case 'toggle-featured':  toggleFeatured(id, el.dataset.featured === 'true'); break;
    case 'quick-approve':    quickStatus(id, 'approved'); break;
    case 'quick-reject':     quickStatus(id, 'rejected'); break;
    case 'takedown-approve': processTakedown(id, name, 'approve'); break;
    case 'takedown-dismiss': processTakedown(id, '', 'dismiss'); break;
  }
});

// ── STATIC BUTTON WIRING ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('auth-btn')?.addEventListener('click', loginWithEmail);
  document.getElementById('auth-email')?.addEventListener('keydown', e => { if (e.key === 'Enter') loginWithEmail(); });
  document.getElementById('auth-pass')?.addEventListener('keydown',  e => { if (e.key === 'Enter') loginWithEmail(); });
  document.querySelector('.auth-forgot a')?.addEventListener('click', e => { e.preventDefault(); resetPassword(); });
  document.querySelector('.btn-logout')?.addEventListener('click', logout);

  document.getElementById('tab-btn-pending')?.addEventListener('click',   () => switchTab('pending'));
  document.getElementById('tab-btn-takedowns')?.addEventListener('click', () => switchTab('takedowns'));
  document.getElementById('tab-btn-all')?.addEventListener('click',       () => switchTab('all'));
  document.getElementById('tab-btn-settings')?.addEventListener('click',  () => switchTab('settings'));

  document.querySelector('#panel-pending .toolbar-search')?.addEventListener('input', e => filterPending(e.target.value));
  document.querySelector('#panel-pending .btn-sm[data-refresh]')?.addEventListener('click', loadPending);

  document.querySelector('#panel-takedowns .btn-sm[data-refresh]')?.addEventListener('click', loadTakedowns);

  document.querySelector('#panel-all .toolbar-search')?.addEventListener('input', filterAll);
  document.querySelector('#panel-all .btn-sm[data-refresh]')?.addEventListener('click', loadAll);

  document.querySelectorAll('#panel-all .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => setStatusFilter(btn.dataset.status, btn));
  });

  document.getElementById('toggle-cat-counts')?.addEventListener('click', function() {
    toggleSetting('show_category_counts', this);
  });

  document.getElementById('btn-save')?.addEventListener('click', saveEdit);
  document.querySelector('.btn-cancel-modal')?.addEventListener('click', closeEdit);
  document.querySelector('.modal-close')?.addEventListener('click', closeEdit);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('edit-modal').classList.contains('open')) closeEdit();
  });
});
