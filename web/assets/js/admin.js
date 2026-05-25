/* ============================================
   Unique Properties — Admin v3
   Properties: backend API (/api/properties)
   Blogs + Settings: client-side localStorage
   ============================================ */
(function () {
  const shell = document.querySelector('.admin-shell');
  if (!shell) return;

  // ---------- Backend API (properties) ----------
  const API = '/api/properties';
  let propsCache = [];
  async function apiList() {
    const r = await fetch(API);
    if (!r.ok) throw new Error('list failed');
    return r.json();
  }
  async function apiCreate(data) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) throw new Error('create failed');
    return r.json();
  }
  async function apiUpdate(id, data) {
    const r = await fetch(`${API}/${encodeURIComponent(id)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) throw new Error('update failed');
    return r.json();
  }
  async function apiDelete(id) {
    const r = await fetch(`${API}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!r.ok) throw new Error('delete failed');
    return r.json();
  }

  // ---------- localStorage (blogs + settings) ----------
  const KEYS = { blogs: 'up_blogs', settings: 'up_settings' };
  const LS = {
    get(key, fallback) {
      try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
      catch { return fallback; }
    },
    set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
  };
  const SEED_BLOGS = [
    { id: 'b1', title: 'Best Lahore Properties to Buy in 2026 — From 25 Lakh to Luxury', category: 'Buying Guide', date: 'Apr 28, 2026', cover: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=900&q=80', excerpt: "A complete buyer's guide to Lahore properties this year.", content: '' },
    { id: 'b2', title: "How to Buy Property in Lahore Safely — 7-Step Buyer's Checklist", category: "Buyer's Checklist", date: 'May 5, 2026', cover: 'https://images.unsplash.com/photo-1554224155-1696413565d3?auto=format&fit=crop&w=900&q=80', excerpt: 'Verify documents, avoid scams, close with confidence.', content: '' },
    { id: 'b3', title: 'Lahore Real Estate Trends 2026 — Where Prices Are Heading', category: 'Market Insights', date: 'May 15, 2026', cover: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=900&q=80', excerpt: 'Plot prices, rental yields, and the locations driving growth.', content: '' },
  ];
  const DEFAULT_SETTINGS = { whatsapp: '923001234567', phone: '+92 300 1234567', email: 'info@uniqueproperties.pk' };
  const INQUIRIES = [
    { name: 'Ali Raza', property: 'Modern 1 Kanal Villa', msg: "Assalam o Alaikum, I'm interested in the 1 Kanal villa. Is it still available for viewing this weekend?", initials: 'AR', color: '#C9A227' },
    { name: 'Fatima Hassan', property: 'Sky Garden Penthouse', msg: 'Hello, could you share the payment plan and possession timeline for the penthouse? Investing from the UK.', initials: 'FH', color: '#10B981' },
    { name: 'Bilal Ahmed', property: 'Corner 5 Marla Plot', msg: 'Please confirm the demand for the corner plot in Tulip block and whether the price is negotiable.', initials: 'BA', color: '#1c2a45' },
    { name: 'Sara Khan', property: 'Elegant 10 Marla Home', msg: 'Looking to sell my current home and upgrade. Can we schedule a call this week?', initials: 'SK', color: '#6B7280' },
  ];

  if (LS.get(KEYS.blogs, null) === null) LS.set(KEYS.blogs, SEED_BLOGS);
  if (LS.get(KEYS.settings, null) === null) LS.set(KEYS.settings, DEFAULT_SETTINGS);
  const getBlogs = () => LS.get(KEYS.blogs, []);

  // ---------- Helpers ----------
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PLACEHOLDER = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80';
  function fmtPrice(n) {
    n = Number(n) || 0;
    if (n >= 1e7) return 'PKR ' + (n / 1e7).toFixed(n % 1e7 ? 1 : 0).replace(/\.0$/, '') + ' Cr';
    if (n >= 1e5) return 'PKR ' + (n / 1e5).toFixed(n % 1e5 ? 1 : 0).replace(/\.0$/, '') + ' Lakh';
    return 'PKR ' + n.toLocaleString('en-PK');
  }
  const toast = msg => (typeof showToast === 'function') ? showToast(msg) : null;
  const waNumber = () => (LS.get(KEYS.settings, DEFAULT_SETTINGS).whatsapp || '923001234567').replace(/\D/g, '');
  const waUrl = name => `https://wa.me/${waNumber()}?text=${encodeURIComponent(`Hi ${name}, thanks for contacting Unique Properties.`)}`;

  // ---------- Panels / navigation ----------
  const panels = document.querySelectorAll('[data-admin-panel]');
  const links = document.querySelectorAll('[data-admin-link]');
  const titleEl = document.querySelector('[data-page-title]');
  const TITLES = {
    dashboard: 'Dashboard', properties: 'Properties', add: 'Add Property', blogs: 'Blog Posts',
    'add-blog': 'Add Blog', inquiries: 'Inquiries', analytics: 'Analytics', settings: 'Settings',
  };
  function setPanel(target, keepForm) {
    if (!TITLES[target]) target = 'dashboard';
    panels.forEach(p => { p.style.display = p.dataset.adminPanel === target ? '' : 'none'; });
    links.forEach(l => l.classList.toggle('active', l.dataset.adminLink === target));
    if (titleEl) titleEl.textContent = TITLES[target];
    if (!keepForm) {
      if (target !== 'add') resetPropForm();
      if (target !== 'add-blog') resetBlogForm();
    }
    closeDrawer();
    document.querySelectorAll('.actions-cell.open').forEach(c => c.classList.remove('open'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const showPanel = t => setPanel(t, false);
  links.forEach(l => l.addEventListener('click', e => { e.preventDefault(); showPanel(l.dataset.adminLink); }));

  // ---------- Drawer (mobile) ----------
  const drawer = document.querySelector('[data-drawer]');
  const overlay = document.querySelector('[data-overlay]');
  function openDrawer() { drawer && drawer.classList.add('open'); overlay && overlay.classList.add('show'); }
  function closeDrawer() { drawer && drawer.classList.remove('open'); overlay && overlay.classList.remove('show'); }
  document.querySelectorAll('[data-drawer-open]').forEach(b => b.addEventListener('click', openDrawer));
  document.querySelectorAll('[data-drawer-close]').forEach(b => b.addEventListener('click', closeDrawer));
  overlay && overlay.addEventListener('click', closeDrawer);

  document.querySelectorAll('[data-add-property]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); resetPropForm(); showPanel('add'); }));
  document.querySelectorAll('[data-add-blog]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); resetBlogForm(); showPanel('add-blog'); }));

  // ---------- Actions dropdown ----------
  document.addEventListener('click', e => {
    const toggle = e.target.closest('[data-menu-toggle]');
    const open = document.querySelectorAll('.actions-cell.open');
    if (toggle) {
      const cell = toggle.closest('.actions-cell');
      const wasOpen = cell.classList.contains('open');
      open.forEach(c => c.classList.remove('open'));
      if (!wasOpen) cell.classList.add('open');
    } else {
      open.forEach(c => c.classList.remove('open'));
    }
  });

  // ---------- Render: properties table (from API cache) ----------
  function statusClass(s) { return ({ active: 'active', pending: 'pending', sold: 'sold' })[String(s || 'Active').toLowerCase()] || 'active'; }
  function propRow(p) {
    return `<tr>
      <td><div class="cell-prop">
        <img src="${esc(p.image) || PLACEHOLDER}" alt="" onerror="this.src='${PLACEHOLDER}'" />
        <div><div class="t">${esc(p.title)}</div><div class="s"><i class="fa-solid fa-tag"></i> ${esc(p.type || 'Property')}</div></div>
      </div></td>
      <td class="cell-price">${esc(fmtPrice(p.price))}</td>
      <td>${esc(p.location)}</td>
      <td><span class="badge ${statusClass(p.status)}">${esc(p.status || 'Active')}</span></td>
      <td class="actions-cell">
        <button class="menu-btn-dots" data-menu-toggle aria-label="Actions"><i class="fa-solid fa-ellipsis"></i></button>
        <div class="row-menu">
          <button data-edit-prop="${esc(p.id)}"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="danger" data-del-prop="${esc(p.id)}"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>
      </td>
    </tr>`;
  }
  function renderProps() {
    document.querySelectorAll('[data-properties-list]').forEach(tb => {
      const limit = parseInt(tb.dataset.limit || '0', 10);
      const list = limit ? propsCache.slice(0, limit) : propsCache;
      tb.innerHTML = list.length
        ? list.map(propRow).join('')
        : `<tr><td colspan="5"><div class="list-empty">No properties yet. Click “Add Property” to create one.</div></td></tr>`;
    });
  }
  async function loadProps() {
    try {
      propsCache = await apiList();
      if (!Array.isArray(propsCache)) propsCache = [];
    } catch (err) {
      propsCache = [];
      document.querySelectorAll('[data-properties-list]').forEach(tb => {
        tb.innerHTML = `<tr><td colspan="5"><div class="list-empty">Could not reach the server. Is <code>server.py</code> running?</div></td></tr>`;
      });
    }
    renderProps();
    renderStats();
  }
  document.querySelectorAll('[data-properties-list]').forEach(tb => tb.addEventListener('click', async e => {
    const edit = e.target.closest('[data-edit-prop]');
    const del = e.target.closest('[data-del-prop]');
    if (edit) editProp(edit.dataset.editProp);
    else if (del && confirm('Delete this property?')) {
      try { await apiDelete(del.dataset.delProp); await loadProps(); toast('Property deleted.'); }
      catch { toast('Delete failed — is the server running?'); }
    }
  }));

  // ---------- Render: blogs table (localStorage) ----------
  function blogRow(b) {
    return `<tr>
      <td><div class="cell-prop">
        <img src="${esc(b.cover) || PLACEHOLDER}" alt="" onerror="this.src='${PLACEHOLDER}'" />
        <div><div class="t">${esc(b.title)}</div></div>
      </div></td>
      <td><span class="cat-chip">${esc(b.category)}</span></td>
      <td style="white-space:nowrap;color:var(--muted2);">${esc(b.date)}</td>
      <td class="actions-cell">
        <button class="menu-btn-dots" data-menu-toggle aria-label="Actions"><i class="fa-solid fa-ellipsis"></i></button>
        <div class="row-menu">
          <button data-edit-blog="${esc(b.id)}"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="danger" data-del-blog="${esc(b.id)}"><i class="fa-solid fa-trash"></i> Delete</button>
        </div>
      </td>
    </tr>`;
  }
  function renderBlogs() {
    const items = getBlogs();
    document.querySelectorAll('[data-blogs-list]').forEach(tb => {
      tb.innerHTML = items.length
        ? items.map(blogRow).join('')
        : `<tr><td colspan="4"><div class="list-empty">No blog posts yet. Click “Add Blog” to write one.</div></td></tr>`;
    });
  }
  document.querySelectorAll('[data-blogs-list]').forEach(tb => tb.addEventListener('click', e => {
    const edit = e.target.closest('[data-edit-blog]');
    const del = e.target.closest('[data-del-blog]');
    if (edit) editBlog(edit.dataset.editBlog);
    else if (del && confirm('Delete this blog post?')) {
      LS.set(KEYS.blogs, getBlogs().filter(b => b.id !== del.dataset.delBlog));
      renderBlogs(); renderStats(); toast('Blog post deleted.');
    }
  }));

  // ---------- Render: inquiries ----------
  function inqCard(q) {
    return `<div class="inq-card">
      <div class="inq-avatar" style="background:linear-gradient(135deg,${q.color},rgba(17,24,39,0.55));">${esc(q.initials)}</div>
      <div class="inq-main">
        <div class="nm">${esc(q.name)}</div>
        <div class="pr">Interested in: ${esc(q.property)}</div>
        <div class="msg">${esc(q.msg)}</div>
        <a class="inq-contact" href="${waUrl(q.name)}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Contact</a>
      </div>
    </div>`;
  }
  function renderInquiries() {
    const dash = document.querySelector('[data-inquiries]');
    const full = document.querySelector('[data-inquiries-full]');
    if (dash) dash.innerHTML = INQUIRIES.slice(0, 3).map(inqCard).join('');
    if (full) full.innerHTML = INQUIRIES.map(inqCard).join('');
  }

  // ---------- Stats ----------
  function renderStats() {
    const ps = document.querySelector('[data-stat="properties"]');
    const bs = document.querySelector('[data-stat="blogs"]');
    if (ps) ps.textContent = propsCache.length;
    if (bs) bs.textContent = getBlogs().length;
  }

  // ---------- Property form (API) ----------
  const propForm = document.querySelector('[data-property-form]');
  const propFormTitle = document.querySelector('[data-prop-form-title]');
  const propSubmitLabel = document.querySelector('[data-prop-submit-label]');
  function resetPropForm() {
    if (!propForm) return;
    propForm.reset(); propForm.elements.id.value = '';
    if (propFormTitle) propFormTitle.textContent = 'Add New Property';
    if (propSubmitLabel) propSubmitLabel.textContent = 'Publish';
  }
  function editProp(id) {
    const p = propsCache.find(x => x.id === id);
    if (!p || !propForm) return;
    propForm.elements.id.value = p.id;
    propForm.elements.title.value = p.title || '';
    propForm.elements.price.value = p.price || '';
    propForm.elements.location.value = p.location || '';
    propForm.elements.type.value = p.type || 'Villa';
    propForm.elements.status.value = p.status || 'Active';
    propForm.elements.image.value = p.image || '';
    propForm.elements.description.value = p.description || '';
    if (propFormTitle) propFormTitle.textContent = 'Edit Property';
    if (propSubmitLabel) propSubmitLabel.textContent = 'Save Changes';
    setPanel('add', true);
  }
  propForm && propForm.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      title: propForm.elements.title.value.trim(),
      price: Number(propForm.elements.price.value) || 0,
      location: propForm.elements.location.value.trim(),
      type: propForm.elements.type.value,
      status: propForm.elements.status.value,
      image: propForm.elements.image.value.trim(),
      description: propForm.elements.description.value.trim(),
    };
    const id = propForm.elements.id.value;
    try {
      if (id) { await apiUpdate(id, data); toast('Property updated.'); }
      else { await apiCreate(data); toast('Property added successfully.'); }
      await loadProps();
      resetPropForm();
      showPanel('properties');
    } catch {
      toast('Save failed — is the server running?');
    }
  });

  // ---------- Blog form (localStorage) ----------
  const blogForm = document.querySelector('[data-blog-form]');
  const blogFormTitle = document.querySelector('[data-blog-form-title]');
  const blogSubmitLabel = document.querySelector('[data-blog-submit-label]');
  function resetBlogForm() {
    if (!blogForm) return;
    blogForm.reset(); blogForm.elements.id.value = '';
    if (blogFormTitle) blogFormTitle.textContent = 'Add Blog Post';
    if (blogSubmitLabel) blogSubmitLabel.textContent = 'Publish Post';
  }
  function editBlog(id) {
    const b = getBlogs().find(x => x.id === id);
    if (!b || !blogForm) return;
    blogForm.elements.id.value = b.id;
    blogForm.elements.title.value = b.title || '';
    blogForm.elements.category.value = b.category || 'Buying Guide';
    blogForm.elements.cover.value = b.cover || '';
    blogForm.elements.excerpt.value = b.excerpt || '';
    blogForm.elements.content.value = b.content || '';
    if (blogFormTitle) blogFormTitle.textContent = 'Edit Blog Post';
    if (blogSubmitLabel) blogSubmitLabel.textContent = 'Save Changes';
    setPanel('add-blog', true);
  }
  blogForm && blogForm.addEventListener('submit', e => {
    e.preventDefault();
    const data = {
      title: blogForm.elements.title.value.trim(),
      category: blogForm.elements.category.value,
      cover: blogForm.elements.cover.value.trim(),
      excerpt: blogForm.elements.excerpt.value.trim(),
      content: blogForm.elements.content.value.trim(),
    };
    const id = blogForm.elements.id.value;
    const items = getBlogs();
    if (id) {
      const i = items.findIndex(x => x.id === id);
      if (i > -1) items[i] = { ...items[i], ...data };
      toast('Blog post updated.');
    } else {
      const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      items.unshift({ id: uid(), date, ...data }); toast('Blog post published.');
    }
    LS.set(KEYS.blogs, items);
    renderBlogs(); renderStats(); resetBlogForm(); showPanel('blogs');
  });

  // ---------- Settings (localStorage) ----------
  const settingsForm = document.querySelector('[data-settings-form]');
  function loadSettings() {
    if (!settingsForm) return;
    const s = LS.get(KEYS.settings, DEFAULT_SETTINGS);
    settingsForm.elements.whatsapp.value = s.whatsapp || '';
    settingsForm.elements.phone.value = s.phone || '';
    settingsForm.elements.email.value = s.email || '';
  }
  settingsForm && settingsForm.addEventListener('submit', e => {
    e.preventDefault();
    LS.set(KEYS.settings, {
      whatsapp: settingsForm.elements.whatsapp.value.replace(/\D/g, ''),
      phone: settingsForm.elements.phone.value.trim(),
      email: settingsForm.elements.email.value.trim(),
    });
    renderInquiries();
    toast('Settings saved.');
  });

  // ---------- Search (filters property tables) ----------
  const searchInput = document.querySelector('[data-admin-search]');
  searchInput && searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    document.querySelectorAll('[data-properties-list] tr').forEach(tr => {
      if (tr.querySelector('.list-empty')) return;
      tr.style.display = !q || tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });

  // ---------- Init ----------
  resetPropForm();
  resetBlogForm();
  renderBlogs();
  renderInquiries();
  loadSettings();
  loadProps();            // fetch properties from the backend

  const params = new URLSearchParams(location.search);
  showPanel(params.get('panel') || 'dashboard');
  if (params.get('drawer') === '1') openDrawer();
})();
