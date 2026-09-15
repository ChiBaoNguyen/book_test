/* Heritage benefits bar — HOME_FEATURE_LIST from Portal API */
(function () {
  'use strict';

  const FEATURE_CODE = 'HOME_FEATURE_LIST';
  const API_URL = '/api/Portal/featureLists/code/' + encodeURIComponent(FEATURE_CODE);

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function pickFeatureText(item, langCode) {
    const translations = item.translations || item.Translations || [];
    if (!translations.length) return '';
    const lang = (langCode || 'vi').toLowerCase();
    let tr = translations.find(t =>
      (t.languageCode || t.LanguageCode || '').toLowerCase() === lang
    );
    if (!tr) {
      tr = translations.find(t => {
        const tLang = (t.languageCode || t.LanguageCode || '').toLowerCase();
        return tLang.substring(0, 2) === lang.substring(0, 2);
      });
    }
    if (!tr) tr = translations[0];
    return tr?.text || tr?.Text || '';
  }

  function splitTitleDesc(text) {
    if (!text) return { title: '', desc: '' };
    let parts;
    if (text.includes('\n')) {
      parts = text.split('\n').map(s => s.trim()).filter(Boolean);
    } else if (text.includes('|')) {
      parts = text.split('|').map(s => s.trim()).filter(Boolean);
    } else {
      return { title: text.trim(), desc: '' };
    }
    return {
      title: parts[0] || '',
      desc: parts.slice(1).join(' — ') || ''
    };
  }

  function renderIcon(icon) {
    const raw = (icon || '').trim();
    if (!raw) return '<i class="bi bi-star"></i>';

    // CoreUI icons require base class "icon" (e.g. icon cil-star)
    if (/\bcil-/.test(raw)) {
      const classes = raw.split(/\s+/).filter(Boolean);
      if (!classes.includes('icon')) classes.unshift('icon');
      return `<i class="${escapeHtml(classes.join(' '))}"></i>`;
    }

    if (raw.startsWith('bi ') || raw.startsWith('bi-')) {
      return `<i class="${escapeHtml(raw)}"></i>`;
    }

    return `<i class="bi ${escapeHtml(raw)}"></i>`;
  }

  function createBenefitItem(item, langCode) {
    const text = pickFeatureText(item, langCode);
    const { title, desc } = splitTitleDesc(text);
    if (!title) return null;

    const icon = item.icon || item.Icon || '';
    const el = document.createElement('div');
    el.className = 'heritage-benefit-item';
    el.innerHTML = `
      <div class="heritage-benefit-icon">${renderIcon(icon)}</div>
      <div>
        <p class="heritage-benefit-title">${escapeHtml(title)}</p>
        ${desc ? `<p class="heritage-benefit-desc">${escapeHtml(desc)}</p>` : ''}
      </div>`;
    return el;
  }

  async function loadBenefitsBar() {
    const section = document.getElementById('heritageBenefitsSection');
    const grid = document.getElementById('heritageBenefitsGrid');
    if (!section || !grid) return;

    const langCode = localStorage.getItem('selectedLanguage') || 'vi';

    try {
      const res = await fetch(API_URL);
      if (!res.ok) {
        section.classList.add('d-none');
        return;
      }

      const data = await res.json();
      const items = (data.items || data.Items || [])
        .filter(item => item && item.deleted !== true)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      grid.innerHTML = '';

      items.forEach(item => {
        const el = createBenefitItem(item, langCode);
        if (el) grid.appendChild(el);
      });

      if (grid.children.length > 0) {
        section.classList.remove('d-none');
      } else {
        section.classList.add('d-none');
      }
    } catch {
      section.classList.add('d-none');
    }
  }

  document.addEventListener('DOMContentLoaded', loadBenefitsBar);
  window.addEventListener('languageChanged', loadBenefitsBar);
})();
