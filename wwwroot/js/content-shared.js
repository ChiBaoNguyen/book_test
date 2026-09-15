/* Shared content rendering utilities */
window.ContentShared = (function () {
  'use strict';

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN').format(price || 0);
  }

  function pickTranslation(item, langCode) {
    if (!item || !item.translations || !Array.isArray(item.translations)) return null;
    const lang = (langCode || 'vi').toLowerCase();
    let tr = item.translations.find(t =>
      (t.languageCode || t.LanguageCode || '').toLowerCase() === lang
    );
    if (!tr) {
      tr = item.translations.find(t => {
        const tLang = (t.languageCode || t.LanguageCode || '').toLowerCase();
        return tLang.substring(0, 2) === lang.substring(0, 2);
      });
    }
    return tr || item.translations[0] || null;
  }

  function stripHtml(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  function createContentItem(item, type, langCode, t) {
    const div = document.createElement('div');
    div.className = 'content-item';
    const translation = pickTranslation(item, langCode);
    if (!translation) return div;

    const title = translation.title || translation.Title || translation.name || '—';
    const summary = translation.summary || translation.Summary || translation.description || '';
    const image = item.image || item.Image || item.thumbnail || item.Thumbnail || '';
    const urlSlug = translation.urlSlug || translation.UrlSlug || type;
    const routes = { article: 'article', product: 'product', event: 'event', book: 'book' };
    const link = `/${routes[type] || 'article'}/${urlSlug}`;

    let priceHtml = '';
    if (type === 'product') {
      const price = item.price || 0;
      const discount = item.discountPrice;
      if (discount && discount < price) {
        priceHtml = `<div class="d-flex align-items-center gap-2"><span class="heritage-price text-danger">${formatPrice(discount)} đ</span><span class="text-muted text-decoration-line-through small">${formatPrice(price)} đ</span></div>`;
      } else if (price) {
        priceHtml = `<span class="heritage-price">${formatPrice(price)} đ</span>`;
      }
    }

    const summaryText = stripHtml(summary);
    const viewLabel = t ? (t('viewContinue') || t('viewDetails')) : 'Xem thêm';

    div.innerHTML = `
      ${image ? `<div class="content-item-media"><a href="${escapeHtml(link)}" class="content-item-media__link"><img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" class="content-item-image" onerror="this.closest('.content-item-media').style.display='none'"></a></div>` : ''}
      <div class="content-item-body">
        <h3 class="content-item-title"><a href="${escapeHtml(link)}">${escapeHtml(title)}</a></h3>
        ${summaryText ? `<p class="content-item-summary">${escapeHtml(summaryText.substring(0, 150))}${summaryText.length > 150 ? '...' : ''}</p>` : ''}
        <div class="content-item-meta${priceHtml ? ' has-price' : ''}">
          ${priceHtml ? `<div>${priceHtml}</div>` : ''}
          <a href="${escapeHtml(link)}" class="heritage-btn-continue">${escapeHtml(viewLabel)}</a>
        </div>
      </div>`;
    return div;
  }

  function createSectionHeader(label, title, description) {
    const wrap = document.createElement('div');
    wrap.className = 'mb-4 mb-lg-5';
    wrap.innerHTML = `
      ${label ? `<p class="heritage-section-label">${escapeHtml(label)}</p><div class="heritage-gold-bar"></div>` : ''}
      ${title ? `<h2 class="heritage-section-title">${escapeHtml(title)}</h2>` : ''}
      ${description ? `<p class="text-muted mb-0">${escapeHtml(description)}</p>` : ''}`;
    return wrap;
  }

  function renderItemsGrid(items, type, langCode, t, containerId) {
    const container = document.createElement('div');
    container.className = 'content-items-container';
    container.id = containerId || `items-container-${type}`;
    container.setAttribute('data-view', 'grid');
    (items || []).forEach(item => {
      const el = createContentItem(item, type, langCode, t);
      if (el) container.appendChild(el);
    });
    return container.children.length ? container : null;
  }

  async function loadTranslations() {
    try {
      const res = await fetch('/locales/page.json');
      if (!res.ok) return { default: 'vi', data: {} };
      const data = await res.json();
      return { default: data.default || 'vi', data };
    } catch {
      return { default: 'vi', data: {} };
    }
  }

  function makeTranslator(translations, defaultLang, langCode) {
    return function t(key) {
      if (langCode && translations[langCode]) {
        return translations[langCode][key] || translations[defaultLang]?.[key] || key;
      }
      return translations[defaultLang]?.[key] || key;
    };
  }

  return {
    escapeHtml,
    formatPrice,
    pickTranslation,
    stripHtml,
    createContentItem,
    createSectionHeader,
    renderItemsGrid,
    loadTranslations,
    makeTranslator
  };
})();
