/* ============================================
   Unique Properties — Shared JS
   ============================================ */

// ----- Config (swap these per deployment) -----
// Admin → Settings can override this; falls back to the default below.
const STORED_SETTINGS = (() => {
  try { return JSON.parse(localStorage.getItem('up_settings_v3')) || {}; }
  catch { return {}; }
})();
const WHATSAPP_NUMBER = STORED_SETTINGS.whatsapp || '928499644'; // default WhatsApp number
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi Unique Properties, I'm interested in a property in Park View Lahore.")}`;

// ----- Navbar scroll shadow -----
const navbar = document.querySelector('.navbar');
if (navbar) {
  const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ----- Mobile menu toggle -----
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
    })
  );
}

// ----- WhatsApp links -----
document.querySelectorAll('[data-whatsapp]').forEach(el => {
  el.setAttribute('href', WHATSAPP_URL);
  el.setAttribute('target', '_blank');
  el.setAttribute('rel', 'noopener');
});

// ----- Toast -----
function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.innerHTML = `<i class="fa-solid fa-circle-check"></i><span>${msg}</span>`;
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => t.classList.remove('show'), 3200);
}

// ----- Generic form handler (mocked) -----
document.querySelectorAll('form[data-mock]').forEach(form => {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const successMsg = form.dataset.success || 'Submitted successfully — we will get back to you shortly.';
    form.reset();
    showToast(successMsg);
  });
});

// ============================================================
//  Listings rendering
//  Properties come from the backend API (/api/properties).
//  Blogs are still client-side (localStorage) — see admin Settings.
// ============================================================
const FEED_PLACEHOLDER = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80';
const _esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const _priceWords = n => {
  n = Number(n) || 0;
  if (n >= 1e7) { const v = n / 1e7; return (Number.isInteger(v) ? v : +v.toFixed(2)) + ' Crore'; }
  if (n >= 1e5) { const v = n / 1e5; return (Number.isInteger(v) ? v : +v.toFixed(2)) + ' Lakh'; }
  return 'PKR ' + n.toLocaleString();
};
const PROP_BLOCKS = ['Rose', 'Tulip', 'Jasmine', 'Iris', 'Boulevard'];

function propertyCardHTML(p) {
  const type = String(p.type || '').toLowerCase();
  const block = PROP_BLOCKS.find(b => (p.location || '').toLowerCase().includes(b.toLowerCase())) || '';
  const cat = type === 'commercial' ? 'commercial' : 'residential';
  // Badge: sold/pending show the status; otherwise the purpose ("For Sale" / "For Rent") or "New".
  const badge = (p.status && p.status !== 'Active') ? p.status : (p.purpose || 'New');
  const tel = '+' + WHATSAPP_NUMBER;
  const size = (p.area && p.areaUnit) ? `${p.area}-${String(p.areaUnit).toLowerCase().replace(/\s+/g, '')}` : '';
  const detailsUrl = 'property-details.html?id=' + encodeURIComponent(p.id || '');

  // Build the meta row from whatever details exist; fall back to type so it's never empty.
  const meta = [];
  if (p.bedrooms) meta.push(`<span><i class="fa-solid fa-bed"></i> ${_esc(p.bedrooms)} Bed</span>`);
  if (p.bathrooms) meta.push(`<span><i class="fa-solid fa-bath"></i> ${_esc(p.bathrooms)} Bath</span>`);
  if (p.area) meta.push(`<span><i class="fa-solid fa-vector-square"></i> ${_esc(p.area)} ${_esc(p.areaUnit || '')}</span>`);
  if (!meta.length) meta.push(`<span><i class="fa-solid fa-tag"></i> ${_esc(p.type || 'Property')}</span>`);

  return `<article class="property-card" data-property data-title="${_esc(p.title)}" data-block="${_esc(block)}" data-type="${_esc(type)}" data-size="${_esc(size)}" data-category="${cat}" data-price="${Number(p.price) || 0}" data-tags="">
      <div class="property-img-wrap"><span class="property-badge">${_esc(badge)}</span>
        <img src="${_esc(p.image) || FEED_PLACEHOLDER}" alt="${_esc(p.title)}" loading="lazy" onerror="this.src='${FEED_PLACEHOLDER}'" /></div>
      <div class="property-body">
        <div class="property-price">${_esc(_priceWords(p.price))}</div>
        <h3 class="property-title">${_esc(p.title)}</h3>
        <div class="property-location"><i class="fa-solid fa-location-dot"></i> ${_esc(p.location)}</div>
        <div class="property-meta">${meta.join('')}</div>
        <div class="property-actions">
          <a href="${detailsUrl}" class="btn btn-navy"><i class="fa-solid fa-arrow-right"></i> View Details</a>
          <a href="tel:${_esc(tel)}" class="btn btn-gold"><i class="fa-solid fa-phone"></i> Call</a>
        </div>
      </div></article>`;
}

// ----- Blog feed (backend API /api/blogs; demo featured posts are hardcoded on blog.html) -----
(function injectBlogs() {
  const blogFeeds = document.querySelectorAll('[data-blog-feed]');
  if (!blogFeeds.length) return;
  const blogCardHTML = b => {
    const url = 'post.html?id=' + encodeURIComponent(b.id);
    return `<article class="blog-card">
        <a href="${url}" class="img-wrap"><img src="${_esc(b.cover) || FEED_PLACEHOLDER}" alt="${_esc(b.title)}" loading="lazy" onerror="this.src='${FEED_PLACEHOLDER}'" /></a>
        <div class="body">
          <div class="meta"><span class="cat">${_esc(b.category || 'News')}</span><span><i class="fa-regular fa-calendar"></i> ${_esc(b.date || '')}</span></div>
          <h3><a href="${url}">${_esc(b.title)}</a></h3>
          <p class="excerpt">${_esc(b.excerpt || '')}</p>
          <a href="${url}" class="read-more">Read article <i class="fa-solid fa-arrow-right"></i></a>
        </div></article>`;
  };
  const blogEmpty = document.querySelector('[data-blog-empty]');
  const showBlogEmpty = () => { if (blogEmpty) blogEmpty.style.display = ''; };
  fetch('/api/blogs')
    .then(r => (r.ok ? r.json() : []))
    .then(list => {
      if (!Array.isArray(list) || !list.length) { showBlogEmpty(); return; }
      blogFeeds.forEach(feed => feed.insertAdjacentHTML('afterbegin', list.map(blogCardHTML).join('')));
    })
    .catch(showBlogEmpty);
})();

// ----- Property filtering (properties.html) — enabled after cards are rendered -----
function setupPropertyFilter() {
  const filterForm = document.querySelector('[data-filter-form]');
  if (!filterForm) return;
  const cards = Array.from(document.querySelectorAll('[data-property]'));
  const chips = Array.from(document.querySelectorAll('[data-quick-chips] .chip'));
  const countEl = document.querySelector('[data-count]');
  let activeTag = '';

  // Normalize a string for smarter matching ("3 marla" → "3-marla", "5marla" → "5-marla")
  const normalize = s => s.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(\d+)\s*marla/g, '$1-marla')
    .replace(/(\d+)\s*kanal/g, '$1-kanal');

  const apply = () => {
    const qRaw = (filterForm.querySelector('[name="q"]')?.value || '').trim();
    const q = normalize(qRaw);
    const price = filterForm.querySelector('[name="price"]')?.value || '';
    const block = filterForm.querySelector('[name="block"]')?.value || '';
    const type = filterForm.querySelector('[name="type"]')?.value || '';
    const size = filterForm.querySelector('[name="size"]')?.value || '';
    const category = filterForm.querySelector('[name="category"]')?.value || '';

    let visible = 0;
    cards.forEach(card => {
      const haystack = normalize([
        card.dataset.title,
        card.dataset.block,
        card.dataset.type,
        card.dataset.size,
        card.dataset.category,
        card.dataset.tags,
      ].filter(Boolean).join(' '));
      const cBlock = card.dataset.block || '';
      const cType = card.dataset.type || '';
      const cSize = card.dataset.size || '';
      const cCategory = card.dataset.category || '';
      const cTags = (card.dataset.tags || '').split(',').map(t => t.trim()).filter(Boolean);
      const cPrice = parseInt(card.dataset.price || '0', 10);

      let inPrice = true;
      if (price) {
        const [min, max] = price.split('-').map(s => parseInt(s, 10));
        if (!isNaN(min) && cPrice < min) inPrice = false;
        if (!isNaN(max) && cPrice > max) inPrice = false;
      }

      // Smart search: every whitespace-separated token must appear somewhere in the haystack
      let searchOk = true;
      if (q) {
        searchOk = q.split(' ').every(tok => tok && haystack.includes(tok));
      }

      const ok =
        searchOk &&
        (!block || cBlock === block) &&
        (!type || cType === type) &&
        (!size || cSize === size) &&
        (!category || cCategory === category) &&
        (!activeTag || cTags.includes(activeTag)) &&
        inPrice;

      card.style.display = ok ? '' : 'none';
      if (ok) visible++;
    });

    const emptyState = document.querySelector('[data-empty]');
    if (emptyState) emptyState.style.display = visible === 0 ? 'block' : 'none';
    if (countEl) {
      countEl.innerHTML = visible === cards.length
        ? `Showing <strong>${visible}</strong> propert${visible === 1 ? 'y' : 'ies'}`
        : `Showing <strong>${visible}</strong> of <strong>${cards.length}</strong> propert${cards.length === 1 ? 'y' : 'ies'}`;
    }
  };

  filterForm.addEventListener('input', apply);
  filterForm.addEventListener('change', apply);
  filterForm.addEventListener('submit', e => { e.preventDefault(); apply(); });
  const resetBtn = filterForm.querySelector('[data-reset]');
  if (resetBtn) resetBtn.addEventListener('click', () => {
    filterForm.reset();
    activeTag = '';
    chips.forEach(c => c.classList.remove('active'));
    apply();
  });

  // Quick filter chips (single-select, toggle)
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const tag = chip.dataset.quickTag || '';
      if (activeTag === tag) {
        activeTag = '';
        chip.classList.remove('active');
      } else {
        activeTag = tag;
        chips.forEach(c => c.classList.toggle('active', c === chip));
      }
      apply();
    });
  });

  // Populate chip count badges (total listings carrying each tag)
  document.querySelectorAll('[data-tag-count]').forEach(el => {
    const tag = el.dataset.tagCount;
    const n = cards.filter(c => (c.dataset.tags || '').split(',').map(t => t.trim()).includes(tag)).length;
    el.textContent = n;
    if (n === 0) el.style.display = 'none';
  });

  apply();
}

// ----- Load properties from the backend API, render into feeds, then filter -----
(function loadProperties() {
  const propFeeds = document.querySelectorAll('[data-property-feed]');
  if (!propFeeds.length) { setupPropertyFilter(); return; }
  fetch('/api/properties')
    .then(r => (r.ok ? r.json() : []))
    .then(list => {
      if (!Array.isArray(list)) list = [];
      propFeeds.forEach(feed => {
        const limit = parseInt(feed.dataset.feedLimit || '0', 10);
        const items = limit ? list.slice(0, limit) : list;
        if (items.length) feed.insertAdjacentHTML('beforeend', items.map(propertyCardHTML).join(''));
      });
    })
    .catch(() => { /* backend offline — the empty state will show */ })
    .finally(() => setupPropertyFilter());
})();

// ----- Admin panel nav is handled in admin.js -----

// ----- AOS init (if loaded) -----
if (window.AOS) {
  AOS.init({ duration: 700, easing: 'ease-out-cubic', once: true, offset: 60 });
}

// ----- Swiper init (property details) -----
if (window.Swiper && document.querySelector('.gallery-swiper')) {
  new Swiper('.gallery-swiper', {
    loop: true,
    autoplay: { delay: 5000, disableOnInteraction: false },
    pagination: { el: '.swiper-pagination', clickable: true },
    navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
  });
}

// ----- Year in footer -----
const yearEl = document.querySelector('[data-year]');
if (yearEl) yearEl.textContent = new Date().getFullYear();
