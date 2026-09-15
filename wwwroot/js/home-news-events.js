/* Homepage news & events — featured articles (same API as article list page) */
(function () {
  'use strict';

  const FEATURED_LIMIT = 3;
  const FEATURED_GLOBAL_API = '/api/Portal/articles/featured';

  let pageTranslations = {};
  let defaultLang = 'vi';
  let articleMenuId = null;
  let articleListUrl = '';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function t(key) {
    const lang = (localStorage.getItem('selectedLanguage') || defaultLang).toLowerCase();
    const langPack = pageTranslations[lang] || pageTranslations[defaultLang] || {};
    return langPack[key] || key;
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

  function pickMenuTranslation(menu, langCode) {
    return pickTranslation(menu.translations || menu.Translations || [], langCode);
  }

  function flattenMenus(menus) {
    const flat = [];
    function walk(items) {
      (items || []).forEach(item => {
        flat.push(item);
        walk(item.children || item.Children);
      });
    }
    walk(Array.isArray(menus) ? menus : []);
    return flat;
  }

  function resolveMenuPageHref(menu, langCode) {
    if (!menu) return '';

    const tr = pickMenuTranslation(menu, langCode);
    const urlSlug = (tr?.urlSlug || tr?.UrlSlug || '').trim();
    const urlSlugLower = urlSlug.toLowerCase();
    const linkType = (menu.linkType || menu.LinkType || 'internal').toLowerCase();
    const linkTarget = (menu.linkTarget || menu.LinkTarget || '').trim();
    const linkTargetLower = linkTarget.toLowerCase();
    const useLink = menu.useLink === true || menu.UseLink === true;
    const isHomePage = menu.isHomePage === true || menu.IsHomePage === true;
    const showSinglePost = menu.showSinglePost === true || menu.ShowSinglePost === true;

    if (isHomePage) return '/';

    if (useLink && linkTarget) {
      if (linkType === 'external' && /^https?:\/\//i.test(linkTarget)) return linkTarget;
      if (linkTarget.startsWith('/')) return linkTarget;
      return '/' + linkTarget;
    }

    if (showSinglePost || menu.singlePostId || menu.SinglePostId) return '';

    if (linkTargetLower === 'contact' || urlSlugLower === 'contact') return '/contact';
    if (urlSlugLower === 'gallery' || urlSlugLower === 'album'
      || linkTargetLower === 'gallery' || linkTargetLower === 'album') return '/gallery';
    if (urlSlugLower === 'events' || urlSlugLower === 'su-kien' || urlSlugLower === 'lich-su-kien'
      || linkTargetLower === 'events' || linkTargetLower === 'su-kien') return '/events';
    if (linkType === 'external' && urlSlug) return urlSlug;
    if (urlSlug) return '/page/' + urlSlug;
    return '';
  }

  function findMenuHrefById(menus, menuId, langCode) {
    if (!menuId) return '';
    const flat = flattenMenus(menus);
    const menu = flat.find(item => String(item.id || item.Id || '') === String(menuId));
    return resolveMenuPageHref(menu, langCode);
  }

  function resolveArticleMenu(menus, langCode) {
    const flat = flattenMenus(menus);
    const candidates = flat.filter(menu => {
      if (menu.showSinglePost || menu.ShowSinglePost || menu.singlePostId || menu.SinglePostId) return false;
      const href = resolveMenuPageHref(menu, langCode);
      return href.startsWith('/page/') || href.startsWith('/events');
    });

    const preferred = candidates.find(menu => {
      const tr = pickMenuTranslation(menu, langCode);
      const slug = (tr?.urlSlug || tr?.UrlSlug || '').toLowerCase();
      const title = (tr?.title || tr?.Title || '').toLowerCase();
      const target = (menu.linkTarget || menu.LinkTarget || '').toLowerCase();
      return /tin-tuc|tintuc|news|bai-viet|article|su-kien|event/.test(slug + ' ' + target)
        || /tin tức|news|bài viết|sự kiện/.test(title);
    });

    const chosen = preferred || candidates[0];
    if (!chosen) return { menuId: null, listUrl: '' };

    return {
      menuId: chosen.id || chosen.Id || null,
      listUrl: resolveMenuPageHref(chosen, langCode)
    };
  }

  async function fetchPrimaryMenus(langCode) {
    const res = await fetch(`/api/Api/menus/primary?langCode=${encodeURIComponent(langCode)}`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) return null;
    return res.json();
  }

  async function resolveArticleMenuContext(langCode) {
    let menus = null;

    try {
      const saved = localStorage.getItem('menuData');
      if (saved) menus = JSON.parse(saved);
    } catch {
      /* ignore */
    }

    if (!menus || !menus.length) {
      menus = await fetchPrimaryMenus(langCode);
    }

    if (!menus || !menus.length) {
      return { menuId: null, listUrl: '' };
    }

    const parsed = resolveArticleMenu(menus, langCode);
    if (parsed.menuId && !parsed.listUrl) {
      parsed.listUrl = findMenuHrefById(menus, parsed.menuId, langCode);
    }
    return parsed;
  }

  async function loadFeaturedArticles(menuId) {
    const endpoint = menuId
      ? `/api/Portal/articles/menu/${encodeURIComponent(menuId)}/featured?limit=${FEATURED_LIMIT}`
      : `${FEATURED_GLOBAL_API}?limit=${FEATURED_LIMIT}`;

    const res = await fetch(endpoint, { headers: { Accept: 'application/json' } });
    if (!res.ok) return [];

    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (data.items && Array.isArray(data.items)) return data.items;
    return [];
  }

  function stripHtml(html) {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return (temp.textContent || temp.innerText || '').trim();
  }

  function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function getArticleLink(item, translation) {
    const urlSlug = translation?.urlSlug || translation?.UrlSlug || '';
    return `/article/${encodeURIComponent(urlSlug || 'article')}`;
  }

  function renderCard(item, langCode) {
    const tr = pickTranslation(item.translations || item.Translations || [], langCode);
    if (!tr) return '';

    const title = (tr.title || tr.Title || '').trim();
    if (!title) return '';

    const summary = stripHtml(
      tr.summary || tr.Summary ||
      tr.description || tr.Description ||
      tr.content || tr.Content || ''
    );
    const image = item.image || item.Image || '';
    const link = getArticleLink(item, tr);
    const date = formatDate(item.dateModified || item.DateModified || item.dateAdd || item.DateAdd);
    const readMore = t('homeNewsReadMore') || t('featuredViewMore') || 'XEM THÊM →';

    return `
      <article class="home-news-events__card">
        ${image ? `
          <a href="${escapeHtml(link)}" class="home-news-events__media-link">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" class="home-news-events__image" loading="lazy" onerror="this.closest('.home-news-events__media-link').style.display='none'">
          </a>` : ''}
        <div class="home-news-events__body">
          ${date ? `<time class="home-news-events__date" datetime="${escapeHtml(String(item.dateModified || item.dateAdd || ''))}">${escapeHtml(date)}</time>` : ''}
          <h3 class="home-news-events__card-title">
            <a href="${escapeHtml(link)}">${escapeHtml(title)}</a>
          </h3>
          ${summary ? `<p class="home-news-events__excerpt">${escapeHtml(summary)}</p>` : ''}
          <a href="${escapeHtml(link)}" class="home-news-events__read-more">${escapeHtml(readMore)}</a>
        </div>
      </article>`;
  }

  function updateHeader() {
    const labelEl = document.getElementById('homeNewsEventsLabel');
    const titleEl = document.getElementById('homeNewsEventsTitle');
    const allBtn = document.getElementById('homeNewsEventsAllBtn');

    if (labelEl) labelEl.textContent = t('homeNewsEventsLabel') || 'TIN TỨC & SỰ KIỆN';
    if (titleEl) titleEl.textContent = t('homeNewsEventsTitle') || 'Cập nhật mới nhất';
    if (allBtn) {
      allBtn.textContent = t('homeNewsEventsViewAll') || 'XEM TẤT CẢ TIN TỨC';
      const href = (articleListUrl || '').trim();
      if (href && href !== '#') {
        allBtn.href = href;
        allBtn.classList.remove('d-none');
      } else {
        allBtn.removeAttribute('href');
        allBtn.classList.add('d-none');
      }
    }
  }

  async function loadHomeNewsEvents() {
    const section = document.getElementById('homeNewsEventsSection');
    const gridEl = document.getElementById('homeNewsEventsGrid');
    if (!section || !gridEl) return;

    const langCode = localStorage.getItem('selectedLanguage') || defaultLang;
    updateHeader();

    try {
      const menuContext = await resolveArticleMenuContext(langCode);
      articleMenuId = menuContext.menuId;
      articleListUrl = menuContext.listUrl;

      let items = await loadFeaturedArticles(articleMenuId);
      if (!items.length && articleMenuId) {
        items = await loadFeaturedArticles(null);
      }

      // Nếu có bài từ menu featured mà chưa có link list, lấy lại href theo menuId
      if (articleMenuId && !articleListUrl) {
        try {
          const saved = localStorage.getItem('menuData');
          const menus = saved ? JSON.parse(saved) : await fetchPrimaryMenus(langCode);
          articleListUrl = findMenuHrefById(menus, articleMenuId, langCode);
        } catch {
          /* ignore */
        }
      }

      const published = items.filter(item => item.published === true || item.Published === true);
      const cards = published
        .slice(0, FEATURED_LIMIT)
        .map(item => renderCard(item, langCode))
        .filter(Boolean);

      updateHeader();

      if (!cards.length) {
        section.classList.add('d-none');
        gridEl.innerHTML = '';
        return;
      }

      gridEl.innerHTML = cards.join('');
      section.classList.remove('d-none');
    } catch {
      section.classList.add('d-none');
      gridEl.innerHTML = '';
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await loadTranslations();
    await loadHomeNewsEvents();
  });

  window.addEventListener('languageChanged', loadHomeNewsEvents);
  window.addEventListener('menuLoaded', loadHomeNewsEvents);
})();
