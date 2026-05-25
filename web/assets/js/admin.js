/* ============================================
   Unique Properties — Admin v3
   Properties + Blogs: backend API (/api/properties, /api/blogs)
   Settings: client-side localStorage
   ============================================ */
(function () {
  const shell = document.querySelector('.admin-shell');
  if (!shell) return;

  // ---------- Admin auth (login gate) ----------
  const TOKEN_KEY = 'up_admin_token';
  let authToken = sessionStorage.getItem(TOKEN_KEY) || '';
  const loginEl = document.querySelector('[data-login]');
  const loginForm = document.querySelector('[data-login-form]');
  const loginError = document.querySelector('[data-login-error]');
  function showLogin() { if (loginEl) loginEl.classList.remove('hidden'); }
  function hideLogin() { if (loginEl) loginEl.classList.add('hidden'); }
  function authHeaders(json) {
    const h = {};
    if (json) h['Content-Type'] = 'application/json';
    if (authToken) h.Authorization = 'Bearer ' + authToken;
    return h;
  }
  function clearAuth() { authToken = ''; sessionStorage.removeItem(TOKEN_KEY); }
  // If the server rejects our token, drop it and show the login again.
  function require200(r) {
    if (r.status === 401) {
      clearAuth(); showLogin();
      if (typeof showToast === 'function') showToast('Session expired — please sign in again.');
      throw new Error('unauthorized');
    }
    return r;
  }
  if (loginForm) loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    if (loginError) loginError.textContent = '';
    try {
      const r = await fetch('/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginForm.elements.password.value }),
      });
      if (!r.ok) { if (loginError) loginError.textContent = 'Incorrect password. Please try again.'; return; }
      authToken = (await r.json()).token || '';
      sessionStorage.setItem(TOKEN_KEY, authToken);
      loginForm.reset(); hideLogin();
      loadProps(); loadBlogs();   // refresh data after signing in
    } catch { if (loginError) loginError.textContent = 'Could not reach the server. Is it running?'; }
  });
  const logoutLink = document.querySelector('.adm-logout');
  if (logoutLink) logoutLink.addEventListener('click', () => {
    fetch('/api/logout', { method: 'POST', headers: authHeaders() }).catch(() => {});
    clearAuth();   // the link then navigates to its href (index.html)
  });
  // Gate the panel: locked until a valid session exists.
  if (authToken) hideLogin(); else showLogin();

  // ---------- Backend API (properties) ----------
  const API = '/api/properties';
  let propsCache = [];
  async function apiList() {
    const r = await fetch(API);
    if (!r.ok) throw new Error('list failed');
    return r.json();
  }
  async function apiCreate(data) {
    const r = require200(await fetch(API, { method: 'POST', headers: authHeaders(true), body: JSON.stringify(data) }));
    if (!r.ok) throw new Error('create failed');
    return r.json();
  }
  async function apiUpdate(id, data) {
    const r = require200(await fetch(`${API}/${encodeURIComponent(id)}`, { method: 'PUT', headers: authHeaders(true), body: JSON.stringify(data) }));
    if (!r.ok) throw new Error('update failed');
    return r.json();
  }
  async function apiDelete(id) {
    const r = require200(await fetch(`${API}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: authHeaders() }));
    if (!r.ok) throw new Error('delete failed');
    return r.json();
  }

  // ---------- Backend API (blogs) ----------
  const BLOG_API = '/api/blogs';
  let blogsCache = [];
  async function blogList() {
    const r = await fetch(BLOG_API);
    if (!r.ok) throw new Error('list failed');
    return r.json();
  }
  async function blogCreate(data) {
    const r = require200(await fetch(BLOG_API, { method: 'POST', headers: authHeaders(true), body: JSON.stringify(data) }));
    if (!r.ok) throw new Error('create failed');
    return r.json();
  }
  async function blogUpdate(id, data) {
    const r = require200(await fetch(`${BLOG_API}/${encodeURIComponent(id)}`, { method: 'PUT', headers: authHeaders(true), body: JSON.stringify(data) }));
    if (!r.ok) throw new Error('update failed');
    return r.json();
  }
  async function blogDelete(id) {
    const r = require200(await fetch(`${BLOG_API}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: authHeaders() }));
    if (!r.ok) throw new Error('delete failed');
    return r.json();
  }

  // ---------- localStorage (settings only) ----------
  const KEYS = { settings: 'up_settings_v2' };
  const LS = {
    get(key, fallback) {
      try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
      catch { return fallback; }
    },
    set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
  };
  const DEFAULT_SETTINGS = { whatsapp: '923008499644', phone: '+92 300 8499644', email: 'info@uniqueproperties.pk' };
  const INQUIRIES = [
    { name: 'Ali Raza', property: 'Modern 1 Kanal Villa', msg: "Assalam o Alaikum, I'm interested in the 1 Kanal villa. Is it still available for viewing this weekend?", initials: 'AR', color: '#C9A227' },
    { name: 'Fatima Hassan', property: 'Sky Garden Penthouse', msg: 'Hello, could you share the payment plan and possession timeline for the penthouse? Investing from the UK.', initials: 'FH', color: '#10B981' },
    { name: 'Bilal Ahmed', property: 'Corner 5 Marla Plot', msg: 'Please confirm the demand for the corner plot in Tulip block and whether the price is negotiable.', initials: 'BA', color: '#1c2a45' },
    { name: 'Sara Khan', property: 'Elegant 10 Marla Home', msg: 'Looking to sell my current home and upgrade. Can we schedule a call this week?', initials: 'SK', color: '#6B7280' },
  ];

  if (LS.get(KEYS.settings, null) === null) LS.set(KEYS.settings, DEFAULT_SETTINGS);
  const getBlogs = () => blogsCache;

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
  const waNumber = () => (LS.get(KEYS.settings, DEFAULT_SETTINGS).whatsapp || '923008499644').replace(/\D/g, '');
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
  // The menu is position:fixed, so we place it next to the clicked button.
  function positionRowMenu(btn, menu) {
    if (!menu) return;
    const r = btn.getBoundingClientRect();
    const mw = menu.offsetWidth || 160;   // reading offset* forces layout → real size
    const mh = menu.offsetHeight || 150;
    let left = Math.min(r.right - mw, window.innerWidth - mw - 8);
    if (left < 8) left = 8;                                          // clamp horizontally
    let top = r.bottom + 6;                                          // below the button…
    if (top + mh > window.innerHeight - 8) top = r.top - mh - 6;     // …flip above if near bottom
    top = Math.max(8, Math.min(top, window.innerHeight - mh - 8));   // hard clamp on-screen
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  }
  function closeRowMenus() {
    document.querySelectorAll('.actions-cell.open').forEach(c => c.classList.remove('open'));
  }
  document.addEventListener('click', e => {
    const toggle = e.target.closest('[data-menu-toggle]');
    if (toggle) {
      const cell = toggle.closest('.actions-cell');
      const wasOpen = cell.classList.contains('open');
      closeRowMenus();
      if (!wasOpen) {
        cell.classList.add('open');
        positionRowMenu(toggle, cell.querySelector('.row-menu'));
      }
    } else if (!e.target.closest('.row-menu')) {
      closeRowMenus();
    }
  });
  // A fixed menu won't follow the page/table — close it on scroll or resize.
  window.addEventListener('scroll', closeRowMenus, true);
  window.addEventListener('resize', closeRowMenus);

  // ---------- Render: properties table (from API cache) ----------
  function statusClass(s) { return ({ active: 'active', pending: 'pending', sold: 'sold' })[String(s || 'Active').toLowerCase()] || 'active'; }
  function propRow(p) {
    const isSold = String(p.status || '').toLowerCase() === 'sold';
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
          <button data-sold-prop="${esc(p.id)}">${isSold
            ? '<i class="fa-solid fa-rotate-left"></i> Mark as Available'
            : '<i class="fa-solid fa-circle-check"></i> Mark as Sold'}</button>
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
    const sold = e.target.closest('[data-sold-prop]');
    const del = e.target.closest('[data-del-prop]');
    if (edit) editProp(edit.dataset.editProp);
    else if (sold) {
      const id = sold.dataset.soldProp;
      const p = propsCache.find(x => x.id === id);
      const newStatus = String(p && p.status).toLowerCase() === 'sold' ? 'Active' : 'Sold';
      try {
        await apiUpdate(id, { status: newStatus });
        await loadProps();
        toast(newStatus === 'Sold' ? 'Property marked as sold.' : 'Property marked as available.');
      } catch { toast('Update failed — is the server running?'); }
    }
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
  async function loadBlogs() {
    try {
      blogsCache = await blogList();
      if (!Array.isArray(blogsCache)) blogsCache = [];
    } catch (err) {
      blogsCache = [];
      document.querySelectorAll('[data-blogs-list]').forEach(tb => {
        tb.innerHTML = `<tr><td colspan="4"><div class="list-empty">Could not reach the server. Is <code>server.py</code> running?</div></td></tr>`;
      });
    }
    renderBlogs();
    renderStats();
  }
  document.querySelectorAll('[data-blogs-list]').forEach(tb => tb.addEventListener('click', async e => {
    const edit = e.target.closest('[data-edit-blog]');
    const del = e.target.closest('[data-del-blog]');
    if (edit) editBlog(edit.dataset.editBlog);
    else if (del && confirm('Delete this blog post?')) {
      try { await blogDelete(del.dataset.delBlog); await loadBlogs(); toast('Blog post deleted.'); }
      catch { toast('Delete failed — is the server running?'); }
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

  // ---------- Image picker (URL / device file / camera) — shared by property + blog ----------
  // Reads a chosen photo, downscales it in-browser, and stores it as a data URL in
  // the linked text field. Keeps payloads small and needs no backend changes.
  function fileToResizedDataURL(file, maxW = 1280, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read failed'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => resolve(reader.result); // not rasterizable → keep original
        img.onload = () => {
          const scale = Math.min(1, maxW / (img.width || maxW));
          const w = Math.max(1, Math.round((img.width || maxW) * scale));
          const h = Math.max(1, Math.round((img.height || maxW) * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          try { resolve(canvas.toDataURL('image/jpeg', quality)); }
          catch { resolve(reader.result); }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function initImagePicker(root) {
    const urlInput = root.querySelector('[data-img-url]'); // hidden field holding the value
    const preview = root.querySelector('[data-img-preview]');
    const empty = root.querySelector('[data-img-empty]');   // the "add photo" card
    const filled = root.querySelector('[data-img-filled]'); // preview + remove
    const show = src => {
      if (src) {
        if (preview) preview.src = src;
        if (filled) filled.style.display = '';
        if (empty) empty.style.display = 'none';
      } else {
        if (preview) preview.removeAttribute('src');
        if (filled) filled.style.display = 'none';
        if (empty) empty.style.display = '';
      }
    };
    root.querySelectorAll('[data-img-file], [data-img-camera]').forEach(inp =>
      inp.addEventListener('change', async () => {
        const file = inp.files && inp.files[0];
        if (!file) return;
        try { const data = await fileToResizedDataURL(file); if (urlInput) urlInput.value = data; show(data); }
        catch { toast('Could not read that image.'); }
        inp.value = ''; // allow re-selecting the same file
      }));
    const removeBtn = root.querySelector('[data-img-remove]');
    if (removeBtn) removeBtn.addEventListener('click', () => { if (urlInput) urlInput.value = ''; show(''); });
    // Re-render when the value is set programmatically (edit/reset dispatch 'input').
    if (urlInput) urlInput.addEventListener('input', () => show(urlInput.value.trim()));
  }
  document.querySelectorAll('[data-img-picker]').forEach(initImagePicker);
  const syncPreview = el => el && el.dispatchEvent(new Event('input'));

  // ---------- Property form (API) ----------
  const propForm = document.querySelector('[data-property-form]');
  const propFormTitle = document.querySelector('[data-prop-form-title]');
  const propSubmitLabel = document.querySelector('[data-prop-submit-label]');
  function resetPropForm() {
    if (!propForm) return;
    propForm.reset(); propForm.elements.id.value = '';
    syncPreview(propForm.elements.image); // clear image preview
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
    propForm.elements.purpose.value = p.purpose || 'For Sale';
    propForm.elements.status.value = p.status || 'Active';
    propForm.elements.bedrooms.value = p.bedrooms || '';
    propForm.elements.bathrooms.value = p.bathrooms || '';
    propForm.elements.area.value = p.area || '';
    propForm.elements.areaUnit.value = p.areaUnit || 'Marla';
    propForm.elements.garage.value = p.garage || '';
    propForm.elements.image.value = p.image || '';
    syncPreview(propForm.elements.image); // show current image
    propForm.elements.description.value = p.description || '';
    if (propFormTitle) propFormTitle.textContent = 'Edit Property';
    if (propSubmitLabel) propSubmitLabel.textContent = 'Save Changes';
    setPanel('add', true);
  }
  propForm && propForm.addEventListener('submit', async e => {
    e.preventDefault();
    const num = el => (el.value !== '' ? Number(el.value) : '');
    const data = {
      title: propForm.elements.title.value.trim(),
      price: Number(propForm.elements.price.value) || 0,
      location: propForm.elements.location.value.trim(),
      type: propForm.elements.type.value,
      purpose: propForm.elements.purpose.value,
      status: propForm.elements.status.value,
      bedrooms: num(propForm.elements.bedrooms),
      bathrooms: num(propForm.elements.bathrooms),
      area: num(propForm.elements.area),
      areaUnit: propForm.elements.areaUnit.value,
      garage: num(propForm.elements.garage),
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

  // ---------- Blog form (API) ----------
  const blogForm = document.querySelector('[data-blog-form]');
  const blogFormTitle = document.querySelector('[data-blog-form-title]');
  const blogSubmitLabel = document.querySelector('[data-blog-submit-label]');
  function resetBlogForm() {
    if (!blogForm) return;
    blogForm.reset(); blogForm.elements.id.value = '';
    syncPreview(blogForm.elements.cover); // clear cover preview
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
    syncPreview(blogForm.elements.cover); // show current cover
    blogForm.elements.excerpt.value = b.excerpt || '';
    blogForm.elements.content.value = b.content || '';
    if (blogFormTitle) blogFormTitle.textContent = 'Edit Blog Post';
    if (blogSubmitLabel) blogSubmitLabel.textContent = 'Save Changes';
    setPanel('add-blog', true);
  }
  blogForm && blogForm.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      title: blogForm.elements.title.value.trim(),
      category: blogForm.elements.category.value,
      cover: blogForm.elements.cover.value.trim(),
      excerpt: blogForm.elements.excerpt.value.trim(),
      content: blogForm.elements.content.value.trim(),
    };
    const id = blogForm.elements.id.value;
    try {
      if (id) {
        await blogUpdate(id, data);
        toast('Blog post updated.');
      } else {
        data.date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        await blogCreate(data);
        toast('Blog post published.');
      }
      await loadBlogs();
      resetBlogForm();
      showPanel('blogs');
    } catch {
      toast('Save failed — is the server running?');
    }
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
  renderInquiries();
  loadSettings();
  loadProps();            // fetch properties from the backend
  loadBlogs();            // fetch blogs from the backend

  const params = new URLSearchParams(location.search);
  showPanel(params.get('panel') || 'dashboard');
  if (params.get('drawer') === '1') openDrawer();
})();
