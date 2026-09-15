/* Article list — BLOCK_TOCHUCSUKIEN block from Portal API */
(function () {
  'use strict';

  const BLOCK_CODE = 'BLOCK_TOCHUCSUKIEN';
  const API_URL = '/api/Portal/blocks/code/' + encodeURIComponent(BLOCK_CODE);

  function isBlockEnabled(block) {
    if (!block) return false;
    if (block.deleted === true || block.Deleted === true) return false;
    const enabled = block.enabled ?? block.Enabled;
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

  function mediaUrl(url) {
    if (!url) return '';
    const value = String(url).trim();
    if (/^https?:\/\//i.test(value) || value.startsWith('/')) return value;
    return value.startsWith('//') ? `https:${value}` : value;
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

  function parseEventOrgContent(html) {
    const result = {
      label: '',
      title: '',
      paragraphs: [],
      tags: [],
      note: '',
      statValue: '',
      statLabel: ''
    };

    if (!html || !String(html).trim()) return result;

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const labelEl = doc.querySelector('.article-event-label, [data-event="label"]');
    const titleEl = doc.querySelector('h1, h2, h3');
    const noteEl = doc.querySelector('.article-event-note, [data-event="note"]');
    const tagsEl = doc.querySelector('.article-event-tags, [data-event="tags"]');
    const statEl = doc.querySelector('.article-event-stat, [data-event="stat"]');

    result.label = (labelEl?.textContent || '').trim();
    result.title = (titleEl?.textContent || '').trim();
    result.note = (noteEl?.textContent || '').trim();

    if (tagsEl) {
      tagsEl.querySelectorAll('span, li').forEach(el => {
        const text = (el.textContent || '').trim();
        if (text) result.tags.push(text);
      });
      if (!result.tags.length) {
        const raw = (tagsEl.textContent || '').trim();
        if (raw.includes(',')) {
          result.tags = raw.split(',').map(s => s.trim()).filter(Boolean);
        } else if (raw) {
          result.tags.push(raw);
        }
      }
    }

    if (statEl) {
      result.statValue = (
        statEl.querySelector('[data-stat="value"], .article-event-stat__value')?.textContent
        || statEl.getAttribute('data-value')
        || ''
      ).trim();
      result.statLabel = (
        statEl.querySelector('[data-stat="label"], .article-event-stat__label')?.textContent
        || statEl.getAttribute('data-label')
        || ''
      ).trim();
    }

    doc.querySelectorAll('p').forEach(p => {
      if (p === labelEl || p === noteEl) return;
      if (p.closest('.article-event-tags, .article-event-stat, [data-event="tags"], [data-event="stat"]')) return;
      const text = (p.textContent || '').trim();
      if (text) result.paragraphs.push(text);
    });

    if (!result.title) {
      const fallback = doc.body.textContent?.trim();
      if (fallback && !result.paragraphs.length) {
        result.paragraphs.push(fallback);
      }
    }

    return result;
  }

  function resolveButton(translation, index) {
    const buttons = translation.buttons || translation.Buttons || [];
    if (buttons[index]) {
      return {
        title: buttons[index].title || buttons[index].Title || '',
        link: buttons[index].link || buttons[index].Link || ''
      };
    }
    if (index === 0) {
      return {
        title: translation.button1Title || translation.Button1Title || '',
        link: translation.button1Link || translation.Button1Link || ''
      };
    }
    return {
      title: translation.button2Title || translation.Button2Title || '',
      link: translation.button2Link || translation.Button2Link || ''
    };
  }

  function renderTags(tags) {
    if (!tags.length) return '';
    return `
      <div class="article-event-org__tags">
        ${tags.map(tag => `<span class="article-event-org__tag">${escapeHtml(tag)}</span>`).join('')}
      </div>`;
  }

  function renderCta(btn) {
    const title = (btn?.title || '').trim();
    const link = (btn?.link || '').trim();
    if (!title) return '';

    const inner = `${escapeHtml(title)} <i class="bi bi-chevron-right" aria-hidden="true"></i>`;
    if (link) {
      return `<a href="${escapeHtml(link)}" class="article-event-org__cta">${inner}</a>`;
    }
    return `<span class="article-event-org__cta article-event-org__cta--static">${inner}</span>`;
  }

  function renderSection(block, translation) {
    const contentEl = document.getElementById('articleEventOrgContent');
    const mediaEl = document.getElementById('articleEventOrgMedia');
    if (!contentEl || !mediaEl) return false;

    const parsed = parseEventOrgContent(translation.htmlContent || translation.HtmlContent || '');
    const ctaBtn = resolveButton(translation, 0);
    const statBtn = resolveButton(translation, 1);

    let statValue = parsed.statValue;
    let statLabel = parsed.statLabel;
    if (!statValue && statBtn.title) {
      if (statBtn.title.includes('|')) {
        const parts = statBtn.title.split('|').map(s => s.trim());
        statValue = parts[0] || '';
        statLabel = parts[1] || statBtn.link || '';
      } else {
        statValue = statBtn.title;
        statLabel = statBtn.link || '';
      }
    }

    const imageUrl = mediaUrl(block.background || block.Background || '');
    const hasText = parsed.label || parsed.title || parsed.paragraphs.length > 0 || parsed.tags.length > 0;
    if (!hasText && !imageUrl && !ctaBtn.title) return false;

    contentEl.innerHTML = `
      ${parsed.label ? `<p class="article-event-org__label">${escapeHtml(parsed.label)}</p>` : ''}
      ${parsed.label || parsed.title ? '<div class="article-event-org__gold-bar" aria-hidden="true"></div>' : ''}
      ${parsed.title ? `<h2 class="article-event-org__title">${escapeHtml(parsed.title)}</h2>` : ''}
      ${parsed.paragraphs.map(p => `<p class="article-event-org__text">${escapeHtml(p)}</p>`).join('')}
      ${renderTags(parsed.tags)}
      ${parsed.note ? `<p class="article-event-org__note">${escapeHtml(parsed.note)}</p>` : ''}
      ${renderCta(ctaBtn)}`;

    if (imageUrl) {
      mediaEl.innerHTML = `
        <div class="article-event-org__frame">
          <img class="article-event-org__img" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(parsed.title || parsed.label || 'Sự kiện')}" loading="lazy" />
          ${statValue ? `
            <div class="article-event-org__stat">
              <p class="article-event-org__stat-value">${escapeHtml(statValue)}</p>
              ${statLabel ? `<p class="article-event-org__stat-label">${escapeHtml(statLabel)}</p>` : ''}
            </div>` : ''}
        </div>`;
    } else {
      mediaEl.innerHTML = '';
    }

    return true;
  }

  async function loadArticleEventOrg() {
    const section = document.getElementById('articleEventOrgSection');
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

      const block = await res.json();
      if (!isBlockEnabled(block)) {
        section.classList.add('d-none');
        return;
      }

      const translation = pickTranslation(block.translations || block.Translations || [], langCode);
      if (!translation) {
        section.classList.add('d-none');
        return;
      }

      if (renderSection(block, translation)) {
        if (section.dataset.allowDisplay === 'true') {
          section.classList.remove('d-none');
        }
      } else {
        section.classList.add('d-none');
      }
    } catch {
      section.classList.add('d-none');
    }
  }

  document.addEventListener('DOMContentLoaded', loadArticleEventOrg);
  window.addEventListener('languageChanged', loadArticleEventOrg);
})();
