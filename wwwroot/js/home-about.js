/* Homepage about section — HOME_ABOUT block from Portal API */
(function () {
  'use strict';

  const BLOCK_CODE = 'HOME_ABOUT';
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

  function parseAboutContent(html) {
    const result = {
      label: '',
      title: '',
      bodyHtml: '',
      statValue: '',
      statLabel: ''
    };

    if (!html || !String(html).trim()) return result;

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const labelEl = doc.querySelector('.home-about-label, [data-about="label"]');
    const titleEl = doc.querySelector('h1, h2, h3');
    const statEl = doc.querySelector('.home-about-stat, [data-about="stat"]');

    result.label = (labelEl?.textContent || '').trim();
    result.title = (titleEl?.textContent || '').trim();

    if (statEl) {
      result.statValue = (
        statEl.querySelector('.home-about-stat__value, [data-stat="value"]')?.textContent
        || statEl.getAttribute('data-value')
        || ''
      ).trim();
      result.statLabel = (
        statEl.querySelector('.home-about-stat__label, [data-stat="label"]')?.textContent
        || statEl.getAttribute('data-label')
        || ''
      ).trim();
      statEl.remove();
    }

    // Pull chrome fields out; keep remaining CMS/Quill HTML for block rendering
    labelEl?.remove();
    titleEl?.remove();

    result.bodyHtml = (doc.body.innerHTML || '').trim();

    if (!result.title && !result.bodyHtml) {
      const fallback = (doc.body.textContent || '').trim();
      if (fallback) {
        result.bodyHtml = `<p>${escapeHtml(fallback)}</p>`;
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

  function renderCta(btn) {
    const title = (btn?.title || '').trim();
    const link = (btn?.link || '').trim();
    if (!title || !link) return '';
    const label = title.includes('→') ? title : `${title} →`;
    return `<a href="${escapeHtml(link)}" class="home-about__cta">${escapeHtml(label)}</a>`;
  }

  function renderAbout(block, translation) {
    const contentEl = document.getElementById('homeAboutContent');
    const mediaEl = document.getElementById('homeAboutMedia');
    if (!contentEl || !mediaEl) return false;

    const parsed = parseAboutContent(translation.htmlContent || translation.HtmlContent || '');
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

    const hasText = parsed.label || parsed.title || parsed.bodyHtml;
    const imageUrl = mediaUrl(block.background || block.Background || '');
    if (!hasText && !imageUrl) return false;

    contentEl.innerHTML = `
      ${parsed.label ? `<p class="home-about__label">${escapeHtml(parsed.label)}</p>` : ''}
      ${parsed.title ? `<h2 class="home-about__title">${escapeHtml(parsed.title)}</h2>` : ''}
      ${parsed.title || parsed.label ? '<div class="home-about__gold-bar" aria-hidden="true"></div>' : ''}
      ${parsed.bodyHtml ? `<div class="home-about__text content-body">${parsed.bodyHtml}</div>` : ''}
      ${renderCta(ctaBtn)}`;

    if (typeof window.initEmbeddedMedia === 'function') {
      window.initEmbeddedMedia(contentEl);
    }

    if (imageUrl) {
      mediaEl.innerHTML = `
        <div class="home-about__frame">
          <img class="home-about__img" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(parsed.title || parsed.label || 'Giới thiệu')}" loading="lazy" />
          ${statValue ? `
            <div class="home-about__stat">
              <p class="home-about__stat-value">${escapeHtml(statValue)}</p>
              ${statLabel ? `<p class="home-about__stat-label">${escapeHtml(statLabel)}</p>` : ''}
            </div>` : ''}
        </div>`;
    } else {
      mediaEl.innerHTML = '';
    }

    return true;
  }

  async function loadHomeAbout() {
    const section = document.getElementById('homeAboutSection');
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

      if (renderAbout(block, translation)) {
        section.classList.remove('d-none');
      } else {
        section.classList.add('d-none');
      }
    } catch {
      section.classList.add('d-none');
    }
  }

  document.addEventListener('DOMContentLoaded', loadHomeAbout);
  window.addEventListener('languageChanged', loadHomeAbout);
})();
