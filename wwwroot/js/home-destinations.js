/* Homepage destinations â€” articles with category type location */
(function () {
  'use strict';

  const CATEGORY_TYPE = 'location';
  const PAGE_SIZE = 4;
  const API_BASE = '/api/Portal/articles/category-type/' + encodeURIComponent(CATEGORY_TYPE);

  let pageTranslations = {};
  let defaultLang = 'vi';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getLangCode() {
    try {
      return (localStorage.getItem('selectedLanguage') || defaultLang).toLowerCase();
    } catch {
      return defaultLang;
    }
  }

  function t(key, fallback) {
    const lang = getLangCode();
    const langPack = pageTranslations[lang] || pageTranslations[defaultLang] || {};
    return langPack[key] || fallback || key;
  }

  async function loadTranslations() {
    try {
      const res = await fetch('/locales/page.json');
      if (!res.ok) return;
      const data = await res.json();
      defaultLang = data.default || 'vi';
      pageTranslations = data;
    } catch {
      /* ignore */
    }
  }

  function pickTranslation(translations, langCode) {
    const list = translations || [];
    if (!list.length) return null;
    const lang = (langCode || 'vi').toLowerCase();
    let tr = list.find(item => (item.languageCode || item.LanguageCode || '').toLowerCase() === lang);
    if (!tr && lang.length >= 2) {
      tr = list.find(item => {
        const code = (item.languageCode || item.LanguageCode || '').toLowerCase();
        return code.length >= 2 && code.substring(0, 2) === lang.substring(0, 2);
      });
    }
    return tr || list[0];
  }

  function mediaUrl(url) {
    if (!url) return '';
    let value = String(url).trim();
    if (value.startsWith('//')) value = `https:${value}`;
    else if (/^http:\/\//i.test(value) && window.location.protocol === 'https:') {
      value = value.replace(/^http:\/\//i, 'https://');
    }
    if (/^https?:\/\//i.test(value) || value.startsWith('/')) return value;
    if (/^[a-z0-9.-]+\.[a-z]{2,}\//i.test(value)) return `https://${value}`;
    return value;
  }

  function stripHtml(html) {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  }

  function renderCard(article, langCode) {
    const tr = pickTranslation(article.translations || article.Translations || [], langCode);
    if (!tr) return '';

    const title = (tr.title || tr.Title || '').trim();
    if (!title) return '';

    const summary = tr.summary || tr.Summary || '';
    const summaryText = stripHtml(summary);
    const image = mediaUrl(article.image || article.Image || '');
    const urlSlug = tr.urlSlug || tr.UrlSlug || '';
    const link = `/article/${encodeURIComponent(urlSlug || 'article')}`;
    const ctaLabel = t('viewContinue', t('viewDetails', 'Xem thÃªm'));

    return `
      <div class="content-item">
        ${image ? `<div class="content-item-media"><a href="${escapeHtml(link)}" class="content-item-media__link"><img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" class="content-item-image" loading="lazy" onerror="this.closest('.content-item-media').style.display='none'"></a></div>` : ''}
        <div class="content-item-body">
          <h3 class="content-item-title">
            <a href="${escapeHtml(link)}">${escapeHtml(title)}</a>
          </h3>
          ${summaryText ? `<p class="content-item-summary">${escapeHtml(summaryText.substring(0, 150))}${summaryText.length > 150 ? '...' : ''}</p>` : ''}
          <div class="content-item-meta">
            <a href="${escapeHtml(link)}" class="heritage-btn-continue">${escapeHtml(ctaLabel)}</a>
          </div>
        </div>
      </div>`;
  }

  function setGridLoading(gridEl) {
    if (!gridEl) return;
    gridEl.innerHTML = '<div class="gallery-loading"><div class="spinner-border spinner-border-sm text-warning" role="status"></div></div>';
  }

  async function loadHomeDestinations() {
    const section = document.getElementById('homeDestinationsSection');
    const gridEl = document.getElementById('homeDestinationsGrid');
    const titleEl = document.getElementById('homeDestinationsTitle');
    if (!section || !gridEl) return;

    const langCode = getLangCode();

    if (titleEl) {
      titleEl.textContent = t('homeDestinationsTitle', 'Äiá»ƒm Ä‘áº¿n ná»•i báº­t');
    }

    setGridLoading(gridEl);

    try {
      const params = new URLSearchParams({
        pageNumber: '1',
        pageSize: String(PAGE_SIZE)
      });
      const res = await fetch(`${API_BASE}?${params}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });

      if (!res.ok) {
        section.classList.add('d-none');
        return;
      }

      const data = await res.json();
      const items = data.items || data.Items || [];
      const cards = items
        .map(item => renderCard(item, langCode))
        .filter(Boolean);

      if (!cards.length) {
        section.classList.add('d-none');
        return;
      }

      gridEl.innerHTML = cards.join('');
      section.classList.remove('d-none');
    } catch (err) {
      section.classList.add('d-none');
    }
  }

  function initHomeDestinations() {
    loadTranslations().then(loadHomeDestinations);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomeDestinations);
  } else {
    initHomeDestinations();
  }

  window.addEventListener('languageChanged', loadHomeDestinations);
})();
