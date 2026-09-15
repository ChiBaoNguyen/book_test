(function () {
  'use strict';

  const cfg = window.GALLERY_PAGE || {};
  const API = '/api/Portal/gallery';
  let langCode = (localStorage.getItem('selectedLanguage') || 'vi').toLowerCase();

  function getMenuTitleForLang(targetLang) {
    try {
      const raw = localStorage.getItem('currentMenuMatch');
      if (raw) {
        const menu = JSON.parse(raw);
        const translations = menu.translations || menu.Translations || [];
        if (Array.isArray(translations) && translations.length) {
          const lang = (targetLang || 'vi').toLowerCase();
          let translation = translations.find(t =>
            (t.languageCode || t.LanguageCode || '').toLowerCase() === lang
          );
          if (!translation && lang.length >= 2) {
            translation = translations.find(t =>
              (t.languageCode || t.LanguageCode || '').toLowerCase().substring(0, 2) === lang.substring(0, 2)
            );
          }
          translation = translation || translations[0];
          const title = translation?.title || translation?.Title;
          if (title) return title;
        }
      }
    } catch { /* ignore */ }
    return cfg.initialPageTitle || 'ThÆ° viá»‡n áº£nh';
  }

  function getCurrentMenuIcon() {
    try {
      const raw = localStorage.getItem('currentMenuMatch');
      if (raw) {
        const menu = JSON.parse(raw);
        return menu.icon || menu.Icon || '';
      }
    } catch { /* ignore */ }
    return '';
  }

  function buildMenuLabelHtml() {
    const title = getMenuTitleForLang(langCode);
    const display = escapeHtml((title || cfg.initialPageTitle || 'ThÆ° viá»‡n áº£nh').toUpperCase());
    const icon = getCurrentMenuIcon();
    let iconHtml = '';
    if (icon && /\bcil\b/i.test(icon)) {
      iconHtml = `<i class="${escapeHtml(icon)} page-menu-label-icon" aria-hidden="true"></i>`;
    }
    return `<p class="page-menu-label">${iconHtml}<span>${display}</span></p>`;
  }

  function updateGallerySectionHeader() {
    const headerEl = document.getElementById('gallerySectionHeader');
    if (headerEl) headerEl.innerHTML = buildMenuLabelHtml();

    const menuTitle = getMenuTitleForLang(langCode);
    const siteName = document.title.includes(' - ')
      ? document.title.split(' - ').slice(1).join(' - ')
      : (document.title || '');
    if (menuTitle) document.title = siteName ? `${menuTitle} - ${siteName}` : menuTitle;
  }

  let lightboxItems = [];
  let lightboxIndex = 0;
  let lightboxProgressRaf = null;
  let lightboxProgressStart = 0;
  let lightboxProgressElapsed = 0;
  let lightboxProgressPaused = false;
  let lightboxIgnorePauseUntil = 0;
  let lightboxAutoplayEnabled = cfg.imageAutoplay !== false;
  const LIGHTBOX_AUTOPLAY_MS = Math.max(2000, cfg.imageAutoplayInterval || 4000);

  const ALBUM_PAGE_SIZE = 5;
  const DETAIL_PAGE_SIZE = Math.max(1, cfg.detailPageSize || 12);

  const albumSections = {
    image: {
      albumType: 'image',
      gridId: 'galleryImageAlbums',
      paginationId: 'galleryImagePagination',
      sectionId: 'galleryImageSection'
    },
    video: {
      albumType: 'video',
      gridId: 'galleryVideoAlbums',
      paginationId: 'galleryVideoPagination',
      sectionId: 'galleryVideosSection'
    },
    file3d: {
      albumType: 'file3d',
      gridId: 'gallery3dAlbums',
      paginationId: 'gallery3dPagination',
      sectionId: 'gallery3dSection'
    }
  };

  const albumPagination = {
    image: { page: 1, totalPages: 1, totalItems: 0 },
    video: { page: 1, totalPages: 1, totalItems: 0 },
    file3d: { page: 1, totalPages: 1, totalItems: 0 }
  };

  const detailSections = {
    image: {
      mediaType: 'image',
      gridId: 'galleryDetailImages',
      paginationId: 'galleryDetailImagesPagination',
      panelKey: 'image'
    },
    video: {
      mediaType: 'video',
      gridId: 'galleryDetailVideos',
      paginationId: 'galleryDetailVideosPagination',
      panelKey: 'video'
    },
    file3d: {
      mediaType: 'file3d',
      gridId: 'galleryDetail3d',
      paginationId: 'galleryDetail3dPagination',
      panelKey: 'file3d'
    }
  };

  const detailPagination = {
    image: { page: 1, totalPages: 1, totalItems: 0 },
    video: { page: 1, totalPages: 1, totalItems: 0 },
    file3d: { page: 1, totalPages: 1, totalItems: 0 }
  };

  const relatedAlbumSections = {
    image: {
      albumType: 'image',
      gridId: 'galleryRelatedImageAlbums',
      paginationId: 'galleryRelatedImagePagination',
      sectionId: 'galleryRelatedImageSection'
    },
    video: {
      albumType: 'video',
      gridId: 'galleryRelatedVideoAlbums',
      paginationId: 'galleryRelatedVideoPagination',
      sectionId: 'galleryRelatedVideoSection'
    },
    file3d: {
      albumType: 'file3d',
      gridId: 'galleryRelated3dAlbums',
      paginationId: 'galleryRelated3dPagination',
      sectionId: 'galleryRelated3dSection'
    }
  };

  const relatedAlbumPagination = {
    image: { page: 1, totalPages: 1, totalItems: 0 },
    video: { page: 1, totalPages: 1, totalItems: 0 },
    file3d: { page: 1, totalPages: 1, totalItems: 0 }
  };

  let detailActiveMediaType = 'image';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pickTranslation(translations) {
    const list = translations || [];
    if (!list.length) return null;
    const langOf = t => (t.languageCode || t.LanguageCode || '').toLowerCase();
    let tr = list.find(t => langOf(t) === langCode);
    if (!tr && langCode.length >= 2) {
      tr = list.find(t => {
        const code = langOf(t);
        return code.length >= 2 && code.substring(0, 2) === langCode.substring(0, 2);
      });
    }
    return tr || list[0];
  }

  function getItemTranslationText(translations) {
    const tr = pickTranslation(translations);
    if (!tr) return { title: '', description: '' };
    const title = (tr.title || tr.Title || '').trim();
    const description = (tr.caption || tr.Caption || '').trim();
    return { title, description };
  }

  function buildMediaCaptionHtml(title, description) {
    if (!title && !description) return '';
    let html = '';
    if (title) html += `<span class="gallery-caption__title">${escapeHtml(title)}</span>`;
    if (description) html += `<span class="gallery-caption__desc">${escapeHtml(description)}</span>`;
    return html;
  }

  function setMediaCaption(el, title, description) {
    if (!el) return;
    const html = buildMediaCaptionHtml(title, description);
    el.innerHTML = html;
    el.classList.toggle('is-empty', !html);
  }

  function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function secureMediaUrl(url) {
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

  function toBase64Url(value) {
    return btoa(unescape(encodeURIComponent(value)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  function mediaUrl(url) {
    return secureMediaUrl(url);
  }

  function getProxyUrl(cdnUrl) {
    if (!cdnUrl) return cdnUrl;
    try {
      const resolved = secureMediaUrl(cdnUrl);
      const parsed = new URL(resolved, window.location.origin);
      if (parsed.origin !== window.location.origin && !isYoutubeUrl(resolved)) {
        return `/api/Portal/proxy/video/b64/${toBase64Url(resolved)}`;
      }
      return resolved;
    } catch {
      return cdnUrl;
    }
  }

  function getAlbumTitle(album) {
    const tr = pickTranslation(album.translations);
    return (tr?.title || tr?.Title || album.albumCode || album.AlbumCode || '').trim();
  }

  function getAlbumCover(album) {
    const cover = album.coverImage || album.CoverImage || '';
    return mediaUrl(cover) || '/img/placeholder-gallery.jpg';
  }

  function albumItemCountLabel(album) {
    const count = album.itemCount ?? album.ItemCount ?? 0;
    const type = (album.albumType || album.AlbumType || 'image').toLowerCase();
    if (type === 'video') return `${count} video`;
    if (type === 'file3d') return `${count} mÃ´ hÃ¬nh 3D`;
    return `${count} áº£nh`;
  }

  function albumOverlayIcon(album) {
    const type = (album.albumType || album.AlbumType || 'image').toLowerCase();
    if (type === 'video') return 'bi-play-fill';
    if (type === 'file3d') return 'bi-box';
    return 'bi-images';
  }

  function albumDetailUrl(code) {
    if (!code) return cfg.galleryBaseUrl || '/gallery';
    return `${cfg.galleryBaseUrl || '/gallery'}/${encodeURIComponent(code)}`;
  }

  function renderAlbumCard(album, large) {
    const code = album.albumCode || album.AlbumCode || '';
    const title = getAlbumTitle(album);
    const countLabel = albumItemCountLabel(album);
    const img = getAlbumCover(album);
    const icon = albumOverlayIcon(album);

    return `
      <a href="${albumDetailUrl(code)}" class="gallery-album-card${large ? ' gallery-album-card--large' : ''}">
        <div class="gallery-album-card__frame">
          <img class="gallery-album-card__img" src="${escapeHtml(img)}" alt="${escapeHtml(title)}" loading="lazy" />
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

  function renderAlbumGrid(containerId, albums) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const list = albums || [];
    if (!list.length) {
      el.innerHTML = '<p class="gallery-empty">ChÆ°a cÃ³ album.</p>';
      return;
    }

    el.innerHTML = list.map((album, i) => renderAlbumCard(album, i === 0)).join('');
  }

  function renderImageGrid(containerId, images, syncLightbox) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!images.length) {
      el.innerHTML = '<p class="gallery-empty">ChÆ°a cÃ³ hÃ¬nh áº£nh.</p>';
      if (syncLightbox) lightboxItems = [];
      return;
    }
    el.innerHTML = images.map((item, index) => {
      const { title, description } = getItemTranslationText(item.translations);
      const src = mediaUrl(item.thumbnail || item.fileUrl);
      const hasInfo = title || description;
      return `
        <button type="button" class="gallery-media-item" data-lightbox-index="${index}">
          <img src="${escapeHtml(src)}" alt="${escapeHtml(title || description)}" loading="lazy" />
          ${hasInfo ? `
            <div class="gallery-media-item__info">
              ${title ? `<p class="gallery-media-item__label">${escapeHtml(title)}</p>` : ''}
              ${description ? `<p class="gallery-media-item__desc">${escapeHtml(description)}</p>` : ''}
            </div>` : ''}
        </button>`;
    }).join('');

    if (syncLightbox) {
      lightboxItems = images.map(item => {
        const { title, description } = getItemTranslationText(item.translations);
        return {
          src: mediaUrl(item.fileUrl || item.thumbnail),
          title,
          description
        };
      });
    }

    el.querySelectorAll('[data-lightbox-index]').forEach(btn => {
      btn.addEventListener('click', () => openLightbox(parseInt(btn.dataset.lightboxIndex, 10)));
    });
  }

  function renderVideoGrid(containerId, videos) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!videos.length) {
      el.innerHTML = '<p class="gallery-empty">ChÆ°a cÃ³ video.</p>';
      return;
    }
    el.innerHTML = videos.map((item, index) => renderVideoCard(item, index)).join('');
    bindVideoCards(el, videos);
  }

  function render3dGrid(containerId, models) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!models.length) {
      el.innerHTML = '<p class="gallery-empty">ChÆ°a cÃ³ mÃ´ hÃ¬nh 3D.</p>';
      return;
    }
    el.innerHTML = models.map((item, index) => render3dCard(item, index)).join('');
    bind3dCards(el, models);
  }

  async function apiGet(path) {
    const res = await fetch(path, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function loadAlbums(albumType, pageNumber, options = {}) {
    const params = new URLSearchParams({
      pageNumber: String(pageNumber || 1),
      pageSize: String(ALBUM_PAGE_SIZE)
    });
    if (albumType) params.set('albumType', albumType);

    const excludeCode = options.excludeCode
      ?? (options.forRelated && cfg.albumCode ? cfg.albumCode : (cfg.heritageAlbumCode || 'heritage-gallery'));
    if (excludeCode) params.set('excludeCode', excludeCode);

    return apiGet(`${API}/albums?${params}`);
  }

  function filterExcludedAlbums(albums) {
    const exclude = new Set([
      (cfg.heritageAlbumCode || 'heritage-gallery').toLowerCase(),
      (cfg.albumCode || '').toLowerCase()
    ].filter(Boolean));

    return (albums || []).filter(album => {
      const code = (album.albumCode || album.AlbumCode || '').toLowerCase();
      return code && !exclude.has(code);
    });
  }

  async function loadAlbumByCodeOrId(codeOrId, withLangFilter) {
    const langParam = withLangFilter
      ? `?langCode=${encodeURIComponent(langCode)}`
      : '';
    try {
      return await apiGet(`${API}/albums/code/${encodeURIComponent(codeOrId)}${langParam}`);
    } catch {
      return apiGet(`${API}/album/${encodeURIComponent(codeOrId)}${langParam}`);
    }
  }

  function setGridLoading(gridId) {
    const el = document.getElementById(gridId);
    if (el) {
      el.innerHTML = '<div class="gallery-loading"><div class="spinner-border spinner-border-sm text-warning" role="status"></div></div>';
    }
  }

  function buildAlbumPageButtons(currentPage, totalPages) {
    const buttons = [];
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
      buttons.push({ type: 'page', page: 1 });
      if (startPage > 2) buttons.push({ type: 'ellipsis' });
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push({ type: 'page', page: i });
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) buttons.push({ type: 'ellipsis' });
      buttons.push({ type: 'page', page: totalPages });
    }

    return buttons;
  }

  async function loadPublishedMedia(albumCode, mediaType, pageNumber, pageSize) {
    const params = new URLSearchParams({
      pageNumber: String(pageNumber || 1),
      pageSize: String(pageSize || DETAIL_PAGE_SIZE),
      albumCode: albumCode,
      albumType: mediaType
    });
    return apiGet(`${API}/images/published?${params}`);
  }

  function renderPaginationControls(containerId, sectionKey, currentPage, totalPages, onPageChange) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!totalPages || totalPages <= 1) {
      el.innerHTML = '';
      el.classList.add('d-none');
      return;
    }

    el.classList.remove('d-none');
    const buttons = buildAlbumPageButtons(currentPage, totalPages);

    const pagesHtml = buttons.map(btn => {
      if (btn.type === 'ellipsis') {
        return '<span class="gallery-album-pagination__ellipsis" aria-hidden="true">...</span>';
      }
      const isActive = btn.page === currentPage;
      return `<button type="button" class="gallery-album-pagination__page${isActive ? ' is-active' : ''}" data-page="${btn.page}" ${isActive ? 'aria-current="page"' : ''}>${btn.page}</button>`;
    }).join('');

    el.innerHTML = `
      <button type="button" class="gallery-album-pagination__nav" data-action="prev" ${currentPage <= 1 ? 'disabled' : ''}>
        <i class="bi bi-chevron-left" aria-hidden="true"></i> TrÆ°á»›c
      </button>
      ${pagesHtml}
      <button type="button" class="gallery-album-pagination__nav" data-action="next" ${currentPage >= totalPages ? 'disabled' : ''}>
        Tiáº¿p <i class="bi bi-chevron-right" aria-hidden="true"></i>
      </button>`;

    el.querySelector('[data-action="prev"]')?.addEventListener('click', () => {
      if (currentPage > 1) onPageChange(sectionKey, currentPage - 1);
    });
    el.querySelector('[data-action="next"]')?.addEventListener('click', () => {
      if (currentPage < totalPages) onPageChange(sectionKey, currentPage + 1);
    });
    el.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = parseInt(btn.getAttribute('data-page'), 10);
        if (!Number.isNaN(page) && page !== currentPage) onPageChange(sectionKey, page);
      });
    });
  }

  function renderPagination(containerId, sectionKey, currentPage, totalPages) {
    renderPaginationControls(containerId, sectionKey, currentPage, totalPages, goToAlbumPage);
  }

  function renderDetailPagination(containerId, sectionKey, currentPage, totalPages) {
    renderPaginationControls(containerId, sectionKey, currentPage, totalPages, goToDetailPage);
  }

  function renderRelatedPagination(containerId, sectionKey, currentPage, totalPages) {
    renderPaginationControls(containerId, sectionKey, currentPage, totalPages, (_key, page) => {
      goToRelatedAlbumPage(sectionKey, page);
    });
  }

  async function loadAlbumSection(sectionKey) {
    const section = albumSections[sectionKey];
    const state = albumPagination[sectionKey];
    if (!section || !state) return;

    setGridLoading(section.gridId);

    try {
      const data = await loadAlbums(section.albumType, state.page);
      const albums = data.items || [];
      state.totalPages = data.totalPages || 1;
      state.totalItems = data.totalItems || 0;

      renderAlbumGrid(section.gridId, albums);
      renderPagination(section.paginationId, sectionKey, state.page, state.totalPages);
      toggleSection(section.sectionId, state.totalItems > 0);
    } catch (err) {
      const gridEl = document.getElementById(section.gridId);
      if (gridEl) gridEl.innerHTML = '<p class="gallery-empty">KhÃ´ng táº£i Ä‘Æ°á»£c dá»¯ liá»‡u.</p>';
      document.getElementById(section.paginationId)?.classList.add('d-none');
    }
  }

  function goToAlbumPage(sectionKey, page) {
    const state = albumPagination[sectionKey];
    if (!state || page < 1 || page > state.totalPages || page === state.page) return;
    state.page = page;
    loadAlbumSection(sectionKey);

    const section = albumSections[sectionKey];
    document.getElementById(section?.sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function loadDetailSection(sectionKey) {
    const section = detailSections[sectionKey];
    const state = detailPagination[sectionKey];
    const albumCode = cfg.albumCode;
    if (!section || !state || !albumCode) return;

    setGridLoading(section.gridId);

    try {
      const data = await loadPublishedMedia(albumCode, section.mediaType, state.page, DETAIL_PAGE_SIZE);
      const items = data.items || [];
      state.totalPages = data.totalPages || 1;
      state.totalItems = data.totalItems || 0;

      if (sectionKey === 'image') {
        renderImageGrid(section.gridId, items, true);
      } else if (sectionKey === 'video') {
        renderVideoGrid(section.gridId, items);
      } else {
        render3dGrid(section.gridId, items);
      }

      renderDetailPagination(section.paginationId, sectionKey, state.page, state.totalPages);
    } catch (err) {
      const gridEl = document.getElementById(section.gridId);
      if (gridEl) gridEl.innerHTML = '<p class="gallery-empty">KhÃ´ng táº£i Ä‘Æ°á»£c dá»¯ liá»‡u.</p>';
      document.getElementById(section.paginationId)?.classList.add('d-none');
    }
  }

  function goToDetailPage(sectionKey, page) {
    const state = detailPagination[sectionKey];
    if (!state || page < 1 || page > state.totalPages || page === state.page) return;
    state.page = page;
    loadDetailSection(sectionKey);

    const section = detailSections[sectionKey];
    document.querySelector(`[data-panel="${section?.panelKey}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function loadRelatedAlbumSection(sectionKey) {
    const section = relatedAlbumSections[sectionKey];
    const state = relatedAlbumPagination[sectionKey];
    if (!section || !state || cfg.mode !== 'detail') return;

    setGridLoading(section.gridId);

    try {
      const data = await loadAlbums(section.albumType, state.page, { forRelated: true });
      const albums = filterExcludedAlbums(data.items || []);
      state.totalPages = data.totalPages || 1;
      state.totalItems = (data.totalItems || 0) > 0 && albums.length > 0
        ? data.totalItems
        : (state.page === 1 ? 0 : (data.totalItems || 0));

      if (!albums.length) {
        const gridEl = document.getElementById(section.gridId);
        if (gridEl) gridEl.innerHTML = '';
        document.getElementById(section.paginationId)?.classList.add('d-none');
      } else {
        renderAlbumGrid(section.gridId, albums);
        renderRelatedPagination(section.paginationId, sectionKey, state.page, state.totalPages);
      }

      updateRelatedAlbumVisibility(detailActiveMediaType);
    } catch (err) {
      const gridEl = document.getElementById(section.gridId);
      if (gridEl) gridEl.innerHTML = '<p class="gallery-empty">KhÃ´ng táº£i Ä‘Æ°á»£c dá»¯ liá»‡u.</p>';
      document.getElementById(section.paginationId)?.classList.add('d-none');
      updateRelatedAlbumVisibility(detailActiveMediaType);
    }
  }

  function goToRelatedAlbumPage(sectionKey, page) {
    const state = relatedAlbumPagination[sectionKey];
    if (!state || page < 1 || page > state.totalPages || page === state.page) return;
    state.page = page;
    loadRelatedAlbumSection(sectionKey);

    const section = relatedAlbumSections[sectionKey];
    document.getElementById(section?.sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function getActiveDetailMediaType() {
    const activeTab = document.querySelector('.gallery-detail-tab.active:not(.d-none)');
    if (activeTab?.dataset.tab) return activeTab.dataset.tab;
    const activePanel = document.querySelector('.gallery-detail-panel.active:not(.d-none)');
    return activePanel?.dataset.panel || detailActiveMediaType || 'image';
  }

  function updateRelatedAlbumVisibility(mediaType) {
    detailActiveMediaType = mediaType || getActiveDetailMediaType();
    const wrap = document.getElementById('galleryRelatedWrap');
    if (!wrap) return;

    Object.keys(relatedAlbumSections).forEach(type => {
      const section = relatedAlbumSections[type];
      const el = document.getElementById(section.sectionId);
      if (!el) return;
      const isActiveType = type === detailActiveMediaType;
      const hasItems = (relatedAlbumPagination[type]?.totalItems || 0) > 0;
      el.classList.toggle('d-none', !isActiveType || !hasItems);
    });

    const activeState = relatedAlbumPagination[detailActiveMediaType];
    const showWrap = (activeState?.totalItems || 0) > 0;
    wrap.classList.toggle('d-none', !showWrap);
  }

  async function fetchDetailMediaCount(albumCode, mediaType) {
    try {
      const data = await loadPublishedMedia(albumCode, mediaType, 1, 1);
      return data.totalItems || 0;
    } catch {
      return 0;
    }
  }

  function toggleSection(id, visible) {
    document.getElementById(id)?.classList.toggle('is-hidden', !visible);
  }

  function renderVideoCard(item, index) {
    const { title, description } = getItemTranslationText(item.translations);
    const displayTitle = title || description || 'Video';
    const thumb = mediaUrl(item.thumbnail || item.Thumbnail || '');
    const thumbHtml = thumb
      ? `<img src="${escapeHtml(thumb)}" alt="${escapeHtml(displayTitle)}" loading="lazy" />`
      : `<div class="gallery-video-card__placeholder" aria-hidden="true"><i class="bi bi-camera-video"></i></div>`;
    return `
      <button type="button" class="gallery-video-card" data-video-index="${index}">
        <div class="gallery-video-card__frame">
          ${thumbHtml}
          <div class="gallery-video-card__play"><span><i class="bi bi-play-fill"></i></span></div>
        </div>
        <div class="gallery-video-card__info">
          ${title ? `<h3 class="gallery-video-card__title">${escapeHtml(title)}</h3>` : ''}
          ${description ? `<p class="gallery-video-card__desc">${escapeHtml(description)}</p>` : ''}
        </div>
      </button>`;
  }

  function render3dCard(item, index) {
    const tr = pickTranslation(item.translations);
    const title = tr?.title || tr?.caption || 'MÃ´ hÃ¬nh 3D';
    return `
      <button type="button" class="gallery-3d-card" data-3d-index="${index}">
        <div class="gallery-3d-card__preview"><i class="bi bi-box"></i></div>
        <div class="gallery-3d-card__body">
          <p class="gallery-3d-card__title">${escapeHtml(title)}</p>
          <p class="gallery-3d-card__meta">Nháº¥n Ä‘á»ƒ xem mÃ´ hÃ¬nh 3D</p>
        </div>
      </button>`;
  }

  function isYoutubeUrl(url) {
    return /youtube\.com|youtu\.be/i.test(url || '');
  }

  function toYoutubeEmbed(url) {
    try {
      const u = new URL(url);
      let id = u.searchParams.get('v');
      if (!id && u.hostname.includes('youtu.be')) id = u.pathname.replace(/^\//, '');
      if (id) {
        const params = new URLSearchParams({
          autoplay: isTouchDevice() ? '0' : '1',
          playsinline: '1',
          rel: '0',
          modestbranding: '1'
        });
        return `https://www.youtube.com/embed/${id}?${params}`;
      }
    } catch { /* ignore */ }
    return url;
  }

  function buildYoutubeIframe(url, title) {
    const embedUrl = toYoutubeEmbed(url);
    return `<div class="gallery-modal__video-wrap"><iframe src="${escapeHtml(embedUrl)}" title="${escapeHtml(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div>`;
  }

  function getItemFileUrl(item) {
    return mediaUrl(item?.fileUrl || item?.FileUrl || '');
  }

  function getVideoMimeType(url) {
    const ext = String(url || '').split('?')[0].split('.').pop().toLowerCase();
    const map = {
      mp4: 'video/mp4',
      m4v: 'video/mp4',
      mov: 'video/mp4',
      webm: 'video/webm',
      ogg: 'video/ogg',
      ogv: 'video/ogg'
    };
    return map[ext] || 'video/mp4';
  }

  function getVideoPlaySources(rawUrl) {
    const direct = secureMediaUrl(rawUrl);
    const proxied = getProxyUrl(rawUrl);
    if (!direct) return [];
    if (proxied && proxied !== direct) return [direct, proxied];
    return [direct];
  }

  function prepareInlineVideoElement(video) {
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('x-webkit-airplay', 'allow');
    video.playsInline = true;
    video.controls = true;
    video.preload = (isIOS() || isTouchDevice()) ? 'metadata' : 'auto';
  }

  function mountGalleryVideo(body, rawUrl, posterUrl) {
    const sources = getVideoPlaySources(rawUrl);

    body.innerHTML = `
      <div class="gallery-modal__video-wrap gallery-modal__video-wrap--file">
        <video${posterUrl ? ` poster="${escapeHtml(posterUrl)}"` : ''}></video>
        <p class="gallery-modal__video-loading d-none" aria-live="polite">Äang táº£i video...</p>
        <div class="gallery-modal__video-fallback d-none">
          <p class="gallery-modal__video-fallback-msg">KhÃ´ng táº£i Ä‘Æ°á»£c video.</p>
          <button type="button" class="gallery-modal__video-retry heritage-btn-continue">Thá»­ láº¡i</button>
        </div>
      </div>`;

    const video = body.querySelector('video');
    const loadingEl = body.querySelector('.gallery-modal__video-loading');
    const fallback = body.querySelector('.gallery-modal__video-fallback');
    const retryBtn = body.querySelector('.gallery-modal__video-retry');
    if (!video || !sources.length) return;

    prepareInlineVideoElement(video);

    let sourceIndex = 0;

    function showLoading(show) {
      loadingEl?.classList.toggle('d-none', !show);
    }

    function showFallback() {
      showLoading(false);
      video.classList.add('d-none');
      fallback?.classList.remove('d-none');
    }

    function loadSource() {
      if (sourceIndex >= sources.length) {
        showFallback();
        return;
      }

      const src = sources[sourceIndex++];
      showLoading(true);
      video.classList.remove('d-none');
      fallback?.classList.add('d-none');
      video.removeAttribute('src');
      video.load();
      video.src = src;
      video.load();
    }

    function retryLoad() {
      sourceIndex = 0;
      video.classList.remove('d-none');
      fallback?.classList.add('d-none');
      loadSource();
    }

    retryBtn?.addEventListener('click', retryLoad);

    video.addEventListener('loadedmetadata', () => {
      showLoading(false);
    });

    video.addEventListener('canplay', () => {
      showLoading(false);
    });

    video.addEventListener('error', () => {
      if (sourceIndex < sources.length) {
        loadSource();
      } else {
        showFallback();
      }
    });

    loadSource();

    if (!isTouchDevice()) {
      video.addEventListener('loadeddata', () => {
        video.play().catch(() => { /* autoplay blocked */ });
      }, { once: true });
    }
  }

  function isDirectVideo(url) {
    return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url || '');
  }

  let videoItems = [];
  let model3dItems = [];

  function bindVideoCards(container, items) {
    videoItems = items;
    container.querySelectorAll('[data-video-index]').forEach(btn => {
      btn.addEventListener('click', () => openVideoModal(parseInt(btn.dataset.videoIndex, 10)));
    });
  }

  function bind3dCards(container, items) {
    model3dItems = items;
    container.querySelectorAll('[data-3d-index]').forEach(btn => {
      btn.addEventListener('click', () => open3dModal(parseInt(btn.getAttribute('data-3d-index'), 10)));
    });
  }

  function openVideoModal(index) {
    const item = videoItems[index];
    if (!item) return;
    const { title, description } = getItemTranslationText(item.translations);
    const displayTitle = title || description || 'Video';
    const url = getItemFileUrl(item);
    const poster = mediaUrl(item.thumbnail || item.Thumbnail || '');
    const body = document.getElementById('galleryVideoBody');
    const caption = document.getElementById('galleryVideoCaption');
    const modal = document.getElementById('galleryVideoModal');
    if (!body || !modal) return;

    if (isYoutubeUrl(url)) {
      body.innerHTML = buildYoutubeIframe(url, displayTitle);
    } else if (url) {
      mountGalleryVideo(body, url, poster);
    } else {
      body.innerHTML = '<p class="gallery-empty">KhÃ´ng cÃ³ file video.</p>';
    }

    setMediaCaption(caption, title, description);
    modal.classList.remove('d-none');
    document.body.style.overflow = 'hidden';
  }

  function closeVideoModal() {
    const modal = document.getElementById('galleryVideoModal');
    const body = document.getElementById('galleryVideoBody');
    if (body) body.innerHTML = '';
    modal?.classList.add('d-none');
    document.body.style.overflow = '';
  }

  function open3dModal(index) {
    const item = model3dItems[index];
    if (!item) return;
    const tr = pickTranslation(item.translations);
    const title = tr?.title || tr?.caption || '';
    const url = mediaUrl(item.fileUrl);
    const body = document.getElementById('gallery3dBody');
    const caption = document.getElementById('gallery3dCaption');
    const modal = document.getElementById('gallery3dModal');
    if (!body || !modal) return;

    body.innerHTML = `
      <model-viewer
        src="${escapeHtml(url)}"
        alt="${escapeHtml(title)}"
        camera-controls
        auto-rotate
        shadow-intensity="1"
        exposure="1"
        loading="eager">
      </model-viewer>`;

    if (caption) caption.textContent = title;
    modal.classList.remove('d-none');
    document.body.style.overflow = 'hidden';
  }

  function close3dModal() {
    const modal = document.getElementById('gallery3dModal');
    const body = document.getElementById('gallery3dBody');
    if (body) body.innerHTML = '';
    modal?.classList.add('d-none');
    document.body.style.overflow = '';
  }

  function openLightbox(index) {
    if (!lightboxItems.length) return;
    lightboxIndex = index;
    updateLightbox();
    document.getElementById('galleryLightbox')?.classList.remove('d-none');
    document.body.style.overflow = 'hidden';
    lightboxIgnorePauseUntil = performance.now() + 500;
    startLightboxAutoplay();
  }

  function closeLightbox() {
    stopLightboxAutoplay();
    document.getElementById('galleryLightbox')?.classList.add('d-none');
    document.body.style.overflow = '';
  }

  function stopLightboxAutoplay() {
    lightboxProgressPaused = true;
    if (lightboxProgressRaf) {
      cancelAnimationFrame(lightboxProgressRaf);
      lightboxProgressRaf = null;
    }
  }

  function updateLightboxProgressBar(ratio) {
    const bar = document.getElementById('galleryLightboxProgressBar');
    const wrap = document.getElementById('galleryLightboxProgress');
    if (bar) {
      bar.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
    }
    wrap?.classList.toggle('is-paused', lightboxProgressPaused);
  }

  function setLightboxProgressVisible(show) {
    document.getElementById('galleryLightboxProgress')?.classList.toggle('d-none', !show);
  }

  function resetLightboxProgress() {
    lightboxProgressElapsed = 0;
    lightboxProgressStart = performance.now();
    updateLightboxProgressBar(0);
  }

  function pauseLightboxProgress() {
    if (performance.now() < lightboxIgnorePauseUntil) return;
    if (lightboxProgressPaused || !lightboxAutoplayEnabled) return;
    lightboxProgressPaused = true;
    lightboxProgressElapsed += performance.now() - lightboxProgressStart;
    if (lightboxProgressRaf) {
      cancelAnimationFrame(lightboxProgressRaf);
      lightboxProgressRaf = null;
    }
    updateLightboxProgressBar(lightboxProgressElapsed / LIGHTBOX_AUTOPLAY_MS);
  }

  function resumeLightboxProgress() {
    if (!lightboxAutoplayEnabled || lightboxItems.length <= 1) return;
    const lightboxEl = document.getElementById('galleryLightbox');
    if (!lightboxEl || lightboxEl.classList.contains('d-none')) return;

    lightboxProgressPaused = false;
    lightboxProgressStart = performance.now();
    updateLightboxProgressBar(lightboxProgressElapsed / LIGHTBOX_AUTOPLAY_MS);
    tickLightboxProgress();
  }

  function tickLightboxProgress() {
    if (lightboxProgressPaused || !lightboxAutoplayEnabled || lightboxItems.length <= 1) return;

    const elapsed = lightboxProgressElapsed + (performance.now() - lightboxProgressStart);
    const ratio = elapsed / LIGHTBOX_AUTOPLAY_MS;
    updateLightboxProgressBar(ratio);

    if (ratio >= 1) {
      lightboxStep(1, { fromAutoplay: true });
      return;
    }

    lightboxProgressRaf = requestAnimationFrame(tickLightboxProgress);
  }

  function startLightboxAutoplay() {
    stopLightboxAutoplay();
    if (!lightboxAutoplayEnabled || lightboxItems.length <= 1) {
      setLightboxProgressVisible(false);
      updateLightboxProgressBar(0);
      return;
    }

    setLightboxProgressVisible(true);
    lightboxProgressPaused = false;
    resetLightboxProgress();
    tickLightboxProgress();
  }

  function updateLightboxAutoplayButton() {
    const btn = document.getElementById('galleryLightboxAutoplay');
    if (!btn) return;
    const playing = lightboxAutoplayEnabled && lightboxItems.length > 1;
    btn.classList.toggle('is-playing', playing);
    btn.classList.toggle('d-none', lightboxItems.length <= 1);
    btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    btn.setAttribute('aria-label', playing ? 'Táº¡m dá»«ng trÃ¬nh chiáº¿u' : 'Báº­t trÃ¬nh chiáº¿u tá»± Ä‘á»™ng');
    const icon = btn.querySelector('i');
    if (icon) {
      icon.className = playing ? 'bi bi-pause-fill' : 'bi bi-play-fill';
    }
    setLightboxProgressVisible(playing);
    if (!playing) {
      updateLightboxProgressBar(0);
    }
  }

  function updateLightboxCounter() {
    const counter = document.getElementById('galleryLightboxCounter');
    if (!counter) return;
    if (lightboxItems.length <= 1) {
      counter.textContent = '';
      counter.classList.add('d-none');
      return;
    }
    counter.classList.remove('d-none');
    counter.textContent = `${lightboxIndex + 1} / ${lightboxItems.length}`;
  }

  function updateLightbox() {
    const item = lightboxItems[lightboxIndex];
    if (!item) return;
    const img = document.getElementById('galleryLightboxImg');
    const cap = document.getElementById('galleryLightboxCaption');
    if (img) {
      img.src = item.src;
      img.alt = item.title || item.description || '';
    }
    setMediaCaption(cap, item.title, item.description);
    updateLightboxCounter();
    updateLightboxAutoplayButton();
  }

  function lightboxStep(delta, options) {
    if (!lightboxItems.length) return;
    lightboxIndex = (lightboxIndex + delta + lightboxItems.length) % lightboxItems.length;
    updateLightbox();
    if (lightboxAutoplayEnabled && lightboxItems.length > 1) {
      stopLightboxAutoplay();
      lightboxProgressPaused = false;
      resetLightboxProgress();
      tickLightboxProgress();
    }
  }

  function toggleLightboxAutoplay() {
    lightboxAutoplayEnabled = !lightboxAutoplayEnabled;
    updateLightboxAutoplayButton();
    if (lightboxAutoplayEnabled) {
      lightboxIgnorePauseUntil = performance.now() + 300;
      startLightboxAutoplay();
    } else {
      stopLightboxAutoplay();
    }
  }

  function initModals() {
    const lightboxEl = document.getElementById('galleryLightbox');

    document.getElementById('galleryLightboxClose')?.addEventListener('click', closeLightbox);
    document.getElementById('galleryLightboxPrev')?.addEventListener('click', () => lightboxStep(-1));
    document.getElementById('galleryLightboxNext')?.addEventListener('click', () => lightboxStep(1));
    document.getElementById('galleryLightboxAutoplay')?.addEventListener('click', toggleLightboxAutoplay);

    lightboxEl?.addEventListener('mouseenter', pauseLightboxProgress);
    lightboxEl?.addEventListener('mouseleave', resumeLightboxProgress);

    document.querySelectorAll('[data-gallery-close="video"]').forEach(el => {
      el.addEventListener('click', closeVideoModal);
    });
    document.querySelectorAll('[data-gallery-close="3d"]').forEach(el => {
      el.addEventListener('click', close3dModal);
    });

    document.addEventListener('keydown', e => {
      const lightboxOpen = !document.getElementById('galleryLightbox')?.classList.contains('d-none');
      if (lightboxOpen) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') lightboxStep(-1);
        if (e.key === 'ArrowRight') lightboxStep(1);
      }
      if (e.key === 'Escape') {
        closeVideoModal();
        close3dModal();
      }
    });
  }

  function initDetailTabs() {
    document.querySelectorAll('.gallery-detail-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const key = tab.dataset.tab;
        document.querySelectorAll('.gallery-detail-tab').forEach(t => t.classList.toggle('active', t === tab));
        document.querySelectorAll('.gallery-detail-panel').forEach(p => {
          p.classList.toggle('active', p.dataset.panel === key);
        });
        detailActiveMediaType = key;
        updateRelatedAlbumVisibility(key);
        loadRelatedAlbumSection(key);
      });
    });
  }

  function filterItemsByType(items, type) {
    return (items || []).filter(i => (i.mediaType || '').toLowerCase() === type && i.published !== false);
  }

  function resetDetailPagination() {
    Object.keys(detailPagination).forEach(key => {
      detailPagination[key].page = 1;
      detailPagination[key].totalPages = 1;
      detailPagination[key].totalItems = 0;
    });
    Object.keys(relatedAlbumPagination).forEach(key => {
      relatedAlbumPagination[key].page = 1;
      relatedAlbumPagination[key].totalPages = 1;
      relatedAlbumPagination[key].totalItems = 0;
    });
    document.getElementById('galleryRelatedWrap')?.classList.add('d-none');
  }

  async function initIndex() {
    initModals();
    updateGallerySectionHeader();

    await Promise.all([
      loadAlbumSection('image'),
      loadAlbumSection('video'),
      loadAlbumSection('file3d')
    ]);
  }

  function setupDetailLayout(albumType, counts) {
    const tabsEl = document.getElementById('galleryDetailTabs');
    const types = ['image', 'video', 'file3d'];
    const activeCounts = {
      image: counts.images,
      video: counts.videos,
      file3d: counts.models
    };
    const nonEmptyTypes = types.filter(t => activeCounts[t] > 0);
    const primaryType = nonEmptyTypes.includes(albumType) ? albumType : (nonEmptyTypes[0] || 'image');
    const showTabs = nonEmptyTypes.length > 1;

    if (tabsEl) tabsEl.classList.toggle('is-hidden', !showTabs);

    document.querySelectorAll('.gallery-detail-tab').forEach(tab => {
      const type = tab.dataset.tab;
      tab.classList.toggle('d-none', activeCounts[type] === 0);
      tab.classList.toggle('active', showTabs && type === primaryType);
    });

    document.querySelectorAll('.gallery-detail-panel').forEach(panel => {
      const type = panel.dataset.panel;
      if (!showTabs) {
        panel.classList.toggle('active', type === primaryType);
        panel.classList.toggle('d-none', type !== primaryType);
        return;
      }
      panel.classList.toggle('d-none', activeCounts[type] === 0);
      panel.classList.toggle('active', type === primaryType);
    });

    detailActiveMediaType = primaryType;
    updateRelatedAlbumVisibility(primaryType);
    loadRelatedAlbumSection(primaryType);
  }

  async function initDetail() {
    initModals();
    initDetailTabs();

    const code = cfg.albumCode;
    if (!code) return;

    resetDetailPagination();

    try {
      const album = await loadAlbumByCodeOrId(code, false);
      const tr = pickTranslation(album.translations);
      const title = tr?.title || album.albumCode;
      const desc = tr?.description || '';
      const albumType = (album.albumType || album.AlbumType || 'image').toLowerCase();

      document.getElementById('galleryDetailTitle')?.replaceChildren(document.createTextNode(title));
      document.getElementById('galleryDetailBreadcrumb')?.replaceChildren(document.createTextNode(title));
      const descEl = document.getElementById('galleryDetailDesc');
      if (descEl) descEl.textContent = desc;

      document.title = document.title.includes(' - ')
        ? `${title} - ${document.title.split(' - ').slice(1).join(' - ')}`
        : title;

      const [imageCount, videoCount, modelCount] = await Promise.all([
        fetchDetailMediaCount(code, 'image'),
        fetchDetailMediaCount(code, 'video'),
        fetchDetailMediaCount(code, 'file3d')
      ]);

      detailPagination.image.totalItems = imageCount;
      detailPagination.video.totalItems = videoCount;
      detailPagination.file3d.totalItems = modelCount;

      const counts = {
        images: imageCount,
        videos: videoCount,
        models: modelCount
      };

      setupDetailLayout(albumType, counts);

      const loadTasks = [];
      if (imageCount > 0) loadTasks.push(loadDetailSection('image'));
      if (videoCount > 0) loadTasks.push(loadDetailSection('video'));
      if (modelCount > 0) loadTasks.push(loadDetailSection('file3d'));
      await Promise.all(loadTasks);
    } catch (err) {
      document.getElementById('galleryDetailImages')?.replaceChildren(
        Object.assign(document.createElement('p'), { className: 'gallery-empty', textContent: 'KhÃ´ng tÃ¬m tháº¥y album.' })
      );
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (cfg.mode === 'detail') initDetail();
    else initIndex();
  });

  window.addEventListener('languageChanged', () => {
    langCode = (localStorage.getItem('selectedLanguage') || 'vi').toLowerCase();
    if (cfg.mode === 'detail') initDetail();
    else {
      updateGallerySectionHeader();
      Promise.all([
        loadAlbumSection('image'),
        loadAlbumSection('video'),
        loadAlbumSection('file3d')
      ]);
    }
  });

  window.addEventListener('menuLoaded', () => {
    if (cfg.mode !== 'detail') updateGallerySectionHeader();
  });
})();
