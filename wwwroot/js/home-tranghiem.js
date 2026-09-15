/* Homepage experience — HOME_TRAINGHIEM from Portal API */
(function () {
  'use strict';

  const FEATURE_CODE = 'HOME_TRAINGHIEM';
  const API_URL = '/api/Portal/featureLists/code/' + encodeURIComponent(FEATURE_CODE);

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

  /** Group content line 1 = label; line 2 = buttonLabel|buttonLink */
  function parseGroupContent(content) {
    const raw = (content || '').trim();
    if (!raw) return { label: '', buttonLabel: '', buttonLink: '' };

    const lines = raw.split('\n').map(s => s.trim()).filter(Boolean);
    const label = lines[0] || '';
    let buttonLabel = '';
    let buttonLink = '';

    if (lines[1]) {
      if (lines[1].includes('|')) {
        const parts = lines[1].split('|').map(s => s.trim());
        buttonLabel = parts[0] || '';
        buttonLink = parts[1] || '';
      } else {
        buttonLabel = lines[1];
      }
    }

    return { label, buttonLabel, buttonLink };
  }

  /** Item text: title | description */
  function parseItemText(text) {
    const parts = parseParts(text);
    return {
      title: parts[0] || '',
      description: parts[1] || ''
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
    const parsed = parseGroupContent(groupTr.content ?? groupTr.Content ?? '');
    const title = (groupTr.title ?? groupTr.Title ?? '').trim();
    if (!parsed.label && !title) return '';

    return `
      <div class="home-experience__header-inner">
        ${parsed.label ? `<p class="home-experience__label">${escapeHtml(parsed.label)}</p>` : ''}
        ${title ? `<h2 class="home-experience__title">${escapeHtml(title)}</h2>` : ''}
      </div>`;
  }

  function renderFooter(groupTr) {
    const parsed = parseGroupContent(groupTr?.content ?? groupTr?.Content ?? '');
    if (!parsed.buttonLabel) return '';

    if (parsed.buttonLink) {
      return `<a href="${escapeHtml(parsed.buttonLink)}" class="home-experience__cta">${escapeHtml(parsed.buttonLabel)}</a>`;
    }
    return `<span class="home-experience__cta home-experience__cta--static">${escapeHtml(parsed.buttonLabel)}</span>`;
  }

  function renderCard(item, langCode, index, total) {
    const tr = pickTranslation(item.translations || item.Translations || [], langCode);
    const text = (tr?.text ?? tr?.Text ?? '').trim();
    const parsed = parseItemText(text);
    if (!parsed.title) return '';

    const icon = item.icon ?? item.Icon ?? '';
    const isWideMobile = total % 2 === 1 && index === total - 1;
    const wideClass = isWideMobile ? ' home-experience__card--wide' : '';
    const iconHtml = `<div class="home-experience__icon-wrap">${renderIcon(icon)}</div>`;
    const bodyHtml = `
      <h3 class="home-experience__card-title">${escapeHtml(parsed.title)}</h3>
      ${parsed.description ? `<p class="home-experience__card-text">${escapeHtml(parsed.description)}</p>` : ''}`;

    if (isWideMobile) {
      return `
        <article class="home-experience__card${wideClass}">
          <div class="home-experience__card-wide-inner">
            ${iconHtml}
            <div class="home-experience__card-body">${bodyHtml}</div>
          </div>
        </article>`;
    }

    return `
      <article class="home-experience__card${wideClass}">
        ${iconHtml}
        ${bodyHtml}
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
    const section = document.getElementById('homeExperienceSection');
    const headerEl = document.getElementById('homeExperienceHeader');
    const cardsEl = document.getElementById('homeExperienceCards');
    const footerEl = document.getElementById('homeExperienceFooter');
    if (!section || !headerEl || !cardsEl || !footerEl) return false;

    const groupTr = pickGroupTranslation(featureList, langCode);
    const items = sortItems(featureList.items || featureList.Items || []);
    const cards = items
      .map((item, index) => renderCard(item, langCode, index, items.length))
      .filter(Boolean);

    if (!cards.length) return false;

    headerEl.innerHTML = renderHeader(groupTr);
    cardsEl.innerHTML = cards.join('');

    const footerHtml = renderFooter(groupTr);
    if (footerHtml) {
      footerEl.innerHTML = footerHtml;
      footerEl.classList.remove('d-none');
    } else {
      footerEl.innerHTML = '';
      footerEl.classList.add('d-none');
    }

    return true;
  }

  async function loadHomeExperience() {
    const section = document.getElementById('homeExperienceSection');
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

  document.addEventListener('DOMContentLoaded', loadHomeExperience);
  window.addEventListener('languageChanged', loadHomeExperience);
})();
