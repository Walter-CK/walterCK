// GLOBAL JS

// ── Slug helper (Featured pages + banner) ─────────────────────────────────
function toSlug(title) {
  return title
    .replace(/➶/g, '')
    .replace(/[→↗↑▶►]/g, '')
    .replace(/\([^)]*\)/g, '')   // strip (sm), (wip), etc.
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Copy link (global, used by both regular & featured cards) ──────────────
function copyLink(btn, url) {
  navigator.clipboard.writeText(url).then(() => {
    btn.textContent = 'Copied';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
  }).catch(() => {
    btn.textContent = 'Failed';
    setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
  });
}
window.copyLink = copyLink;

// ── Featured sub-page existence check ─────────────────────────────────────
const _fpCache = {};
async function featuredPageExists(slug) {
  if (slug in _fpCache) return _fpCache[slug];
  try {
    const r = await fetch(`/toolkit/${slug}/`, { method: 'HEAD' });
    _fpCache[slug] = r.ok;
  } catch { _fpCache[slug] = false; }
  return _fpCache[slug];
}

window.openFeatured = async function(slug, fallbackLink) {
  if (await featuredPageExists(slug)) {
    window.location.href = `/toolkit/${slug}/`;
  } else {
    window.open(fallbackLink, '_blank');
  }
};

window.copyFeaturedOrLink = async function(btn, slug, fallbackLink) {
  const exists = await featuredPageExists(slug);
  copyLink(btn, exists ? `https://walterck.com/toolkit/${slug}/` : fallbackLink);
};

// ── Toolkit Grid ───────────────────────────────────────────────────────────
const gridContainer = document.getElementById('grid-container');

if (gridContainer) {
  const emptyState      = document.getElementById('empty');
  const searchInput     = document.getElementById('q');
  const filterContainer = document.getElementById('filters');

  let items       = [];
  let categoryMap = {};
  // Multi-select: Set of active category names. Empty set = show all.
  const activeFilters = new Set();

  function isScriptLabel(text) {
    if (!text) return false;
    const t = text.trim().toLowerCase();
    return t === 'script' || t === 'scripts' || /\bscript(s)?\b/.test(t);
  }

  function highlightScripts() {
    const filters = document.getElementById('filters');
    let found = false;

    document.querySelectorAll('.category-title').forEach(el => {
      if (isScriptLabel(el.textContent)) { el.classList.add('script-highlight'); found = true; }
      else el.classList.remove('script-highlight');
    });

    document.querySelectorAll('.filter-chip').forEach(el => {
      if (isScriptLabel(el.textContent) || isScriptLabel(el.dataset.cat)) {
        el.classList.add('script-highlight'); found = true;
      } else { el.classList.remove('script-highlight'); }
    });

    if (found) filters && filters.classList.add('script-found');
    else       filters && filters.classList.remove('script-found');

    highlightFeatured();
    return found;
  }

  function highlightFeatured() {
    const filters = document.getElementById('filters');
    let found = false;

    document.querySelectorAll('.category-title').forEach(el => {
      if (el.textContent.trim() === 'Featured') {
        el.classList.add('featured-highlight'); found = true;
      } else { el.classList.remove('featured-highlight'); }
    });

    document.querySelectorAll('.filter-chip').forEach(el => {
      if (el.dataset.cat === 'Featured') {
        el.classList.add('featured-highlight'); found = true;
      } else { el.classList.remove('featured-highlight'); }
    });

    if (found) filters && filters.classList.add('featured-found');
    else       filters && filters.classList.remove('featured-found');
  }

  async function loadAll() {
    try {
      const res = await fetch('toolkit.json', { cache: 'no-store' });
      const raw = await res.json();

      const mapObj = raw.find(it => !it.title);
      if (mapObj) categoryMap = mapObj;

      items = raw.filter(it => it.title).map(it => ({
        id:       parseInt(it.id) || 999,
        title:    it.title,
        tag:      it.tags  || '',
        category: it.category || 'General',
        icon:     it.icon  || 'box',
        color:    it.color || '#007AFF',
        link:     it.link  || '#',
        slug:     it.slug  || null,
        isNew:    it.new   === true
      }));

      renderFilters();
      applyFilters();
      document.body.classList.add('loaded');
    } catch (err) {
      console.error('Failed to load toolkit.json', err);
      document.body.classList.add('loaded');
    }
  }

  function renderFilters() {
    // No 'All' chip — categories only. Empty activeFilters = show all.
    const categories = [...Object.keys(categoryMap).sort(
      (a, b) => (parseInt(categoryMap[a]) || 999) - (parseInt(categoryMap[b]) || 999)
    )];

    filterContainer.innerHTML = categories.map(cat => `
      <button class="filter-chip ${activeFilters.has(cat) ? 'active' : ''}" data-cat="${cat}">${cat}</button>
    `).join('');

    filterContainer.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.cat;
        // Toggle: clicking an active chip deselects it
        if (activeFilters.has(cat)) {
          activeFilters.delete(cat);
        } else {
          activeFilters.add(cat);
        }
        renderFilters();
        applyFilters();
      });
    });

    highlightScripts();
  }

  // ── Hex → "r,g,b" string for use in rgba() ────────────────────────────
  function hexToRgb(hex) {
    const h = (hex || '#ffffff').replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `${r},${g},${b}`;
  }

  function renderCard(item) {
    const isFeatured = item.category === 'Featured';
    const slug     = item.slug || toSlug(item.title);
    const safeLink = item.link.replace(/'/g, '%27');

    const actions = isFeatured
      ? `<button onclick="openFeatured('${slug}','${safeLink}')">Open</button>
         <button onclick="copyFeaturedOrLink(this,'${slug}','${safeLink}')">Copy</button>`
      : `<button onclick="window.open('${item.link}','_blank')">Open</button>
         <button onclick="copyLink(this,'${item.link}')">Copy</button>`;

    const featuredStyle = isFeatured
      ? ` style="--fc-rgb:${hexToRgb(item.color)};--fc-color:${item.color}"`
      : '';

    return `
      <div class="card${isFeatured ? ' card--featured' : ''}"${featuredStyle}>
        <div style="color:${item.color}; margin-bottom:12px;">
          <i data-lucide="${item.icon}" size="28"></i>
        </div>
        <h3>${item.title}</h3>
        <p class="tags">${item.tag}</p>
        <div class="toolkit-actions">
          ${actions}
        </div>
      </div>
    `;
  }

  function renderList(list) {
    if (!list.length) {
      gridContainer.innerHTML = '';
      emptyState.style.display = 'block';
      highlightScripts();
      return;
    }
    emptyState.style.display = 'none';

    const groups = list.reduce((acc, it) => {
      (acc[it.category] ??= []).push(it);
      return acc;
    }, {});

    const sortedCats = Object.keys(groups).sort(
      (a, b) => (parseInt(categoryMap[a]) || 999) - (parseInt(categoryMap[b]) || 999)
    );

    gridContainer.innerHTML = sortedCats.map(cat => `
      <div class="category-section">
        <h2 class="category-title">${cat}</h2>
        <div class="grid">${groups[cat].map(renderCard).join('')}</div>
      </div>
    `).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
    highlightScripts();
  }

  function applyFilters() {
    const val = searchInput.value.toLowerCase();

    const filtered = items.filter(it => {
      const matchesSearch = it.title.toLowerCase().includes(val) ||
                            it.category.toLowerCase().includes(val) ||
                            it.tag.toLowerCase().includes(val);
      // Empty set = no filter active = show all; otherwise must match a selected cat
      const matchesCategory = activeFilters.size === 0 || activeFilters.has(it.category);
      return matchesSearch && matchesCategory;
    }).sort((a, b) => a.id - b.id);

    renderList(filtered);
  }

  searchInput.addEventListener('input', applyFilters);
  loadAll();
}

// ── Back button: flag toolkit → home navigation ────────────────────────────
const backBtn = document.querySelector('.back-btn');
if (backBtn) {
  backBtn.addEventListener('click', () => {
    sessionStorage.setItem('walterck_toolkit_back', '1');
  });
}

// ── Hamburger nav ──────────────────────────────────────────────────────────
const hamburger = document.getElementById('hamburger');
const nav       = document.getElementById('nav');
if (hamburger && nav) {
  hamburger.addEventListener('click', () => nav.classList.toggle('show'));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('show')));
}


// ══════════════════════════════════════════════════════════════════════════
// ── Main Page Intro: Rocket Landing → Clip-path Reveal ────────────────────
// ══════════════════════════════════════════════════════════════════════════
(function () {
  if (!document.querySelector('.hero-main')) return;

  const mainEl = document.querySelector('main');

  // ── Early-exit: reduced motion ───────────────────────────────────────────
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    mainEl.style.visibility = 'visible';
    return;
  }

  // ── Skip if navigating back from toolkit ────────────────────────────────
  const BACK_KEY = 'walterck_toolkit_back';
  if (sessionStorage.getItem(BACK_KEY)) {
    sessionStorage.removeItem(BACK_KEY);
    window._walterck_intro_skipped = true;
    mainEl.style.visibility = 'visible';
    return;
  }

  // FIX 5: Removed `scrollY > 1` bail-out — we always scroll to top in
  // the <head> script so the animation should always run on a real page load.
  // Only skip for genuine back/forward cache navigation.
  const navType = performance.getEntriesByType('navigation')[0]?.type;
  if (navType === 'back_forward') {
    mainEl.style.visibility = 'visible';
    return;
  }

  // ── Run animation ─────────────────────────────────────────────────────────

  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  document.body.style.overflow = 'hidden';

  const overlay = document.createElement('div');
  overlay.id    = 'intro-overlay';
  const cvs     = document.createElement('canvas');
  cvs.id        = 'intro-canvas';
  cvs.width     = window.innerWidth;
  cvs.height    = window.innerHeight;
  const orb     = document.createElement('div');
  orb.id        = 'intro-orb';
  orb.textContent = '🍪';

  document.body.append(overlay, cvs);
  const ctx2d = cvs.getContext('2d');

  setTimeout(() => {
    document.fonts.ready.then(() => {
      requestAnimationFrame(() => {
        const pfp = document.querySelector('.profile-pfp');
        if (!pfp) { cleanup(); return; }

        const rect = pfp.getBoundingClientRect();
        const tx   = rect.left + rect.width  / 2;
        const ty   = rect.top  + rect.height / 2;

        const sx  = -18;
        const sy  = window.innerHeight * 0.5;
        const cpx = window.innerWidth  * 0.36;
        const cpy = ty - Math.min(105, window.innerHeight * 0.15);

        function quad(p0, p1, p2, t) { return (1-t)*(1-t)*p0 + 2*(1-t)*t*p1 + t*t*p2; }
        function easeInOut(t) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; }
        function lerp(a, b, t) { return a + (b-a)*t; }

        const ORB_MS   = isMobile ? 480 : 800;
        let   orbStart = null;
        let   prevX = sx, prevY = sy;

        let lastAngle = Math.atan2(ty - sy, tx - sx) * (180 / Math.PI) + 45;

        orb.style.left    = sx + 'px';
        orb.style.top     = sy + 'px';
        document.body.appendChild(orb);

        // FIX 4: trail enabled on all devices (removed isMobile guard)
        const trailPts = [];

        function tickOrb(ts) {
          if (!orbStart) orbStart = ts;
          orb.style.opacity = '1';
          const raw = Math.min((ts - orbStart) / ORB_MS, 1);
          const e   = easeInOut(raw);
          const x   = quad(sx, cpx, tx, e);
          const y   = quad(sy, cpy, ty, e);

          const dx_dir = x - prevX;
          const dy_dir = y - prevY;
          if (Math.abs(dx_dir) > 0.1 || Math.abs(dy_dir) > 0.1) {
            lastAngle = Math.atan2(dy_dir, dx_dir) * (180 / Math.PI) + 45;
          }

          // Trail — draw on all devices
          trailPts.push({ x: prevX, y: prevY });

          ctx2d.clearRect(0, 0, cvs.width, cvs.height);
          ctx2d.shadowColor = '#ff9030';
          ctx2d.shadowBlur  = 10;

          for (let i = 1; i < trailPts.length; i++) {
            const t  = i / trailPts.length;
            const p  = trailPts[i];
            const pp = trailPts[i - 1];
            ctx2d.beginPath();
            ctx2d.moveTo(pp.x, pp.y);
            ctx2d.lineTo(p.x, p.y);
            ctx2d.lineWidth   = lerp(0.5, 3.5, t);
            ctx2d.strokeStyle = `rgba(255,${Math.round(lerp(60, 220, t))},20,${lerp(0.05, 0.55, t)})`;
            ctx2d.stroke();
          }

          ctx2d.shadowBlur = 0;

          prevX = x; prevY = y;

          const scale = lerp(0.4, 1.5, e);
          orb.style.left      = x + 'px';
          orb.style.top       = y + 'px';
          orb.style.transform = `translate(-50%,-50%) scale(${scale})`;

          if (raw < 1) requestAnimationFrame(tickOrb);
          else         startReveal(tx, ty);
        }

        requestAnimationFrame(tickOrb);

        function startReveal(cx, cy) {
          document.body.style.overflow = '';

          mainEl.style.visibility = 'visible';
          mainEl.style.willChange = 'clip-path';
          mainEl.style.clipPath   = `circle(0px at ${cx}px ${cy}px)`;

          orb.style.transition = 'transform 0.15s ease-out, opacity 0.12s ease-out';
          orb.style.transform  = `translate(-50%,-50%) scale(5)`;
          orb.style.opacity    = '0';

          requestAnimationFrame(() => {
            overlay.remove();
            cvs.style.transition = 'opacity 0.12s';
            cvs.style.opacity    = '0';

            const revealDuration = isMobile ? '2s'  : '5s';
            const revealEase     = isMobile
              ? 'cubic-bezier(0.16, 1, 0.3, 1)'
              : 'cubic-bezier(0.22, 1, 0.36, 1)';

            requestAnimationFrame(() => {
              mainEl.style.transition = `clip-path ${revealDuration} ${revealEase}`;
              mainEl.style.clipPath   = `circle(200vmax at ${cx}px ${cy}px)`;

              const cleanupDelay = isMobile ? 2100 : 5200;
              setTimeout(cleanup, cleanupDelay);
            });
          });
        }

        function cleanup() {
          if (mainEl) {
            mainEl.style.transition = '';
            mainEl.style.clipPath   = '';
            mainEl.style.willChange = '';
          }
          [overlay, cvs, orb].forEach(el => el?.remove());
        }
      });
    });
  }, 100);
})();

// Global Strip Animation (ex main page)
(function () {
  if (document.querySelector('.hero-main')) return;

  const mainEl = document.querySelector('main');
  if (mainEl) mainEl.style.visibility = 'visible';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const intro = document.createElement('div');
  intro.id    = 'site-intro';
  document.body.appendChild(intro);

  const STRIPS    = 11;
  const DURATION  = 1;
  const MIN_DELAY = 0.3;
  const MAX_DELAY = 0.9;

  for (let i = 0; i < STRIPS; i++) {
    const strip     = document.createElement('div');
    strip.className = 'intro-strip';
    const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
    const pct   = 100 / STRIPS;
    strip.style.cssText = `
      top: calc(${i * pct}% - 0.5px);
      height: calc(${pct}% + 1px);
      animation: stripWipe ${DURATION}s cubic-bezier(0.16, 1, 0.3, 1) forwards ${delay.toFixed(3)}s;
    `;
    intro.appendChild(strip);
  }

  const totalDone = (MAX_DELAY + DURATION + 0.15) * 1000;
  setTimeout(() => { intro.remove(); }, totalDone);
})();


// ══════════════════════════════════════════════════════════════════════════
// ── Featured Page: Auto-pull shortcut link + icon from toolkit.json ────────
// ══════════════════════════════════════════════════════════════════════════
(function () {
  if (!document.querySelector('.fp-hero')) return;

  const slug = window.location.pathname.split('/').filter(Boolean).pop();
  if (!slug) return;

  fetch('/toolkit/toolkit.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(raw => {
      const item = raw.find(it => {
        if (!it.title) return false;
        return it.slug === slug;
      }) || raw.find(it => {
        if (!it.title) return false;
        return (it.slug || toSlug(it.title)) === slug;
      });
      if (!item) return;

      if (item.link) {
        document.querySelectorAll('.fp-shortcut-link').forEach(el => {
          el.href = item.link;
        });
      }

      if (item.icon) {
        const iconEl = document.querySelector('.fp-hero-icon [data-lucide]');
        if (iconEl) {
          iconEl.setAttribute('data-lucide', item.icon);
          if (typeof lucide !== 'undefined') lucide.createIcons();
        }
      }
    })
    .catch(() => {});
})();


// ══════════════════════════════════════════════════════════════════════════
// ── Homepage "New" Banner ─────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════
(function () {
  if (!document.querySelector('.hero-main')) return;

  fetch('/toolkit/toolkit.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(raw => {
      const newItem = raw.find(it => it.title && it.new === true);
      if (!newItem) return;

      const banner    = document.createElement('div');
      banner.id       = 'new-banner';
      banner.tabIndex = 0;
      banner.setAttribute('role', 'button');
      banner.setAttribute('aria-label', `New shortcut: ${newItem.title}`);

      const color = newItem.color || '#6b8cff';
      banner.style.setProperty('--b-color', color);

      const hexToRgba = (hex, a) => {
        const r = parseInt(hex.slice(1,3),16);
        const g = parseInt(hex.slice(3,5),16);
        const b = parseInt(hex.slice(5,7),16);
        return `rgba(${r},${g},${b},${a})`;
      };
      banner.style.setProperty('--b-glow', hexToRgba(color.padEnd(7,'0'), 0.18));

      const cleanTitle = newItem.title.replace(/[➶→↗▶►]/g, '').trim();
      const slug = newItem.slug || toSlug(newItem.title);

      banner.innerHTML = `
        <div class="banner-inner">
          <div class="banner-icon-wrap">
            <i data-lucide="${newItem.icon}"></i>
          </div>
          <div class="banner-text">
            <span class="banner-eyebrow">New</span>
            <span class="banner-title">${cleanTitle}</span>
          </div>
        </div>
      `;

      document.body.appendChild(banner);

      if (typeof lucide !== 'undefined') lucide.createIcons();

      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      const delay    = window._walterck_intro_skipped
        ? 150
        : (isMobile ? 450 : 900);

      setTimeout(() => banner.classList.add('visible'), delay);

      const navigate = async () => {
        const exists = await featuredPageExists(slug);
        window.location.href = exists ? `/toolkit/${slug}/` : '/toolkit/';
      };

      banner.addEventListener('click', navigate);
      banner.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(); }
      });
    })
    .catch(() => {});
})();

// 404 Page
(function () {
  const container = document.getElementById('particles');
  if (!container) return;

  const count = 18;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size    = Math.random() * 3 + 1;
    const opacity = Math.random() * 0.25 + 0.05;
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      width: ${size}px;
      height: ${size}px;
      --p-opacity: ${opacity};
      animation-duration: ${Math.random() * 14 + 10}s;
      animation-delay: ${Math.random() * -20}s;
    `;
    container.appendChild(p);
  }
})();
