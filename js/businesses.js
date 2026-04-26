const SUPABASE_URL  = 'https://coymqpazmzvxanabnhre.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNveW1xcGF6bXp2eGFuYWJuaHJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4OTEzMDgsImV4cCI6MjA5MTQ2NzMwOH0.-SSDHl4DrGWfxfPIsPuUMr1NkSdoHVAZSis3KhSQEUk';
const PLACEHOLDER   = 'https://res.cloudinary.com/dg7zncjcv/image/upload/v1776842338/RBWSLogo_buildings_ywbl6a.png';

let allBiz = [], filtered = [], currentIdx = 0, activeFilter = '';

async function fetchAll() {
  const url = SUPABASE_URL + '/rest/v1/businesses'
    + '?select=id,name,short_desc,city,state_code,category_id,price_range,rating,image_url,website,phone'
    + '&status=eq.approved&order=featured.desc,rating.desc';
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON }
  });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

const CAT = {
  1:'Food & Restaurant', 2:'Fashion & Apparel', 3:'Health & Wellness',
  4:'Technology', 5:'Beauty & Personal Care', 6:'Art & Creative',
  7:'Finance & Legal', 8:'Education & Tutoring', 9:'Freelancers',
  10:'Handyman Services', 12:'Transportation & Logistics',
  13:'Digital & Social Media', 14:'Others'
};

function setFilter(cat, btn) {
  activeFilter = cat;
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  filtered = cat ? allBiz.filter(b => CAT[b.category_id] === cat) : allBiz;
  currentIdx = 0;
  renderStack();
}

function updateCounter() {
  const total = filtered.length;
  const shown = Math.min(currentIdx + 1, total);
  document.getElementById('nav-counter').textContent = total ? `${shown} / ${total}` : '';
  document.getElementById('ctrl-label').textContent  = total ? `${shown} of ${total}` : '';
  document.getElementById('btn-prev').disabled = currentIdx <= 0;
  document.getElementById('btn-next').disabled = currentIdx >= total - 1;
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function cardHTML(biz, posClass) {
  const cat   = CAT[biz.category_id] || '';
  const loc   = [biz.city, biz.state_code].filter(Boolean).join(', ');
  const stars  = biz.rating ? '★ ' + parseFloat(biz.rating).toFixed(1) : '';
  const href   = biz.website
    ? (/^https?:\/\//i.test(biz.website) ? biz.website : 'https://' + biz.website)
    : null;
  const imgSrc = biz.image_url || null;

  return `
<div class="biz-card-stack ${posClass}" data-id="${biz.id}">
  ${imgSrc ? `<img class="card-img" src="${imgSrc}" alt="${esc(biz.name)}" data-fallback>` : ''}
  <div class="card-img-placeholder"${imgSrc ? ' style="display:none"' : ''}>
    <img src="${PLACEHOLDER}" alt="placeholder">
  </div>
  <div class="card-body">
    ${cat ? `<span class="card-cat-badge">${esc(cat)}</span>` : ''}
    <div class="card-name">${esc(biz.name)}</div>
    <div class="card-loc">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
      ${esc(loc)}
    </div>
    ${biz.short_desc ? `<p class="card-desc">${esc(biz.short_desc)}</p>` : ''}
    <div class="card-footer">
      <div class="card-meta">
        ${biz.price_range ? `<span class="card-price">${esc(biz.price_range)}</span>` : ''}
        ${stars ? `<span class="card-rating">${stars}</span>` : ''}
      </div>
      ${href ? `<a class="card-btn" href="${href}" target="_blank" rel="noopener" data-visit>Visit →</a>` : ''}
    </div>
  </div>
</div>`;
}

function wireImages(container) {
  container.querySelectorAll('img[data-fallback]').forEach(img => {
    img.addEventListener('error', function() {
      this.style.display = 'none';
      const ph = this.nextElementSibling;
      if (ph) ph.style.display = 'flex';
    }, { once: true });
  });
}

function renderStack() {
  const container = document.getElementById('stack-container');
  const controls  = document.getElementById('controls');
  updateCounter();

  if (!filtered.length) {
    container.innerHTML = '<div class="state-msg"><p>No businesses found in this category yet.</p></div>';
    controls.style.display = 'none';
    return;
  }

  if (currentIdx >= filtered.length) {
    container.innerHTML = doneHTML();
    controls.style.display = 'none';
    return;
  }

  controls.style.display = 'flex';

  const front  = filtered[currentIdx];
  const middle = filtered[currentIdx + 1];
  const back   = filtered[currentIdx + 2];

  container.innerHTML = `
    <div class="stack-wrap" id="stack-wrap">
      ${back   ? cardHTML(back,   'is-back')   : ''}
      ${middle ? cardHTML(middle, 'is-middle') : ''}
      ${cardHTML(front, 'is-front')}
    </div>`;

  wireImages(container);
  attachDrag();
}

function doneHTML() {
  return `
  <div class="done-card">
    <div class="done-icon">🏁</div>
    <h2>You've seen them all!</h2>
    <p>You've browsed every verified business${activeFilter ? ' in this category' : ''}.<br>More are added regularly — check back soon.</p>
    <button class="btn-restart" data-action="restart">Start Over ↺</button>
  </div>`;
}

function restartStack() { currentIdx = 0; renderStack(); }

function nextCard() {
  if (currentIdx >= filtered.length - 1) return;
  animateExit('left', () => { currentIdx++; renderStack(); });
}

function prevCard() {
  if (currentIdx <= 0) return;
  currentIdx--;
  renderStack();
}

function animateExit(dir, cb) {
  const front = document.querySelector('.is-front');
  if (!front) { cb(); return; }
  front.classList.add(dir === 'left' ? 'exit-left' : 'exit-right');
  front.addEventListener('animationend', cb, { once: true });
}

function attachDrag() {
  const card = document.querySelector('.is-front');
  if (!card) return;

  let startX = 0, isDragging = false, currentX = 0;
  const THRESHOLD = 100;

  function onStart(x) { startX = x; isDragging = true; card.classList.add('dragging'); }
  function onMove(x) {
    if (!isDragging) return;
    currentX = x - startX;
    card.style.transform = `rotate(calc(-5deg + ${currentX * 0.08}deg)) translateX(${currentX}px)`;
  }
  function onEnd(x) {
    if (!isDragging) return;
    isDragging = false;
    card.classList.remove('dragging');
    const delta = x - startX;
    if (delta < -THRESHOLD) {
      animateExit('left', () => { currentIdx++; renderStack(); });
    } else if (delta > THRESHOLD && currentIdx > 0) {
      animateExit('right', () => { currentIdx--; renderStack(); });
    } else {
      card.style.transition = 'transform 0.35s cubic-bezier(.22,.68,0,1.2)';
      card.style.transform  = 'rotate(-5deg) translateX(0)';
      setTimeout(() => { card.style.transition = ''; card.style.transform = ''; }, 380);
    }
    currentX = 0;
  }

  card.addEventListener('mousedown', e => { e.preventDefault(); onStart(e.clientX); });
  window.addEventListener('mousemove', e => onMove(e.clientX));
  window.addEventListener('mouseup', e => onEnd(e.clientX), { once: true });
  card.addEventListener('touchstart', e => onStart(e.touches[0].clientX), { passive: true });
  card.addEventListener('touchmove',  e => onMove(e.touches[0].clientX),  { passive: true });
  card.addEventListener('touchend',   e => onEnd(e.changedTouches[0].clientX));
}

// ── EVENT DELEGATION (replaces all inline onclick) ────────────────────────────

document.addEventListener('click', e => {
  if (e.target.closest('[data-action="restart"]')) { restartStack(); return; }
  if (e.target.closest('[data-visit]')) { e.stopPropagation(); return; }

  const pill = e.target.closest('.filter-pill');
  if (pill) { setFilter(pill.dataset.cat || '', pill); return; }
});

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextCard();
  if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prevCard();
});

// ── STATIC BUTTON WIRING ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-back')?.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
  document.getElementById('btn-prev')?.addEventListener('click', prevCard);
  document.getElementById('btn-next')?.addEventListener('click', nextCard);
});

// ── INIT ─────────────────────────────────────────────────────────────────────

(async () => {
  try {
    allBiz   = await fetchAll();
    filtered = allBiz;
    renderStack();
  } catch {
    document.getElementById('stack-container').innerHTML =
      '<div class="state-msg"><p style="color:#ef4444">Failed to load businesses. Please try again.</p></div>';
  }
})();
