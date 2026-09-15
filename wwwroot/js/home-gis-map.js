/* Homepage discovery map — Leaflet + OpenStreetMap */
(function () {
  'use strict';

  const API_MAP_URL = '/api/Portal/locations/map';
  const API_CATEGORIES_URL = '/api/Portal/locations/categories';
  const PROVINCE_BOUNDARY_URL = '/data/daklak-boundary.json';
  const DEFAULT_CENTER = { lat: 12.93, lng: 108.58 };
  const PROVINCE_BOUNDS = {
    southWest: [12.16, 107.48],
    northEast: [13.70, 109.67]
  };
  const PROVINCE_ZOOM = 8;
  /* Safari-safe pin body: SVG data URI (no CSS filter + rotated ::before).
     White circle + colored icon are overlaid via .home-gis-map__pin-inner. */
  const PIN_SVG = (fill) => `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 36" width="28" height="36"><path fill="${fill}" d="M14 0C7.4 0 2 5.4 2 12c0 9 12 24 12 24s12-15 12-24C26 5.4 20.6 0 14 0z"/></svg>`
  )}`;

  let pageTranslations = {};
  let defaultLang = 'vi';
  let currentPoints = [];
  let filteredPoints = [];
  let categoryCatalog = [];
  let popupIndex = -1;
  let searchQuery = '';
  let defaultMapView = null;
  let leafletMap = null;
  let markerEntries = [];
  let islandMarkers = [];
  let baseTileLayer = null;
  let baseOverlayLayer = null;
  let tileProviderIndex = 0;
  let baseMapMode = 'street';
  let popupSwitching = false;
  let userLocationMarker = null;
  let routeLayer = null;
  let provinceBoundaryLayer = null;
  let activeRouteSummary = null;
  let descExpandedByPoint = {};
  let albumLightboxState = { urls: [], index: 0, title: '' };

  const STREET_TILE_PROVIDERS = [
    {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        maxZoom: 19,
        crossOrigin: true,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
      }
    },
    {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      options: {
        subdomains: 'abcd',
        maxZoom: 20,
        crossOrigin: true,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>'
      }
    },
    {
      url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
      options: {
        subdomains: 'abc',
        maxZoom: 20,
        crossOrigin: true,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> France'
      }
    }
  ];

  const BASEMAP_MODES = {
    street: { type: 'street' },
    satellite: {
      type: 'single',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      options: {
        maxZoom: 19,
        crossOrigin: true,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
      }
    },
    hybrid: {
      type: 'stack',
      base: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        options: {
          maxZoom: 19,
          crossOrigin: true,
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
        }
      },
      overlay: {
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
        options: {
          subdomains: 'abcd',
          maxZoom: 20,
          pane: 'overlayPane',
          opacity: 0.95,
          crossOrigin: true,
          attribution: '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>'
        }
      }
    },
    terrain: {
      type: 'single',
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      options: {
        subdomains: 'abc',
        maxZoom: 17,
        crossOrigin: true,
        attribution: '&copy; <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC-BY-SA</a>)'
      }
    },
    light: {
      type: 'single',
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      options: {
        subdomains: 'abcd',
        maxZoom: 20,
        crossOrigin: true,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>'
      }
    }
  };

  const ISLAND_COORDS = {
    hoangSa: { lat: 16.5, lng: 112 },
    truongSa: { lat: 8.6427, lng: 111.92 }
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function truncateExcerpt(text, maxLen) {
    if (!text) return '';
    const plain = String(text).replace(/\s+/g, ' ').trim();
    const limit = maxLen || 50;
    if (plain.length <= limit) return plain;
    return `${plain.slice(0, limit).trim()}...`;
  }

  function getLangCode() {
    try {
      return (localStorage.getItem('selectedLanguage') || defaultLang).toLowerCase();
    } catch {
      return defaultLang;
    }
  }

  function t(key, fallback) {
    const langPack = pageTranslations[getLangCode()] || pageTranslations[defaultLang] || {};
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

  function applySectionI18n(section) {
    section.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const value = t(key);
      if (value) el.textContent = value;
    });
    section.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (!key) return;
      const value = t(key);
      if (value) el.setAttribute('placeholder', value);
    });
    section.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria-label');
      if (!key) return;
      const value = t(key);
      if (value) el.setAttribute('aria-label', value);
    });
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

  function normalizePinColor(color) {
    let value = (color || '').trim();
    if (!value) return '#c9a24d';
    if (!value.startsWith('#')) value = `#${value}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(value) || /^#[0-9A-Fa-f]{3}$/.test(value)) return value.toLowerCase();
    return '#c9a24d';
  }

  function isImageIcon(icon) {
    if (!icon) return false;
    const v = String(icon).trim().toLowerCase();
    return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/') ||
      /\.(png|jpe?g|gif|webp|svg|ico)(\?|$)/i.test(v);
  }

  /* Mac Safari often fails to paint CoreUI/Bootstrap webfont glyphs inside
     Leaflet marker panes; iOS Safari is fine. Use inline SVG instead. */
  const pinGlyphCache = Object.create(null);
  let pinGlyphLoadToken = 0;

  function defaultPinGlyphSvg(color) {
    const fill = escapeHtml(color || '#c9a24d');
    return `<svg class="home-gis-map__pin-glyph" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="12" height="12" aria-hidden="true"><path fill="${fill}" d="M256 48c-79.5 0-144 59.6-144 133 0 87.4 96.3 198.7 133.2 238.5 6.3 6.8 17.3 6.8 23.6 0C303.7 379.7 400 268.4 400 181 400 107.6 335.5 48 256 48zm0 198c-35.3 0-64-28.7-64-64s28.7-64 64-64 64 28.7 64 64-28.7 64-64 64z"/></svg>`;
  }

  function extractIconClassName(icon) {
    const raw = String(icon || '').trim();
    if (!raw) return 'cil-location-pin';
    const match = raw.match(/(cil-[a-z0-9-]+|bi-[a-z0-9-]+)/i);
    return match ? match[1].toLowerCase() : 'cil-location-pin';
  }

  function colorizeIconSvg(svgText, color) {
    let svg = String(svgText || '');
    if (!svg) return '';
    const fill = escapeHtml(color || '#c9a24d');
    svg = svg.replace(/<\?xml[\s\S]*?\?>/i, '');
    svg = svg.replace(/<!DOCTYPE[\s\S]*?>/i, '');
    svg = svg.replace(/<!--[\s\S]*?-->/g, '');
    svg = svg.replace(/<svg\b([^>]*)>/i, (_, attrs) => {
      let a = attrs
        .replace(/\s(width|height|class|aria-hidden)="[^"]*"/gi, '')
        .replace(/\sfill="[^"]*"/gi, '');
      return `<svg class="home-gis-map__pin-glyph" width="12" height="12" aria-hidden="true"${a}>`;
    });
    svg = svg.replace(/\sfill="(?!none)[^"]*"/gi, ` fill="${fill}"`);
    if (!/\sfill="/i.test(svg)) {
      svg = svg.replace(/<(path|circle|rect|polygon)\b/i, `<$1 fill="${fill}"`);
    }
    return svg;
  }

  function iconSvgUrl(iconClass) {
    if (iconClass.startsWith('bi-')) {
      return `https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/icons/${iconClass.slice(3)}.svg`;
    }
    return `https://cdn.jsdelivr.net/npm/@coreui/icons@2.1.0/svg/free/${iconClass}.svg`;
  }

  function buildPinInnerHtml(icon, color) {
    const pinColor = normalizePinColor(color || '#c9a24d');
    const raw = (icon || '').toString().trim();

    if (raw && isImageIcon(raw)) {
      return `<img src="${escapeHtml(mediaUrl(raw))}" alt="">`;
    }

    if (raw && !(raw.includes('cil-') || raw.includes('bi-') || raw.startsWith('icon '))) {
      return `<span>${escapeHtml(raw.substring(0, 2))}</span>`;
    }

    const iconClass = extractIconClassName(raw);
    const cached = pinGlyphCache[iconClass];
    if (cached) return colorizeIconSvg(cached, pinColor);
    return defaultPinGlyphSvg(pinColor);
  }

  async function preloadPinGlyphs(points) {
    const names = [...new Set(
      (points || [])
        .map(p => extractIconClassName(p.categoryIcon))
        .filter(Boolean)
    )];
    if (!names.length) return false;

    const token = ++pinGlyphLoadToken;
    let changed = false;

    await Promise.all(names.map(async (name) => {
      if (pinGlyphCache[name]) return;
      try {
        const res = await fetch(iconSvgUrl(name), { mode: 'cors' });
        if (!res.ok) throw new Error(`icon ${name}`);
        const text = await res.text();
        if (token !== pinGlyphLoadToken) return;
        pinGlyphCache[name] = text;
        changed = true;
      } catch {
        pinGlyphCache[name] = pinGlyphCache[name] || '';
      }
    }));

    return changed && token === pinGlyphLoadToken;
  }

  function findCategoryStyle(categoryKey) {
    const key = (categoryKey || '').trim().toLowerCase();
    if (!key || !categoryCatalog.length) return null;
    return categoryCatalog.find(c =>
      (c.code || '').toLowerCase() === key ||
      (c.name || '').toLowerCase() === key
    ) || null;
  }

  function enrichPointsWithCategoryStyles(points, categories) {
    categoryCatalog = (categories || []).map(normalizeCategoryOption).filter(Boolean);

    points.forEach(p => {
      const style = findCategoryStyle(p.category) || findCategoryStyle(p.categoryName);
      if (!style) return;

      if (!p.categoryIcon && style.icon) p.categoryIcon = style.icon;
      if (style.color && (!p.categoryColor || p.categoryColor === '#c9a24d')) {
        p.categoryColor = style.color;
      }
      if (style.name) p.categoryName = style.name;
      if (style.code) p.category = style.code;
    });
  }

  function normalizeImageUrls(raw) {
    const rawItems = raw.images || raw.Images;
    let urls = [];
    if (Array.isArray(rawItems)) {
      urls = rawItems.map(item => {
        if (typeof item === 'string') return mediaUrl(item.trim());
        return mediaUrl((item?.url || item?.Url || '').toString().trim());
      }).filter(Boolean);
    }
    const fallback = mediaUrl(raw.imageUrl || raw.ImageUrl || '');
    if (!urls.length && fallback) urls = [fallback];
    return [...new Set(urls)];
  }

  function normalizePoint(raw) {
    const lat = parseFloat(raw.latitude ?? raw.Latitude);
    const lng = parseFloat(raw.longitude ?? raw.Longitude);
    if (isNaN(lat) || isNaN(lng)) return null;

    const category = (raw.category || raw.Category || '').trim();
    const categoryName = (raw.categoryName || raw.CategoryName || category || '').trim();
    const rawIcon = (raw.categoryIcon || raw.CategoryIcon || '').toString().trim();
    const rawColor = (raw.categoryColor || raw.CategoryColor || '').toString().trim();
    const imageUrls = normalizeImageUrls(raw);

    return {
      id: raw.id || raw.Id || raw.code || raw.Code || '',
      code: raw.code || raw.Code || '',
      lat,
      lng,
      title: raw.title || raw.Title || raw.code || raw.Code || '',
      content: raw.content || raw.Content || '',
      imageUrl: imageUrls[0] || '',
      imageUrls,
      videoUrl: mediaUrl(raw.videoUrl || raw.VideoUrl || ''),
      audioUrl: mediaUrl(raw.audioUrl || raw.AudioUrl || ''),
      link: (() => {
        const rawLink = (raw.link || raw.Link || raw.website || raw.Website || '').toString().trim();
        return rawLink ? mediaUrl(rawLink) : '';
      })(),
      category,
      categoryName,
      categoryIcon: rawIcon,
      categoryColor: normalizePinColor(rawColor || '#c9a24d')
    };
  }

  function normalizeCategoryOption(raw) {
    if (!raw) return null;
    if (typeof raw === 'string') {
      const code = raw.trim();
      if (!code) return null;
      return { code, name: code, icon: '', color: '#c9a24d' };
    }
    const code = (raw.code || raw.Code || '').trim();
    if (!code) return null;
    return {
      code,
      name: (raw.name || raw.Name || code).trim(),
      icon: raw.icon || raw.Icon || '',
      color: normalizePinColor(raw.color || raw.Color || '')
    };
  }

  function resolveDefaultMapView() {
    return { lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng, zoom: PROVINCE_ZOOM };
  }

  function applyProvinceView(points) {
    if (!leafletMap) return;

    let bounds = null;
    if (provinceBoundaryLayer) {
      try {
        bounds = provinceBoundaryLayer.getBounds();
      } catch {
        bounds = null;
      }
    }
    if (!bounds || !bounds.isValid()) {
      bounds = L.latLngBounds(PROVINCE_BOUNDS.southWest, PROVINCE_BOUNDS.northEast);
    }

    leafletMap.fitBounds(bounds, {
      padding: [28, 28],
      maxZoom: 9,
      animate: false
    });
  }

  function syncBasemapButtons() {
    document.querySelectorAll('.home-gis-map__basemap-btn').forEach(btn => {
      const active = btn.dataset.basemap === baseMapMode;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function clearBaseLayers(map) {
    if (baseOverlayLayer && map) {
      map.removeLayer(baseOverlayLayer);
      baseOverlayLayer = null;
    }
    if (baseTileLayer && map) {
      map.removeLayer(baseTileLayer);
      baseTileLayer = null;
    }
  }

  function setBaseMap(mode, map) {
    const targetMap = map || leafletMap;
    if (!targetMap) return;

    const nextMode = BASEMAP_MODES[mode] ? mode : 'street';
    const config = BASEMAP_MODES[nextMode];
    baseMapMode = nextMode;
    clearBaseLayers(targetMap);

    if (config.type === 'street') {
      const provider = STREET_TILE_PROVIDERS[tileProviderIndex] || STREET_TILE_PROVIDERS[0];
      baseTileLayer = L.tileLayer(provider.url, provider.options).addTo(targetMap);

      let errorCount = 0;
      baseTileLayer.on('tileerror', () => {
        if (baseMapMode !== 'street') return;
        errorCount += 1;
        if (errorCount >= 4 && tileProviderIndex < STREET_TILE_PROVIDERS.length - 1) {
          tileProviderIndex += 1;
          setBaseMap('street', targetMap);
        }
      });
    } else if (config.type === 'stack') {
      baseTileLayer = L.tileLayer(config.base.url, config.base.options).addTo(targetMap);
      baseOverlayLayer = L.tileLayer(config.overlay.url, config.overlay.options).addTo(targetMap);
    } else {
      baseTileLayer = L.tileLayer(config.url, config.options).addTo(targetMap);
    }

    if (provinceBoundaryLayer?.bringToFront) {
      provinceBoundaryLayer.bringToFront();
    }
    syncBasemapButtons();
  }

  function addOsmStreetLayer(map) {
    setBaseMap(baseMapMode || 'street', map);
  }

  function ensureLeafletCss() {
    if (document.querySelector('link[data-home-gis-leaflet]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
    link.crossOrigin = '';
    link.dataset.homeGisLeaflet = '1';
    document.head.appendChild(link);
  }

  function loadLeafletScript() {
    if (window.L?.map) return Promise.resolve(true);
    if (window.__homeGisLeafletLoading) return window.__homeGisLeafletLoading;

    window.__homeGisLeafletLoading = new Promise(resolve => {
      ensureLeafletCss();
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
      script.crossOrigin = '';
      script.onload = () => resolve(!!window.L?.map);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });

    return window.__homeGisLeafletLoading;
  }

  async function waitForLeaflet(timeoutMs) {
    const loaded = await loadLeafletScript();
    if (loaded) return true;

    const started = Date.now();
    return new Promise(resolve => {
      const timer = setInterval(() => {
        if (window.L?.map) {
          clearInterval(timer);
          resolve(true);
        } else if (Date.now() - started >= timeoutMs) {
          clearInterval(timer);
          resolve(false);
        }
      }, 100);
    });
  }

  function filterPoints(points, query, category) {
    const q = (query || '').trim().toLowerCase();
    const cat = (category || '').trim().toLowerCase();
    return points.filter(p => {
      if (cat && (p.category || '').toLowerCase() !== cat) return false;
      if (!q) return true;
      return (p.title && p.title.toLowerCase().includes(q)) ||
        (p.content && p.content.toLowerCase().includes(q)) ||
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q));
    });
  }

  function populateCategoryFilter(categories) {
    const select = document.getElementById('homeGisMapCategory');
    if (!select) return;

    const list = (categories || [])
      .map(normalizeCategoryOption)
      .filter(Boolean)
      .sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code, 'vi'));

    const current = select.value;
    select.innerHTML = `<option value="">${escapeHtml(t('homeGisMapAll', 'Tất cả'))}</option>`;
    list.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.code;
      opt.textContent = cat.name || cat.code;
      select.appendChild(opt);
    });
    select.disabled = list.length === 0;
    if (current && list.some(c => c.code === current)) select.value = current;
  }

  function getIslandPresets() {
    return [
      {
        key: 'hoangSa',
        lat: ISLAND_COORDS.hoangSa.lat,
        lng: ISLAND_COORDS.hoangSa.lng,
        label: t('homeGisMapHoangSa', 'Quần đảo Hoàng Sa'),
        content: t('homeGisMapHoangSaDesc', 'Quần đảo Hoàng Sa thuộc chủ quyền Việt Nam.')
      },
      {
        key: 'truongSa',
        lat: ISLAND_COORDS.truongSa.lat,
        lng: ISLAND_COORDS.truongSa.lng,
        label: t('homeGisMapTruongSa', 'Quần đảo Trường Sa'),
        content: t('homeGisMapTruongSaDesc', 'Quần đảo Trường Sa thuộc chủ quyền Việt Nam.')
      }
    ];
  }

  function clearProvinceBoundary() {
    if (provinceBoundaryLayer && leafletMap) {
      leafletMap.removeLayer(provinceBoundaryLayer);
    }
    provinceBoundaryLayer = null;
  }

  async function loadProvinceBoundary() {
    if (!leafletMap || !window.L?.geoJSON) return;
    clearProvinceBoundary();

    try {
      const res = await fetch(PROVINCE_BOUNDARY_URL, { headers: { Accept: 'application/json' } });
      if (!res.ok) return;
      const geojson = await res.json();
      if (!geojson?.features?.length) return;

      provinceBoundaryLayer = L.geoJSON(geojson, {
        interactive: false,
        style: {
          color: '#b45309',
          weight: 3,
          opacity: 1,
          fillColor: '#c9a24d',
          fillOpacity: 0.14,
          lineJoin: 'round',
          lineCap: 'round'
        },
        className: 'home-gis-map__province-boundary'
      }).addTo(leafletMap);

      if (provinceBoundaryLayer.bringToBack) provinceBoundaryLayer.bringToBack();
      applyProvinceView();
    } catch {
      /* ignore missing boundary file */
    }
  }

  function refreshMapLayout() {
    if (!leafletMap) return;
    leafletMap.invalidateSize(true);
    applyProvinceView(filteredPoints.length ? filteredPoints : currentPoints);
    renderMarkers(filteredPoints.length ? filteredPoints : currentPoints, popupIndex);
  }

  function createIslandIcon(label) {
    return L.divIcon({
      className: 'home-gis-map__island-marker',
      html: `<span>${escapeHtml(label)}</span>`,
      iconSize: null,
      iconAnchor: [0, 0]
    });
  }

  function clearIslandMarkers() {
    islandMarkers.forEach(marker => marker.remove());
    islandMarkers = [];
  }

  function addIslandMarkers() {
    if (!leafletMap) return;
    clearIslandMarkers();

    getIslandPresets().forEach(preset => {
      const marker = L.marker([preset.lat, preset.lng], {
        icon: createIslandIcon(preset.label),
        interactive: true,
        zIndexOffset: 500
      });

      marker.bindPopup(
        `<div class="home-gis-map__island-popup"><strong>${escapeHtml(preset.label)}</strong><p>${escapeHtml(preset.content)}</p></div>`,
        { className: 'home-gis-map__leaflet-popup', maxWidth: 280 }
      );

      marker.addTo(leafletMap);
      islandMarkers.push(marker);
    });
  }

  function pinIcon(point, active) {
    const w = active ? 34 : 30;
    const h = active ? 44 : 40;
    const color = normalizePinColor(point?.categoryColor || (active ? '#e8c468' : '#c9a24d'));
    const iconHtml = buildPinInnerHtml(point?.categoryIcon, color);
    const shapeSrc = PIN_SVG(color);

    return L.divIcon({
      className: 'home-gis-map__pin-marker',
      html:
        `<div class="home-gis-map__pin${active ? ' is-active' : ''}" style="--pin-color:${color};width:${w}px;height:${h}px">` +
        `<img class="home-gis-map__pin-shape" src="${shapeSrc}" width="${w}" height="${h}" alt="" draggable="false">` +
        `<span class="home-gis-map__pin-inner">${iconHtml}</span>` +
        `</div>`,
      iconSize: [w, h],
      iconAnchor: [Math.round(w / 2), h],
      popupAnchor: [0, -h + 4]
    });
  }

  function stopPopupMedia() {
    const scope = leafletMap?.getPane('popupPane') || document.getElementById('homeGisMapWrap');
    if (!scope) return;
    scope.querySelectorAll('video, audio').forEach(el => {
      try {
        el.pause();
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
    });
  }

  function playHeroVideoInPopup(marker) {
    if (!marker) return;
    window.requestAnimationFrame(() => {
      const popupEl = marker.getPopup()?.getElement?.();
      if (!popupEl) return;
      const video = popupEl.querySelector('video[data-gis-hero-video]');
      if (!video) return;
      video.muted = false;
      video.volume = 1;
      const playPromise = video.play();
      if (playPromise?.catch) playPromise.catch(() => {});
    });
  }

  function formatRouteDistance(meters) {
    const m = Number(meters) || 0;
    if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
    return `${Math.round(m)} m`;
  }

  function formatRouteDuration(seconds) {
    const totalMin = Math.max(1, Math.round((Number(seconds) || 0) / 60));
    if (totalMin < 60) {
      return `~${totalMin} ${t('homeGisMapMinutes', 'phút')}`;
    }
    const hours = Math.floor(totalMin / 60);
    const mins = totalMin % 60;
    if (!mins) return `~${hours} ${t('homeGisMapHours', 'giờ')}`;
    return `~${hours} ${t('homeGisMapHours', 'giờ')} ${mins} ${t('homeGisMapMinutes', 'phút')}`;
  }

  function formatCoordinates(lat, lng) {
    return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
  }

  function extractOriginLocationParts(address) {
    if (!address || typeof address !== 'object') return null;

    const district = (
      address.city_district
      || address.district
      || address.borough
      || address.county
      || address.suburb
      || ''
    ).trim();

    const city = (
      address.city
      || address.town
      || address.municipality
      || ''
    ).trim();

    const province = (
      address.state
      || address.province
      || address.region
      || ''
    ).trim();

    let provinceCity = '';
    if (city && province && city.toLowerCase() !== province.toLowerCase()) {
      provinceCity = `${city}, ${province}`;
    } else {
      provinceCity = province || city || '';
    }

    const label = [district, provinceCity].filter(Boolean).join(', ');
    if (!label) return null;

    return { district, provinceCity, label };
  }

  function extractOriginLocationFromDisplayName(displayName) {
    if (!displayName) return null;
    const parts = displayName.split(',').map(part => part.trim()).filter(Boolean);
    if (parts.length < 2) return parts[0] || null;

    const last = parts[parts.length - 1].toLowerCase();
    const isCountry = /việt nam|vietnam|viet nam/.test(last);
    const slice = isCountry ? parts.slice(-4, -1) : parts.slice(-3);
    const label = slice.filter(Boolean).join(', ');
    return label || parts[0] || null;
  }

  async function reverseGeocodeOrigin(lat, lng) {
    try {
      const lang = getLangCode() === 'en' ? 'en' : 'vi';
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&zoom=14&addressdetails=1&accept-language=${lang}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return null;
      const data = await res.json();
      const parts = extractOriginLocationParts(data.address);
      return parts?.label || extractOriginLocationFromDisplayName(data.display_name) || null;
    } catch {
      return null;
    }
  }

  function buildRouteInfoHtml(point) {
    if (!activeRouteSummary) return '';
    const dist = formatRouteDistance(activeRouteSummary.distanceM);
    const dur = formatRouteDuration(activeRouteSummary.durationS);
    const originText = activeRouteSummary.originText
      || t('homeGisMapRouteOriginUnknown', 'Không xác định');
    const originCoords = formatCoordinates(activeRouteSummary.originLat, activeRouteSummary.originLng);
    const destText = point?.title || activeRouteSummary.destText || '';
    const destCoords = point
      ? formatCoordinates(point.lat, point.lng)
      : formatCoordinates(activeRouteSummary.destLat, activeRouteSummary.destLng);

    return `
      <span class="home-gis-map__route-info-item home-gis-map__route-info-item--origin">
        <i class="bi bi-geo-alt-fill" aria-hidden="true"></i>
        <span class="home-gis-map__route-info-origin">
          <span>${escapeHtml(t('homeGisMapRouteOrigin', 'Điểm đi hiện tại'))}: <strong>${escapeHtml(originText)}</strong></span>
          <small class="home-gis-map__route-info-coords">${escapeHtml(t('homeGisMapRouteGps', 'GPS'))}: ${escapeHtml(originCoords)}</small>
        </span>
      </span>
      <span class="home-gis-map__route-info-item home-gis-map__route-info-item--dest">
        <i class="bi bi-geo-alt" aria-hidden="true"></i>
        <span class="home-gis-map__route-info-dest">
          <span>${escapeHtml(t('homeGisMapRouteDestination', 'Điểm đến'))}: <strong>${escapeHtml(destText)}</strong></span>
          <small class="home-gis-map__route-info-coords">${escapeHtml(destCoords)}</small>
        </span>
      </span>
      <span class="home-gis-map__route-info-item">
        <i class="bi bi-signpost-split" aria-hidden="true"></i>
        ${escapeHtml(t('homeGisMapRouteDistance', 'Khoảng cách'))}: <strong>${escapeHtml(dist)}</strong>
      </span>
      <span class="home-gis-map__route-info-item">
        <i class="bi bi-clock" aria-hidden="true"></i>
        ${escapeHtml(t('homeGisMapRouteDuration', 'Thời gian dự kiến'))}: <strong>${escapeHtml(dur)}</strong>
      </span>`;
  }

  function buildRouteInfoBlock(pointIndex, point) {
    if (!activeRouteSummary || activeRouteSummary.pointIndex !== pointIndex) return '';
    return `<div class="home-gis-map__route-info">${buildRouteInfoHtml(point)}</div>`;
  }

  function updatePopupContent(pointIndex, marker) {
    const point = currentPoints[pointIndex];
    if (!point || !marker) return;

    const wasOpen = marker.isPopupOpen();
    marker.setPopupContent(buildInfoContent(point, pointIndex));
    if (wasOpen) {
      marker.openPopup();
      onPopupOpened(marker);
    }
  }

  function clearRoute() {
    if (routeLayer && leafletMap) {
      leafletMap.removeLayer(routeLayer);
      routeLayer = null;
    }
    if (userLocationMarker && leafletMap) {
      leafletMap.removeLayer(userLocationMarker);
      userLocationMarker = null;
    }
    const prevPointIndex = activeRouteSummary?.pointIndex;
    activeRouteSummary = null;
    if (prevPointIndex >= 0) {
      const entry = markerEntries.find(m => m.globalIndex === prevPointIndex);
      if (entry?.marker?.isPopupOpen()) updatePopupContent(prevPointIndex, entry.marker);
    }
  }

  function getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('unsupported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => reject(err),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 }
      );
    });
  }

  function getPopupFitPadding(marker) {
    const fallback = { top: 320, side: 48, bottom: 56 };
    if (!marker) return fallback;

    const popup = marker.getPopup();
    if (popup) popup.update();

    const el = popup?.getElement();
    if (!el) return fallback;

    return {
      top: Math.ceil(el.offsetHeight + 64),
      side: Math.ceil(Math.max(el.offsetWidth, 300) / 2 + 36),
      bottom: 56
    };
  }

  function ensurePopupFullyVisible(marker, attempt = 0) {
    if (!marker || !leafletMap) return;

    const popup = marker.getPopup();
    if (!popup || !marker.isPopupOpen()) return;
    popup.update();

    const popupEl = popup.getElement();
    const mapEl = leafletMap.getContainer();
    if (!popupEl || !mapEl) return;

    const mapRect = mapEl.getBoundingClientRect();
    const popupRect = popupEl.getBoundingClientRect();
    const padding = 16;

    const overflowTop = Math.max(0, mapRect.top + padding - popupRect.top);
    const overflowBottom = Math.max(0, popupRect.bottom - (mapRect.bottom - padding));
    const overflowLeft = Math.max(0, mapRect.left + padding - popupRect.left);
    const overflowRight = Math.max(0, popupRect.right - (mapRect.right - padding));

    const hasOverflow = overflowTop || overflowBottom || overflowLeft || overflowRight;
    if (!hasOverflow) return;

    if (attempt < 4 && leafletMap.getZoom() > leafletMap.getMinZoom()) {
      leafletMap.setZoom(leafletMap.getZoom() - 1, { animate: true });
      leafletMap.once('zoomend', () => ensurePopupFullyVisible(marker, attempt + 1));
      return;
    }

    const dx = overflowLeft
      ? overflowLeft
      : (overflowRight ? -overflowRight : 0);
    const dy = overflowTop
      ? overflowTop
      : (overflowBottom ? -overflowBottom : 0);

    if (!dx && !dy) return;

    const size = leafletMap.getSize();
    const center = L.point(size.x / 2, size.y / 2);
    leafletMap.panTo(
      leafletMap.containerPointToLatLng(L.point(center.x - dx, center.y - dy)),
      { animate: true }
    );
  }

  function focusMapOnRouteAndPopup(pointIndex, routeCoords, user, point) {
    const entry = markerEntries.find(m => m.globalIndex === pointIndex);
    if (!leafletMap || !routeCoords?.length) return;

    const marker = entry?.marker;
    const pad = getPopupFitPadding(marker);

    const bounds = L.latLngBounds(routeCoords)
      .extend([user.lat, user.lng])
      .extend([point.lat, point.lng]);

    leafletMap.fitBounds(bounds, {
      paddingTopLeft: L.point(pad.side, pad.top),
      paddingBottomRight: L.point(pad.side, pad.bottom),
      maxZoom: 15,
      animate: true
    });

    const finalize = () => {
      if (!marker) return;
      updatePopupContent(pointIndex, marker);
      if (!marker.isPopupOpen()) marker.openPopup();
      ensurePopupFullyVisible(marker);
    };

    leafletMap.once('moveend', finalize);
    window.setTimeout(finalize, 400);
  }

  async function showDirectionsToPoint(point, pointIndex) {
    if (!leafletMap || !point) return;

    clearRoute();

    let user;
    try {
      user = await getUserLocation();
    } catch {
      window.alert(t('homeGisMapDirectionsGpsError', 'Không lấy được vị trí GPS. Vui lòng bật quyền truy cập vị trí và thử lại.'));
      return;
    }

    userLocationMarker = L.circleMarker([user.lat, user.lng], {
      radius: 9,
      fillColor: '#2563eb',
      color: '#ffffff',
      weight: 2,
      fillOpacity: 1
    })
      .addTo(leafletMap)
      .bindTooltip(
        `${t('homeGisMapYourLocation', 'Vị trí của bạn')}<br>${formatCoordinates(user.lat, user.lng)}`,
        { permanent: false, direction: 'top' }
      );

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${user.lng},${user.lat};${point.lng},${point.lat}?overview=full&geometries=geojson`;
      const [res, originAddress] = await Promise.all([
        fetch(osrmUrl, { headers: { Accept: 'application/json' } }),
        reverseGeocodeOrigin(user.lat, user.lng)
      ]);
      if (!res.ok) throw new Error('route-http');
      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes?.[0]?.geometry?.coordinates?.length) {
        throw new Error('route-empty');
      }

      const route = data.routes[0];
      activeRouteSummary = {
        pointIndex,
        distanceM: route.distance,
        durationS: route.duration,
        originLat: user.lat,
        originLng: user.lng,
        originText: originAddress || t('homeGisMapRouteOriginUnknown', 'Không xác định'),
        destText: point.title,
        destLat: point.lat,
        destLng: point.lng
      };

      const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
      routeLayer = L.polyline(coords, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.88,
        lineJoin: 'round'
      }).addTo(leafletMap);

      const entry = markerEntries.find(m => m.globalIndex === pointIndex);
      if (entry?.marker) updatePopupContent(pointIndex, entry.marker);
      focusMapOnRouteAndPopup(pointIndex, coords, user, point);
    } catch {
      window.alert(t('homeGisMapDirectionsRouteError', 'Không tìm được đường đi. Vui lòng thử lại sau.'));
      clearRoute();
    }
  }

  function buildGalleryImagesBlock(urls, title) {
    if (!urls.length) return '';
    const slides = urls.map((url, index) =>
      `<button type="button"
         class="home-gis-map__popup-album-slide"
         data-gis-album-open="${index}"
         aria-label="${escapeHtml(t('homeGisMapAlbumView', 'Xem ảnh đầy đủ'))}">
         <img src="${escapeHtml(url)}" alt="${escapeHtml(title)}" loading="lazy" draggable="false">
       </button>`
    ).join('');
    const urlsAttr = escapeHtml(JSON.stringify(urls));
    return `
      <div class="home-gis-map__popup-album"
           data-gis-album-urls="${urlsAttr}"
           data-gis-album-title="${escapeHtml(title)}"
           aria-label="${escapeHtml(t('homeGisMapAlbum', 'Album hình'))}">
        <div class="home-gis-map__popup-album-track">${slides}</div>
      </div>`;
  }

  function ensureAlbumLightbox() {
    let el = document.getElementById('homeGisAlbumLightbox');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'homeGisAlbumLightbox';
    el.className = 'home-gis-map__album-lightbox d-none';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = `
      <div class="home-gis-map__album-lightbox-backdrop" data-gis-album-close="1"></div>
      <div class="home-gis-map__album-lightbox-panel">
        <button type="button" class="home-gis-map__album-lightbox-close" data-gis-album-close="1" aria-label="${escapeHtml(t('homeGisMapAlbumClose', 'Đóng'))}">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
        <button type="button" class="home-gis-map__album-lightbox-nav home-gis-map__album-lightbox-nav--prev" data-gis-album-step="-1" aria-label="${escapeHtml(t('homeGisMapAlbumPrev', 'Ảnh trước'))}">
          <i class="bi bi-chevron-left" aria-hidden="true"></i>
        </button>
        <button type="button" class="home-gis-map__album-lightbox-nav home-gis-map__album-lightbox-nav--next" data-gis-album-step="1" aria-label="${escapeHtml(t('homeGisMapAlbumNext', 'Ảnh sau'))}">
          <i class="bi bi-chevron-right" aria-hidden="true"></i>
        </button>
        <div class="home-gis-map__album-lightbox-stage">
          <img src="" alt="" class="home-gis-map__album-lightbox-img">
        </div>
        <div class="home-gis-map__album-lightbox-meta">
          <span class="home-gis-map__album-lightbox-counter"></span>
          <span class="home-gis-map__album-lightbox-caption"></span>
        </div>
      </div>`;
    document.body.appendChild(el);

    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-gis-album-close]')) {
        closeAlbumLightbox();
        return;
      }
      const stepBtn = e.target.closest('[data-gis-album-step]');
      if (stepBtn) {
        stepAlbumLightbox(parseInt(stepBtn.getAttribute('data-gis-album-step'), 10) || 0);
      }
    });

    if (!document.body.dataset.gisAlbumKeyBound) {
      document.body.dataset.gisAlbumKeyBound = '1';
      document.addEventListener('keydown', (e) => {
        const box = document.getElementById('homeGisAlbumLightbox');
        if (!box || box.classList.contains('d-none')) return;
        if (e.key === 'Escape') closeAlbumLightbox();
        if (e.key === 'ArrowLeft') stepAlbumLightbox(-1);
        if (e.key === 'ArrowRight') stepAlbumLightbox(1);
      });
    }

    return el;
  }

  function renderAlbumLightbox() {
    const el = ensureAlbumLightbox();
    const { urls, index, title } = albumLightboxState;
    if (!urls.length) return;

    const img = el.querySelector('.home-gis-map__album-lightbox-img');
    const counter = el.querySelector('.home-gis-map__album-lightbox-counter');
    const caption = el.querySelector('.home-gis-map__album-lightbox-caption');
    const prev = el.querySelector('.home-gis-map__album-lightbox-nav--prev');
    const next = el.querySelector('.home-gis-map__album-lightbox-nav--next');
    const url = urls[index];

    if (img) {
      img.src = url;
      img.alt = title || '';
    }
    if (counter) counter.textContent = `${index + 1} / ${urls.length}`;
    if (caption) caption.textContent = title || '';
    if (prev) prev.classList.toggle('d-none', urls.length <= 1);
    if (next) next.classList.toggle('d-none', urls.length <= 1);
  }

  function openAlbumLightbox(urls, index, title) {
    const list = (urls || []).filter(Boolean);
    if (!list.length) return;

    albumLightboxState = {
      urls: list,
      index: Math.max(0, Math.min(index || 0, list.length - 1)),
      title: title || ''
    };

    const el = ensureAlbumLightbox();
    renderAlbumLightbox();
    el.classList.remove('d-none');
    document.body.classList.add('home-gis-map__album-lightbox-open');
  }

  function closeAlbumLightbox() {
    const el = document.getElementById('homeGisAlbumLightbox');
    if (el) el.classList.add('d-none');
    document.body.classList.remove('home-gis-map__album-lightbox-open');
    const img = el?.querySelector('.home-gis-map__album-lightbox-img');
    if (img) img.removeAttribute('src');
  }

  function stepAlbumLightbox(delta) {
    const { urls } = albumLightboxState;
    if (!urls.length) return;
    const next = (albumLightboxState.index + delta + urls.length) % urls.length;
    albumLightboxState.index = next;
    renderAlbumLightbox();
  }

  function bindAlbumOpenInPopup(marker) {
    const popupEl = marker?.getPopup()?.getElement?.();
    if (!popupEl || !window.L?.DomEvent) return;

    popupEl.querySelectorAll('[data-gis-album-open]').forEach(btn => {
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.on(btn, 'click', (e) => {
        L.DomEvent.stop(e);
        const album = btn.closest('[data-gis-album-urls]');
        if (!album) return;
        let urls = [];
        try {
          urls = JSON.parse(album.getAttribute('data-gis-album-urls') || '[]');
        } catch {
          urls = [];
        }
        const index = parseInt(btn.getAttribute('data-gis-album-open'), 10) || 0;
        const title = album.getAttribute('data-gis-album-title') || '';
        openAlbumLightbox(urls, index, title);
      });
    });
  }

  function getPopupMaxWidth() {
    return window.matchMedia('(max-width: 991.98px)').matches ? 225 : 450;
  }

  function shouldShowDescToggle(content) {
    const text = String(content || '').replace(/\s+/g, ' ').trim();
    return text.length > 110;
  }

  function buildDescBlock(content, pointIndex) {
    if (!content) return '';
    const expandLabel = t('homeGisMapDescExpand', 'Xem tiếp');
    const collapseLabel = t('homeGisMapDescCollapse', 'Thu gọn');
    const expanded = !!descExpandedByPoint[pointIndex];
    const showToggle = shouldShowDescToggle(content);
    const toggleHtml = showToggle
      ? `<button type="button"
           class="home-gis-map__popup-desc-toggle"
           data-gis-desc-toggle="${pointIndex}"
           aria-expanded="${expanded ? 'true' : 'false'}">${escapeHtml(expanded ? collapseLabel : expandLabel)}</button>`
      : '';

    return `
      <div class="home-gis-map__popup-desc-wrap${expanded ? ' is-expanded' : ''}">
        <p class="home-gis-map__popup-desc">${escapeHtml(content)}</p>
        ${toggleHtml}
      </div>`;
  }

  function applyPopupLayoutConstraints(marker) {
    if (!leafletMap || !marker) return;
    const popup = marker.getPopup();
    const popupEl = popup?.getElement?.();
    if (!popupEl) return;

    const mapH = leafletMap.getSize().y;
    const maxH = Math.max(180, Math.floor(mapH * 0.88));
    popupEl.style.setProperty('--gis-popup-max-h', `${maxH}px`);

    if (typeof popup.options.maxWidth === 'number') {
      popup.options.maxWidth = getPopupMaxWidth();
    }
  }

  function refreshPopupLayout(marker) {
    const popup = marker?.getPopup?.();
    if (!popup || !marker.isPopupOpen()) return;
    applyPopupLayoutConstraints(marker);
    // Avoid popup.update() — it rewrites innerHTML and wipes UI state.
    if (typeof popup._updateLayout === 'function') popup._updateLayout();
    if (typeof popup._updatePosition === 'function') popup._updatePosition();
    if (typeof popup._adjustPan === 'function') popup._adjustPan();
  }

  function bindDescToggleInPopup(marker) {
    const popupEl = marker?.getPopup()?.getElement?.();
    if (!popupEl || !window.L?.DomEvent) return;

    popupEl.querySelectorAll('[data-gis-desc-toggle]').forEach(btn => {
      if (btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.on(btn, 'click', (e) => {
        L.DomEvent.stop(e);
        const pointIndex = parseInt(btn.getAttribute('data-gis-desc-toggle'), 10);
        if (isNaN(pointIndex) || !currentPoints[pointIndex]) return;

        descExpandedByPoint[pointIndex] = !descExpandedByPoint[pointIndex];
        const entry = markerEntries.find(m => m.globalIndex === pointIndex);
        const target = entry?.marker || marker;
        if (!target) return;

        target.setPopupContent(buildInfoContent(currentPoints[pointIndex], pointIndex));
        window.requestAnimationFrame(() => {
          bindDescToggleInPopup(target);
          bindAlbumOpenInPopup(target);
          refreshPopupLayout(target);
          playHeroVideoInPopup(target);
        });
      });
    });
  }

  function onPopupOpened(marker) {
    playHeroVideoInPopup(marker);
    applyPopupLayoutConstraints(marker);
    window.requestAnimationFrame(() => {
      bindDescToggleInPopup(marker);
      bindAlbumOpenInPopup(marker);
      refreshPopupLayout(marker);
    });
  }

  function buildInfoContent(point, pointIndex) {
    const imageUrls = point.imageUrls?.length ? point.imageUrls : (point.imageUrl ? [point.imageUrl] : []);
    const hasVideo = !!point.videoUrl;
    const heroImageUrl = !hasVideo && imageUrls.length ? imageUrls[0] : '';
    const galleryUrls = hasVideo ? imageUrls : imageUrls.slice(1);

    const heroBlock = hasVideo
      ? `<div class="home-gis-map__popup-media home-gis-map__popup-media--hero">
           <video class="home-gis-map__popup-hero-video" data-gis-hero-video="1" src="${escapeHtml(point.videoUrl)}" controls preload="metadata" playsinline autoplay></video>
         </div>`
      : (heroImageUrl
        ? `<div class="home-gis-map__popup-media home-gis-map__popup-media--hero">
             <img src="${escapeHtml(heroImageUrl)}" alt="${escapeHtml(point.title)}">
           </div>`
        : '');

    const galleryBlock = buildGalleryImagesBlock(galleryUrls, point.title);

    const categoryLabel = point.categoryName || point.category || '';
    const pinColor = point.categoryColor ? normalizePinColor(point.categoryColor) : '';
    const catStyle = pinColor ? ` style="--cat-color:${escapeHtml(pinColor)};--pin-color:${escapeHtml(pinColor)}"` : '';

    const audioBlock = point.audioUrl
      ? `<div class="home-gis-map__popup-audio">
           <audio src="${escapeHtml(point.audioUrl)}" controls preload="metadata"></audio>
         </div>`
      : '';

    const moreLabel = t('homeGisMapViewMore', t('viewMore', t('viewContinue', 'Xem thêm')));
    const directionsLabel = t('homeGisMapDirections', 'Chỉ đường');
    const directionsBtn = `<button type="button" class="home-gis-map__popup-directions" data-gis-directions="${pointIndex}"><i class="bi bi-geo-alt-fill" aria-hidden="true"></i><span>${escapeHtml(directionsLabel)}</span></button>`;
    const detailBtn = point.link
      ? `<a class="home-gis-map__popup-detail heritage-btn-continue" href="${escapeHtml(point.link)}">${escapeHtml(moreLabel)}</a>`
      : '';
    const actionsBlock = (directionsBtn || detailBtn)
      ? `<div class="home-gis-map__popup-actions">${directionsBtn}${detailBtn}</div>`
      : '';
    const routeBlock = buildRouteInfoBlock(pointIndex, point);

    return `
      <div class="home-gis-map__infowin">
        ${heroBlock}
        <div class="home-gis-map__popup-body">
          <h3 class="home-gis-map__popup-title">${escapeHtml(point.title)}</h3>
          ${categoryLabel ? `<p class="home-gis-map__popup-cat"${catStyle}>${escapeHtml(categoryLabel)}</p>` : ''}
          ${galleryBlock}
          ${audioBlock}
          ${buildDescBlock(point.content, pointIndex)}
          ${routeBlock}
          ${actionsBlock}
        </div>
      </div>`;
  }

  function clearMarkers() {
    markerEntries.forEach(entry => entry.marker.remove());
    markerEntries = [];
  }

  function updateMarkerStyles(activeIndex) {
    markerEntries.forEach(entry => {
      const active = entry.globalIndex === activeIndex;
      entry.marker.setIcon(pinIcon(entry.point, active));
      if (active) entry.marker.setZIndexOffset(1000);
      else entry.marker.setZIndexOffset(0);
    });
  }

  function hideMapPopup() {
    stopPopupMedia();
    clearRoute();
    closeAlbumLightbox();
    if (leafletMap) leafletMap.closePopup();
    popupIndex = -1;
    descExpandedByPoint = {};
    updateMarkerStyles(-1);
    renderList(filteredPoints.length ? filteredPoints : currentPoints);
  }

  function openMarkerPopup(index, marker) {
    if (index < 0 || index >= currentPoints.length || !leafletMap || !marker) return;
    stopPopupMedia();
    clearRoute();
    popupSwitching = true;
    if (popupIndex !== index) descExpandedByPoint = {};
    popupIndex = index;
    marker.setPopupContent(buildInfoContent(currentPoints[index], index));
    marker.openPopup();
    onPopupOpened(marker);
    updateMarkerStyles(index);
    renderList(filteredPoints.length ? filteredPoints : currentPoints);
    window.setTimeout(() => { popupSwitching = false; }, 0);
  }

  function renderMarkers(points, activeIndex) {
    if (!leafletMap) return;
    clearMarkers();

    points.forEach(point => {
      const globalIndex = currentPoints.indexOf(point);
      if (globalIndex < 0) return;

      const marker = L.marker([point.lat, point.lng], {
        icon: pinIcon(point, globalIndex === activeIndex),
        title: point.title
      });

      marker.bindPopup(buildInfoContent(point, globalIndex), {
        maxWidth: getPopupMaxWidth(),
        minWidth: window.matchMedia('(max-width: 991.98px)').matches ? 180 : 320,
        className: 'home-gis-map__leaflet-popup',
        closeButton: true,
        autoPanPadding: [24, 24]
      });

      marker.on('popupopen', () => onPopupOpened(marker));
      marker.on('popupclose', () => stopPopupMedia());
      marker.on('click', () => openMarkerPopup(globalIndex, marker));
      marker.addTo(leafletMap);
      markerEntries.push({ marker, point, globalIndex });
    });
  }

  function renderList(points) {
    const list = document.getElementById('homeGisMapList');
    if (!list) return;

    if (!points.length) {
      list.innerHTML = '';
      list.hidden = true;
      return;
    }

    list.hidden = false;
    list.innerHTML = points.map(point => {
      const globalIndex = currentPoints.indexOf(point);
      const isActive = globalIndex === popupIndex;
      const thumb = point.imageUrl
        ? `<img src="${escapeHtml(point.imageUrl)}" alt="" class="home-gis-map__list-thumb">`
        : `<span class="home-gis-map__list-thumb home-gis-map__list-thumb--empty" aria-hidden="true"><i class="bi bi-image"></i></span>`;

      const pinColor = point.categoryColor ? normalizePinColor(point.categoryColor) : '';
      const catStyle = pinColor ? ` style="--cat-color:${escapeHtml(pinColor)};--pin-color:${escapeHtml(pinColor)}"` : '';
      const categoryBadge = (point.categoryName || point.category)
        ? `<span class="home-gis-map__list-cat"${catStyle}>${escapeHtml(point.categoryName || point.category)}</span>`
        : '';
      const excerpt = truncateExcerpt(point.content, 50);
      const excerptHtml = excerpt
        ? `<span class="home-gis-map__list-desc">${escapeHtml(excerpt)}</span>`
        : '';

      return `
        <li class="home-gis-map__list-item${isActive ? ' is-active' : ''}" data-point-index="${globalIndex}" role="button" tabindex="0" aria-label="${escapeHtml(point.title)}">
          <div class="home-gis-map__list-body">
            ${thumb}
            <span class="home-gis-map__list-text">
              <span class="home-gis-map__list-title">${escapeHtml(point.title)}</span>
              ${excerptHtml}
              ${categoryBadge}
            </span>
          </div>
        </li>`;
    }).join('');
  }

  function focusOnPoint(index) {
    if (!leafletMap || index < 0 || index >= currentPoints.length) return;
    const visible = filteredPoints.length ? filteredPoints : currentPoints;
    if (!visible.some(p => currentPoints.indexOf(p) === index)) return;

    const entry = markerEntries.find(m => m.globalIndex === index);
    if (entry) openMarkerPopup(index, entry.marker);
  }

  function applyDefaultMapView(points) {
    applyProvinceView(points);
  }

  function showOverviewMap() {
    const visible = filteredPoints.length ? filteredPoints : currentPoints;
    renderMarkers(visible, popupIndex);
    applyProvinceView(visible);
  }

  function applySearch() {
    const input = document.getElementById('homeGisMapSearch');
    const categorySelect = document.getElementById('homeGisMapCategory');
    searchQuery = input ? input.value : '';
    const categoryFilter = categorySelect ? categorySelect.value : '';
    filteredPoints = filterPoints(currentPoints, searchQuery, categoryFilter);

    hideMapPopup();

    if (!filteredPoints.length) {
      const list = document.getElementById('homeGisMapList');
      if (list) {
        list.hidden = true;
        list.innerHTML = '';
      }
      clearMarkers();
      return;
    }

    showOverviewMap();
    renderList(filteredPoints);
  }

  function initMap() {
    const el = document.getElementById('homeGisMapCanvas');
    if (!el || !window.L?.map) return false;

    const view = defaultMapView || resolveDefaultMapView();
    leafletMap = L.map(el, { scrollWheelZoom: true, attributionControl: false }).setView([view.lat, view.lng], view.zoom);

    addOsmStreetLayer(leafletMap);
    loadProvinceBoundary();
    addIslandMarkers();

    leafletMap.on('click', () => hideMapPopup());
    leafletMap.on('popupclose', () => {
      stopPopupMedia();
      if (popupSwitching) return;
      if (popupIndex >= 0) {
        popupIndex = -1;
        updateMarkerStyles(-1);
        renderList(filteredPoints.length ? filteredPoints : currentPoints);
      }
    });
    return true;
  }

  function resetMapDom() {
    hideMapPopup();
    clearRoute();
    clearMarkers();
    clearIslandMarkers();
    clearProvinceBoundary();
    if (leafletMap) {
      leafletMap.off();
      leafletMap.remove();
      leafletMap = null;
    }
    currentPoints = [];
    filteredPoints = [];
    popupIndex = -1;
    searchQuery = '';
    defaultMapView = null;
    baseTileLayer = null;
    tileProviderIndex = 0;
    baseMapMode = 'street';
    baseOverlayLayer = null;
    descExpandedByPoint = {};
    closeAlbumLightbox();
  }

  function bindSearch() {
    const input = document.getElementById('homeGisMapSearch');
    if (input && input.dataset.bound !== '1') {
      input.dataset.bound = '1';
      input.addEventListener('input', () => applySearch());
    }
    const categorySelect = document.getElementById('homeGisMapCategory');
    if (categorySelect && categorySelect.dataset.bound !== '1') {
      categorySelect.dataset.bound = '1';
      categorySelect.addEventListener('change', () => applySearch());
    }

    const list = document.getElementById('homeGisMapList');
    if (list && list.dataset.bound !== '1') {
      list.dataset.bound = '1';
      list.addEventListener('click', (e) => {
        const item = e.target.closest('[data-point-index]');
        if (!item) return;
        const index = parseInt(item.dataset.pointIndex, 10);
        if (!isNaN(index)) focusOnPoint(index);
      });
      list.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const item = e.target.closest('[data-point-index]');
        if (!item) return;
        e.preventDefault();
        const index = parseInt(item.dataset.pointIndex, 10);
        if (!isNaN(index)) focusOnPoint(index);
      });
    }

    const mapWrap = document.getElementById('homeGisMapWrap');
    if (mapWrap && mapWrap.dataset.directionsBound !== '1') {
      mapWrap.dataset.directionsBound = '1';
      mapWrap.addEventListener('click', (e) => {
        const basemapBtn = e.target.closest('[data-basemap]');
        if (basemapBtn) {
          e.preventDefault();
          e.stopPropagation();
          setBaseMap(basemapBtn.dataset.basemap);
          return;
        }

        const descToggle = e.target.closest('[data-gis-desc-toggle]');
        if (descToggle) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }

        const btn = e.target.closest('[data-gis-directions]');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(btn.dataset.gisDirections, 10);
        if (!isNaN(index) && currentPoints[index]) {
          showDirectionsToPoint(currentPoints[index], index);
        }
      });
    }
  }

  async function loadHomeGisMap() {
    const section = document.getElementById('homeGisMapSection');
    if (!section) return;

    resetMapDom();
    section.classList.add('d-none');

    const leafletReady = await waitForLeaflet(15000);
    if (!leafletReady) return;

    await loadTranslations();
    applySectionI18n(section);
    bindSearch();

    const searchInput = document.getElementById('homeGisMapSearch');
    if (searchInput) searchInput.value = '';
    const categorySelect = document.getElementById('homeGisMapCategory');
    if (categorySelect) categorySelect.value = '';

    const langCode = getLangCode();
    let payload;
    let categories = [];
    try {
      const [mapRes, catRes] = await Promise.all([
        fetch(`${API_MAP_URL}?langCode=${encodeURIComponent(langCode)}`, { headers: { Accept: 'application/json' } }),
        fetch(`${API_CATEGORIES_URL}?langCode=${encodeURIComponent(langCode)}`, { headers: { Accept: 'application/json' } })
      ]);
      if (!mapRes.ok) return;
      payload = await mapRes.json();
      if (catRes.ok) {
        const catData = await catRes.json();
        categories = catData?.items || catData?.Items || [];
      }
    } catch {
      return;
    }

    const rawItems = payload?.items || payload?.Items || [];
    const points = rawItems.map(normalizePoint).filter(Boolean);
    if (!points.length) return;

    const fallbackCategories = [...new Map(
      points
        .filter(p => p.category)
        .map(p => [p.category, { code: p.category, name: p.categoryName || p.category, icon: p.categoryIcon, color: p.categoryColor }])
    ).values()];
    const resolvedCategories = categories.length ? categories : fallbackCategories;
    enrichPointsWithCategoryStyles(points, resolvedCategories);

    currentPoints = points;
    filteredPoints = points.slice();
    defaultMapView = resolveDefaultMapView();

    populateCategoryFilter(resolvedCategories);

    section.classList.remove('d-none');

    if (!initMap()) return;

    renderList(filteredPoints);
    window.requestAnimationFrame(() => {
      refreshMapLayout();
      setTimeout(refreshMapLayout, 200);
      setTimeout(refreshMapLayout, 600);
    });

    // Swap default SVG glyphs for real category icons (Safari-safe inline SVG)
    preloadPinGlyphs(points).then((changed) => {
      if (!changed || !leafletMap) return;
      const visible = filteredPoints.length ? filteredPoints : currentPoints;
      renderMarkers(visible, popupIndex);
    });
  }

  function bootHomeGisMap() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadHomeGisMap);
    } else {
      loadHomeGisMap();
    }
  }

  bootHomeGisMap();
  window.addEventListener('languageChanged', loadHomeGisMap);
})();
