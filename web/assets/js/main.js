/* ============================================
   Unique Properties — Shared JS
   ============================================ */

// ----- Config (swap these per deployment) -----
const WHATSAPP_NUMBER = '923001234567'; // placeholder
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

// ----- Property filtering (properties.html) -----
const filterForm = document.querySelector('[data-filter-form]');
if (filterForm) {
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

// ----- Admin sidebar nav (admin.html) -----
const adminPanels = document.querySelectorAll('[data-admin-panel]');
const adminLinks = document.querySelectorAll('[data-admin-link]');
if (adminLinks.length) {
  adminLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = link.dataset.adminLink;
      adminLinks.forEach(l => l.classList.toggle('active', l === link));
      adminPanels.forEach(p => p.style.display = p.dataset.adminPanel === target ? '' : 'none');
    });
  });
}

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
