/* Homepage explore CTA — HOME_KHAMPHA block from Portal API */
(function () {
  'use strict';

  const BLOCK_CODE = 'HOME_KHAMPHA';
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

  function parseKhamPhaContent(html) {
    const result = { titleLine1: '', titleLine2: '', paragraphs: [] };
    if (!html || !String(html).trim()) return result;

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const headings = doc.querySelectorAll('h1, h2, h3');

    result.titleLine1 = (headings[0]?.textContent || '').trim();
    result.titleLine2 = (headings[1]?.textContent || '').trim();

    doc.querySelectorAll('p').forEach(p => {
      const text = (p.textContent || '').trim();
      if (text) result.paragraphs.push(text);
    });

    if (!result.titleLine1 && !result.titleLine2 && !result.paragraphs.length) {
      const fallback = doc.body.textContent?.trim();
      if (fallback) result.paragraphs.push(fallback);
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

  function renderButton(btn, variant) {
    const title = (btn?.title || '').trim();
    const link = (btn?.link || '').trim();
    if (!title) return '';

    const className = variant === 'outline'
      ? 'home-khampha__btn home-khampha__btn--outline'
      : 'home-khampha__btn home-khampha__btn--primary';

    if (link) {
      return `<a href="${escapeHtml(link)}" class="${className}">${escapeHtml(title)}</a>`;
    }
    return `<span class="${className} home-khampha__btn--static">${escapeHtml(title)}</span>`;
  }

  function renderOrnament() {
    return `
      <div class="home-khampha__ornament" aria-hidden="true">
        <span class="home-khampha__ornament-line"></span>
        <span class="home-khampha__ornament-diamond"></span>
        <span class="home-khampha__ornament-line"></span>
      </div>`;
  }

  function renderSection(block, translation) {
    const bgEl = document.getElementById('homeKhamPhaBg');
    const innerEl = document.getElementById('homeKhamPhaInner');
    if (!bgEl || !innerEl) return false;

    const parsed = parseKhamPhaContent(translation.htmlContent || translation.HtmlContent || '');
    const primaryBtn = resolveButton(translation, 0);
    const outlineBtn = resolveButton(translation, 1);
    const imageUrl = mediaUrl(block.background || block.Background || '');
    const altText = parsed.titleLine1 || parsed.titleLine2 || 'Khám phá';

    const hasText = parsed.titleLine1 || parsed.titleLine2 || parsed.paragraphs.length > 0;
    const hasButtons = (primaryBtn.title || outlineBtn.title);
    if (!hasText && !hasButtons && !imageUrl) return false;

    bgEl.innerHTML = imageUrl
      ? `<img class="home-khampha__img" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(altText)}" loading="lazy" /><div class="home-khampha__overlay"></div>`
      : '<div class="home-khampha__overlay home-khampha__overlay--solid"></div>';

    const buttonsHtml = [renderButton(primaryBtn, 'primary'), renderButton(outlineBtn, 'outline')]
      .filter(Boolean)
      .join('');

    innerEl.innerHTML = `
      ${renderOrnament()}
      ${parsed.titleLine1 ? `<h2 class="home-khampha__title">${escapeHtml(parsed.titleLine1)}</h2>` : ''}
      ${parsed.titleLine2 ? `<h2 class="home-khampha__title home-khampha__title--accent">${escapeHtml(parsed.titleLine2)}</h2>` : ''}
      ${parsed.paragraphs.map(p => `<p class="home-khampha__text">${escapeHtml(p)}</p>`).join('')}
      ${buttonsHtml ? `<div class="home-khampha__actions">${buttonsHtml}</div>` : ''}`;

    return true;
  }

  async function loadHomeKhamPha() {
    const section = document.getElementById('homeKhamPhaSection');
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
        section.classList.remove('d-none');
      } else {
        section.classList.add('d-none');
      }
    } catch {
      section.classList.add('d-none');
    }
  }

  document.addEventListener('DOMContentLoaded', loadHomeKhamPha);
  window.addEventListener('languageChanged', loadHomeKhamPha);
})();
