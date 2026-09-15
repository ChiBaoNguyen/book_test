/* Homepage image gallery â€” same load/render as Gallery page (5 image albums) */
(function () {
  'use strict';

  const ALBUM_TYPE = 'image';
  const PAGE_SIZE = 5;
  const HERITAGE_ALBUM_CODE = 'heritage-gallery';
  const API_URL = '/api/Portal/gallery/albums';
  const GALLERY_BASE = '/gallery';

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

  function t(key, fallback) {
    const lang = (localStorage.getItem('selectedLanguage') || defaultLang).toLowerCase();
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
    const value = String(url).trim();
    if (/^https?:\/\//i.test(value) || value.startsWith('/')) return value;
    return value.startsWith('//') ? `https:${value}` : value;
  }

  function getAlbumTitle(album, langCode) {
    const tr = pickTranslation(album.translations || album.Translations || [], langCode);
    return (tr?.title || tr?.Title || album.albumCode || album.AlbumCode || '').trim();
  }

  function getAlbumCover(album) {
    const cover = album.coverImage || album.CoverImage || '';
    return mediaUrl(cover) || '/img/placeholder-gallery.jpg';
  }

  function albumDetailUrl(code) {
    if (!code) return GALLERY_BASE;
    return `${GALLERY_BASE}/${encodeURIComponent(code)}`;
  }

  function albumItemCountLabel(album) {
    const count = album.itemCount ?? album.ItemCount ?? 0;
    return `${count} áº£nh`;
  }

  function albumOverlayIcon() {
    return 'bi-images';
  }

  async function loadAlbums() {
    const params = new URLSearchParams({
      pageNumber: '1',
      pageSize: String(PAGE_SIZE),
      albumType: ALBUM_TYPE,
      excludeCode: HERITAGE_ALBUM_CODE
    });

    const res = await fetch(`${API_URL}?${params}`, {
      headers: { Accept: 'application/json' }
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  function setGridLoading(gridEl) {
    if (!gridEl) return;
    gridEl.innerHTML = '<div class="gallery-loading"><div class="spinner-border spinner-border-sm text-warning" role="status"></div></div>';
  }

  function renderAlbumCard(album, langCode, large) {
    const code = album.albumCode || album.AlbumCode || '';
    const title = getAlbumTitle(album, langCode);
    const countLabel = albumItemCountLabel(album);
    const img = getAlbumCover(album);
    const icon = albumOverlayIcon(album);

    return `
      <a href="${escapeHtml(albumDetailUrl(code))}" class="gallery-album-card${large ? ' gallery-album-card--large' : ''}">
        <div class="gallery-album-card__frame">
          <img class="gallery-album-card__img" src="${escapeHtml(img)}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.src='/img/placeholder-gallery.jpg'" />
        </div>
        <div class="gallery-album-card__overlay">
          <div class="gallery-album-card__cta">
            <span class="gallery-album-card__cta-icon"><i class="bi ${icon}"></i></span>
            <span>XEM ALBUM</span>
          </div>
        </div>
        <div class="gallery-album-card__info">
          <p class="gallery-album-card__title">${escapeHtml(title)}</p>
          <p class="gallery-album-card__meta">${escapeHtml(countLabel)}</p>
        </div>
      </a>`;
  }

  function renderAlbumGrid(gridEl, albums, langCode) {
    if (!gridEl) return;

    const list = albums || [];
    if (!list.length) {
      gridEl.innerHTML = '<p class="gallery-empty">ChÆ°a cÃ³ album.</p>';
      return;
    }

    gridEl.innerHTML = list.map((album, i) => renderAlbumCard(album, langCode, i === 0)).join('');
  }

  function updateLabels() {
    const titleEl = document.getElementById('homeGalleryTitle');
    const ctaEl = document.getElementById('homeGalleryCta');
    if (titleEl) {
      titleEl.textContent = t('homeGalleryTitle', 'THÆ¯ VIá»†N HÃŒNH áº¢NH');
    }
    if (ctaEl) {
      const label = t('homeGalleryCta', 'XEM THÃŠM áº¢NH');
     // ctaEl.textContent = label.includes('â†’') ? label : `${label} â†’`;
     ctaEl.textContent = label.includes('â†’') ? label : label;
    }
  }

  async function loadHomeGallery() {
    const section = document.getElementById('homeGallerySection');
    const gridEl = document.getElementById('homeGalleryAlbums');
    if (!section || !gridEl) return;

    const langCode = localStorage.getItem('selectedLanguage') || defaultLang;
    updateLabels();
    setGridLoading(gridEl);

    try {
      const data = await loadAlbums();
      const albums = data.items || data.Items || [];

      if (!albums.length) {
        section.classList.add('d-none');
        return;
      }

      renderAlbumGrid(gridEl, albums, langCode);
      section.classList.remove('d-none');
    } catch (err) {
      gridEl.innerHTML = '<p class="gallery-empty">KhÃ´ng táº£i Ä‘Æ°á»£c dá»¯ liá»‡u.</p>';
      section.classList.add('d-none');
    }
  }

  document.addEventListener('DOMContentLoaded', async () => {
    await loadTranslations();
    await loadHomeGallery();
  });

  window.addEventListener('languageChanged', loadHomeGallery);
})();
