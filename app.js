(() => {
  'use strict';

  const config = window.TANNPRODUCT_CONFIG || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { products: [], filter: 'all', search: '', sort: 'latest', saved: new Set(), installPrompt: null };
  const savedKey = 'tannproduct:saved:v1';

  try { state.saved = new Set(JSON.parse(localStorage.getItem(savedKey) || '[]')); } catch (_) { state.saved = new Set(); }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function slugify(value) {
    return String(value || 'product').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 55) || 'product';
  }
  function formatPrice(product) {
    if (product.type !== 'paid' || !(Number(product.price) > 0)) return 'Gratis';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(product.price));
  }
  function formatSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return '';
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  function safeSameOriginAsset(url) {
    if (typeof url !== 'string' || !url.trim()) return '';
    const raw = url.trim();
    if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
    try { const parsed = new URL(raw, window.location.origin); return parsed.origin === window.location.origin ? parsed.pathname + parsed.search + parsed.hash : ''; } catch (_) { return ''; }
  }
  function safeExternalUrl(url) {
    try { const parsed = new URL(String(url || '')); return parsed.protocol === 'https:' ? parsed.href : ''; } catch (_) { return ''; }
  }
  function showToast(title, message = '', type = 'success') {
    const region = $('#toastRegion');
    if (!region) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    toast.innerHTML = `<span class="toast-symbol">${type === 'error' ? '!' : '✓'}</span><div><b>${escapeHTML(title)}</b>${message ? `<p>${escapeHTML(message)}</p>` : ''}</div><button class="toast-close" aria-label="Tutup">×</button>`;
    $('.toast-close', toast).addEventListener('click', () => toast.remove());
    region.appendChild(toast);
    window.setTimeout(() => toast.remove(), 5200);
  }
  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    const focusable = $('button, a, input, select, textarea', modal);
    if (focusable) window.setTimeout(() => focusable.focus(), 30);
  }
  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.hidden = true;
    if ($$('.modal-backdrop:not([hidden])').length === 0) document.body.style.overflow = '';
  }
  function artMarkup(product, large = false) {
    const text = `${product.name || ''} ${product.category || ''}`.toLowerCase();
    let variant = product.accent || '';
    if (!variant) {
      if (/crystal|fantasy|magic|gem/.test(text)) variant = 'crystal';
      else if (/ui|gui|interface|hud/.test(text)) variant = 'ui';
      else if (/beacon|spawn|light|tool|system/.test(text)) variant = 'beacon';
      else if (/tool|script|system/.test(text)) variant = 'tools';
      else variant = 'violet';
    }
    let visual = '';
    if (variant === 'crystal') visual = '<div class="cover-visual visual-crystal"><i class="crystal"></i><i class="crystal"></i><i class="crystal"></i></div>';
    else if (variant === 'blue' || variant === 'beacon') visual = '<div class="cover-visual visual-beacon"></div>';
    else if (variant === 'ui') visual = '<div class="cover-visual visual-ui"><div class="ui-window"><div class="ui-dot"></div><div class="ui-head"></div><div class="ui-bar"></div><div class="ui-bar"></div></div></div>';
    else if (variant === 'tools') visual = '<div class="cover-visual visual-tools"><div class="tool-hex">⌘</div></div>';
    else visual = '<div class="cover-visual visual-platform"><i class="v-top"></i><i class="v-side"></i><i class="v-beam"></i></div>';
    return `<div class="${large ? 'detail-cover' : 'product-cover'}"><div class="cover-lines"></div>${visual}</div>`;
  }
  function normalizeProduct(product, index = 0) {
    if (!product || typeof product !== 'object') return null;
    const name = String(product.name || product.title || '').trim().slice(0, 120);
    if (!name) return null;
    const type = product.type === 'paid' ? 'paid' : 'free';
    const price = type === 'paid' ? Math.max(0, Number(product.price) || 0) : 0;
    const id = String(product.id || slugify(name) + '-' + index).slice(0, 120);
    return {
      id, name,
      description: String(product.description || 'Belum ada deskripsi untuk produk ini.').slice(0, 1000),
      category: String(product.category || 'Other').slice(0, 50),
      type, price, version: String(product.version || '1.0.0').slice(0, 30),
      format: String(product.format || (product.filePath || '').split('.').pop() || 'ASSET').toUpperCase().slice(0, 12),
      filePath: typeof product.filePath === 'string' ? product.filePath : '',
      downloadUrl: typeof product.downloadUrl === 'string' ? product.downloadUrl : '',
      purchaseUrl: typeof product.purchaseUrl === 'string' ? product.purchaseUrl : '',
      date: String(product.date || '2026-01-01').slice(0, 30),
      size: Number(product.size) || 0,
      accent: String(product.accent || '').slice(0, 20)
    };
  }
  async function loadCatalog() {
    try {
      const response = await fetch(`${config.catalogPath || './products.json'}?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('catalog response not ok');
      const data = await response.json();
      state.products = Array.isArray(data) ? data.map(normalizeProduct).filter(Boolean) : [];
    } catch (_) {
      state.products = [];
      showToast('Katalog tidak dapat dimuat', 'Pastikan products.json ada di root project dan format JSON valid.', 'error');
    }
    renderCatalog();
    const productId = new URLSearchParams(window.location.search).get('product');
    if (productId) {
      const matched = state.products.find(p => p.id === productId);
      if (matched) openDetails(matched.id);
    }
  }
  function filteredProducts() {
    let products = [...state.products];
    if (state.filter === 'free') products = products.filter(p => p.type !== 'paid');
    if (state.filter === 'paid') products = products.filter(p => p.type === 'paid');
    if (state.filter === 'saved') products = products.filter(p => state.saved.has(p.id));
    const query = state.search.trim().toLowerCase();
    if (query) products = products.filter(p => `${p.name} ${p.description} ${p.category} ${p.format}`.toLowerCase().includes(query));
    if (state.sort === 'name') products.sort((a, b) => a.name.localeCompare(b.name, 'id'));
    else if (state.sort === 'price-low') products.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, 'id'));
    else if (state.sort === 'price-high') products.sort((a, b) => b.price - a.price || a.name.localeCompare(b.name, 'id'));
    else products.sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.name.localeCompare(b.name, 'id'));
    return products;
  }
  function renderProduct(product) {
    const isPaid = product.type === 'paid';
    const saved = state.saved.has(product.id);
    const badge = isPaid ? '<span class="badge-star">✦</span> PREMIUM' : '<span class="badge-star">↧</span> FREE ASSET';
    const coverMarkup = artMarkup(product).replace(/<\/div>$/, `<span class="cover-format">${escapeHTML(product.format || 'ASSET')}</span></div>`);
    const url = isPaid ? safeExternalUrl(product.purchaseUrl) : safeSameOriginAsset(product.downloadUrl || (product.filePath ? `/${product.filePath}` : ''));
    const cta = isPaid
      ? (url ? `<a class="download-button premium-cta" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" data-action="purchase" data-id="${escapeHTML(product.id)}">Lihat akses <span>↗</span></a>` : '<span class="download-button premium-cta" aria-disabled="true">Link belum tersedia</span>')
      : (url ? `<a class="download-button" href="${escapeHTML(url)}" download data-action="download" data-id="${escapeHTML(product.id)}">Download <span>↓</span></a>` : '<span class="download-button" aria-disabled="true">File belum tersedia</span>');
    const priceClass = isPaid ? 'product-price premium' : 'product-price';
    return `<article class="product-card">
      ${coverMarkup}
      <span class="product-badge ${isPaid ? 'paid-badge' : 'free-badge'}">${badge}</span>
      <button class="favorite-button ${saved ? 'is-saved' : ''}" data-action="favorite" data-id="${escapeHTML(product.id)}" aria-label="${saved ? 'Hapus dari tersimpan' : 'Simpan produk'}" title="${saved ? 'Tersimpan' : 'Simpan produk'}">${saved ? '♥' : '♡'}</button>
      <div class="product-info"><div class="product-category"><i class="category-dot"></i>${escapeHTML(product.category)}</div>
        <div class="product-title-line"><h3 class="product-title">${escapeHTML(product.name)}</h3><span class="${priceClass}">${escapeHTML(formatPrice(product))}</span></div>
        <p class="product-description">${escapeHTML(product.description)}</p>
        <div class="product-meta"><span class="product-version">V${escapeHTML(product.version)}</span><div class="card-actions"><button class="details-button" data-action="detail" data-id="${escapeHTML(product.id)}">Detail</button>${cta}</div></div>
      </div></article>`;
  }
  function renderCatalog() {
    const products = filteredProducts();
    $('#productGrid').innerHTML = products.map(renderProduct).join('');
    $('#emptyState').hidden = products.length !== 0;
    $('#productGrid').hidden = products.length === 0;
    $('#resultSummary').textContent = `${products.length} produk ditemukan`;
    $('#productCount').textContent = String(state.products.length).padStart(2, '0');
    $('#proofCount').textContent = String(state.products.length);
    $('#savedCount').textContent = String(state.saved.size);
    $$('.filter-pill').forEach(button => button.classList.toggle('active', button.dataset.filter === state.filter));
    $('#yearNow').textContent = String(new Date().getFullYear());
  }
  function openDetails(id) {
    const product = state.products.find(p => p.id === id);
    if (!product) return;
    const isPaid = product.type === 'paid';
    const url = isPaid ? safeExternalUrl(product.purchaseUrl) : safeSameOriginAsset(product.downloadUrl || (product.filePath ? `/${product.filePath}` : ''));
    const action = isPaid
      ? (url ? `<a class="button button-primary" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">Lihat link pembelian <span>↗</span></a>` : '<button class="button button-primary" disabled>Link belum tersedia</button>')
      : (url ? `<a class="button button-primary" href="${escapeHTML(url)}" download>Download gratis <span>↓</span></a>` : '<button class="button button-primary" disabled>File belum tersedia</button>');
    $('#detailContent').innerHTML = `${artMarkup(product, true)}<div class="detail-label">${isPaid ? '✦ PREMIUM RESOURCE' : '↧ FREE RESOURCE'} · ${escapeHTML(product.category).toUpperCase()}</div><div class="detail-title-line"><h2 id="detailTitle">${escapeHTML(product.name)}</h2><span class="product-price ${isPaid ? 'premium' : ''}">${escapeHTML(formatPrice(product))}</span></div><p class="detail-desc">${escapeHTML(product.description)}</p><div class="detail-meta"><span class="meta-chip">FORMAT · ${escapeHTML(product.format)}</span><span class="meta-chip">VERSION · ${escapeHTML(product.version)}</span>${product.size ? `<span class="meta-chip">SIZE · ${escapeHTML(formatSize(product.size))}</span>` : ''}<span class="meta-chip">${escapeHTML(product.date)}</span></div><div class="detail-actions">${action}<button class="button button-quiet" data-action="share" data-id="${escapeHTML(product.id)}">Bagikan <span>↗</span></button></div>`;
    openModal('detailModal');
  }
  function setFilter(filter) {
    state.filter = ['all', 'free', 'paid', 'saved'].includes(filter) ? filter : 'all';
    renderCatalog();
  }
  function toggleFavorite(id) {
    if (state.saved.has(id)) state.saved.delete(id); else state.saved.add(id);
    try { localStorage.setItem(savedKey, JSON.stringify([...state.saved])); } catch (_) {}
    renderCatalog();
    showToast(state.saved.has(id) ? 'Ditambahkan ke tersimpan' : 'Dihapus dari tersimpan', '', 'success');
  }
  function shareProduct(id) {
    const url = new URL(window.location.href);
    url.searchParams.set('product', id);
    url.hash = 'store';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url.toString()).then(() => showToast('Link produk disalin', 'Bagikan link ini kepada temanmu.')).catch(() => window.prompt('Salin link produk:', url.toString()));
    } else window.prompt('Salin link produk:', url.toString());
  }
  function bindEvents() {
    $('#searchInput').addEventListener('input', event => { state.search = event.target.value; renderCatalog(); });
    $('#sortSelect').addEventListener('change', event => { state.sort = event.target.value; renderCatalog(); });
    $$('.filter-pill').forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
    $$('[data-filter-shortcut]').forEach(button => button.addEventListener('click', () => { setFilter(button.dataset.filterShortcut); $('#store').scrollIntoView({ behavior: 'smooth' }); }));
    $('#heroSearchButton').addEventListener('click', () => { $('#store').scrollIntoView({ behavior: 'smooth' }); window.setTimeout(() => $('#searchInput').focus(), 450); });
    $('#resetFilters').addEventListener('click', () => { state.search = ''; $('#searchInput').value = ''; setFilter('all'); });
    $('#ownerButton').addEventListener('click', () => openModal('folderGuideModal'));
    $('#footerOwnerButton').addEventListener('click', () => openModal('folderGuideModal'));
    $$('[data-close-modal]').forEach(button => button.addEventListener('click', () => closeModal(button.dataset.closeModal)));
    $$('.modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', event => { if (event.target === backdrop) closeModal(backdrop.id); }));
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#searchInput').focus(); $('#store').scrollIntoView({ behavior: 'smooth' }); }
      if (event.key === 'Escape') $$('.modal-backdrop:not([hidden])').forEach(modal => closeModal(modal.id));
    });
    document.addEventListener('click', event => {
      const target = event.target.closest('[data-action]');
      if (!target) return;
      const { action, id } = target.dataset;
      if (action === 'favorite') { event.preventDefault(); toggleFavorite(id); }
      else if (action === 'detail') { event.preventDefault(); openDetails(id); }
      else if (action === 'share') { event.preventDefault(); shareProduct(id); }
    });
    const copyTemplateButton = $('#copyTemplateButton');
    if (copyTemplateButton) copyTemplateButton.addEventListener('click', async () => {
      const template = $('#productJsonTemplate').textContent.trim();
      try {
        await navigator.clipboard.writeText(template);
        showToast('Template disalin', 'Tempel objek JSON ini ke dalam products.json.');
      } catch (_) {
        window.prompt('Salin template JSON produk:', template);
      }
    });
    window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); state.installPrompt = event; $('#installButton').hidden = false; });
    $('#installButton').addEventListener('click', async () => {
      if (!state.installPrompt) return;
      state.installPrompt.prompt();
      await state.installPrompt.userChoice;
      state.installPrompt = null;
      $('#installButton').hidden = true;
    });
  }
  async function init() {
    bindEvents();
    await loadCatalog();
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }
  init();
})();
