/* Homepage core values — HOME_GIATRICOTLOI from Portal API */
(function () {
  'use strict';

  const FEATURE_CODE = 'HOME_GIATRICOTLOI';
  const API_URL = '/api/Portal/featureLists/code/' + encodeURIComponent(FEATURE_CODE);
  const DEFAULT_CTA = 'Khám phá →';

  function isFeatureListEnabled(data) {
    if (!data) return false;
    if (data.deleted === true || data.Deleted === true) return false;
    const enabled = data.enabled ?? data.Enabled;
    return enabled === true || enabled === 1;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pickTranslation(translations, langCode) {
    const list = translations || [];
    if (!list.length) return null;
    const lang = (langCode || 'vi').toLowerCase();
    let tr = list.find(t => (t.languageCode || t.LanguageCode || '').toLowerCase() === lang);
    if (!tr && lang.length >= 2) {
      tr = list.find(t => {
        const code = (t.languageCode || t.LanguageCode || '').toLowerCase();
        return code.length >= 2 && code.substring(0, 2) === lang.substring(0, 2);
      });
    }
    return tr || list[0];
  }

  function pickGroupTranslation(featureList, langCode) {
    return pickTranslation(featureList.translations || featureList.Translations || [], langCode);
  }

  function parseParts(text) {
    const raw = (text || '').trim();
    if (!raw) return [];
    if (raw.includes('\n')) {
      return raw.split('\n').map(s => s.trim()).filter(Boolean);
    }
    if (raw.includes('|')) {
      return raw.split('|').map(s => s.trim()).filter(Boolean);
    }
    return [raw];
  }

  /** Item text: title | description | link | linkLabel */
  function parseItemText(text) {
    const parts = parseParts(text);
    return {
      title: parts[0] || '',
      description: parts[1] || '',
      link: parts[2] || '',
      linkLabel: parts[3] || DEFAULT_CTA
    };
  }

  function renderIcon(icon) {
    const raw = (icon || '').trim();
    if (!raw) {
      return '<i class="bi bi-star" aria-hidden="true"></i>';
    }
    if (/\bcil-/.test(raw)) {
      const classes = raw.split(/\s+/).filter(Boolean);
      if (!classes.includes('icon')) classes.unshift('icon');
      return `<i class="${escapeHtml(classes.join(' '))}" aria-hidden="true"></i>`;
    }
    if (raw.startsWith('bi ') || raw.startsWith('bi-')) {
      return `<i class="${escapeHtml(raw)}" aria-hidden="true"></i>`;
    }
    return `<i class="bi ${escapeHtml(raw)}" aria-hidden="true"></i>`;
  }

  function renderHeader(groupTr) {
    if (!groupTr) return '';
    const label = (groupTr.content ?? groupTr.Content ?? '').trim();
    const title = (groupTr.title ?? groupTr.Title ?? '').trim();
    if (!label && !title) return '';

    return `
      <div class="home-core-values__header-inner">
        ${label ? `<p class="home-core-values__label">${escapeHtml(label)}</p>` : ''}
        ${title ? `<h2 class="home-core-values__title">${escapeHtml(title)}</h2>` : ''}
        ${title || label ? '<div class="home-core-values__gold-bar" aria-hidden="true"></div>' : ''}
      </div>`;
  }

  function renderCard(item, langCode) {
    const tr = pickTranslation(item.translations || item.Translations || [], langCode);
    const text = (tr?.text ?? tr?.Text ?? '').trim();
    const parsed = parseItemText(text);
    if (!parsed.title) return '';

    const icon = item.icon ?? item.Icon ?? '';
    const ctaHtml = parsed.link
      ? `<a href="${escapeHtml(parsed.link)}" class="home-core-values__cta">${escapeHtml(parsed.linkLabel)}</a>`
      : '';

    return `
      <article class="home-core-values__card">
        <div class="home-core-values__icon-wrap">${renderIcon(icon)}</div>
        <h3 class="home-core-values__card-title">${escapeHtml(parsed.title)}</h3>
        <div class="home-core-values__card-bar" aria-hidden="true"></div>
        ${parsed.description ? `<p class="home-core-values__card-text">${escapeHtml(parsed.description)}</p>` : ''}
        ${ctaHtml}
      </article>`;
  }

  function sortItems(items) {
    return [...(items || [])].sort((a, b) => {
      const orderA = a.sortOrder ?? a.SortOrder ?? 0;
      const orderB = b.sortOrder ?? b.SortOrder ?? 0;
      return orderA - orderB;
    });
  }

  function renderSection(featureList, langCode) {
    const section = document.getElementById('homeCoreValuesSection');
    const headerEl = document.getElementById('homeCoreValuesHeader');
    const gridEl = document.getElementById('homeCoreValuesGrid');
    if (!section || !headerEl || !gridEl) return false;

    const groupTr = pickGroupTranslation(featureList, langCode);
    const items = sortItems(featureList.items || featureList.Items || []);
    const cards = items
      .map(item => renderCard(item, langCode))
      .filter(Boolean);

    if (!cards.length) return false;

    headerEl.innerHTML = renderHeader(groupTr);
    gridEl.innerHTML = cards.join('');
    return true;
  }

  async function loadHomeCoreValues() {
    const section = document.getElementById('homeCoreValuesSection');
    if (!section) return;

    const langCode = localStorage.getItem('selectedLanguage') || 'vi';

    try {
      const res = await fetch(`${API_URL}?langCode=${encodeURIComponent(langCode)}`, {
        headers: { Accept: 'application/json' }
      });

      if (!res.ok) {
        section.classList.add('d-none');
        return;
      }

      const featureList = await res.json();
      if (!isFeatureListEnabled(featureList)) {
        section.classList.add('d-none');
        return;
      }

      if (renderSection(featureList, langCode)) {
        section.classList.remove('d-none');
      } else {
        section.classList.add('d-none');
      }
    } catch {
      section.classList.add('d-none');
    }
  }

  document.addEventListener('DOMContentLoaded', loadHomeCoreValues);
  window.addEventListener('languageChanged', loadHomeCoreValues);
})();
