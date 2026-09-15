/* Shared Google Maps embed section (contact + homepage) */
(function () {
  'use strict';

  let translations = {};
  let defaultLang = 'vi';

  function currentLang() {
    return (localStorage.getItem('selectedLanguage') || defaultLang).toLowerCase();
  }

  function t(key, fallback) {
    const langPack = translations[currentLang()] || translations[defaultLang] || {};
    return langPack[key] || fallback || key;
  }

  async function loadTranslations() {
    try {
      const res = await fetch('/locales/page.json');
      if (!res.ok) return;
      const data = await res.json();
      defaultLang = data.default || 'vi';
      translations = data;
    } catch {
      /* ignore */
    }
  }

  function buildMapEmbedUrl(address, lat, lng, embedUrl) {
    if (embedUrl) return embedUrl;

    const hasCoords = lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));
    if (hasCoords) {
      return `https://www.google.com/maps?q=${lat},${lng}&hl=vi&z=16&output=embed`;
    }

    if (!address) return '';
    return `https://www.google.com/maps?q=${encodeURIComponent(address)}&hl=vi&z=16&output=embed`;
  }

  function buildMapExternalUrl(address, lat, lng) {
    const hasCoords = lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));
    if (hasCoords) {
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    }
    if (!address) return '#';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  function applySectionI18n(section) {
    section.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const value = t(key);
      if (value) el.textContent = value;
    });
  }

  function initSection(section) {
    const iframe = section.querySelector('.site-map-iframe');
    if (!iframe) return;

    const link = section.querySelector('.site-map-external-link');
    const getSetting = typeof getSiteSetting === 'function'
      ? getSiteSetting
      : function () { return ''; };

    const address = getSetting('SITE_ADDRESS', 'COMPANY_ADDRESS');
    const lat = getSetting('SITE_LAT', 'SITE_LATITUDE', 'LATITUDE');
    const lng = getSetting('SITE_LNG', 'SITE_LONGITUDE', 'LONGITUDE');
    const embedUrl = getSetting('SITE_MAP_EMBED_URL', 'GOOGLE_MAP_EMBED', 'SITE_MAP_URL');
    const src = buildMapEmbedUrl(address, lat, lng, embedUrl);

    if (!src) {
      section.classList.add('d-none');
      iframe.removeAttribute('src');
      return;
    }

    section.classList.remove('d-none');
    iframe.src = src;
    if (link) link.href = buildMapExternalUrl(address, lat, lng);
  }

  function refreshAll() {
    document.querySelectorAll('[data-site-map-section]').forEach(section => {
      applySectionI18n(section);
      initSection(section);
    });
  }

  async function boot() {
    await loadTranslations();
    refreshAll();
  }

  document.addEventListener('DOMContentLoaded', boot);
  window.addEventListener('languageChanged', boot);

  window.SiteMap = { refresh: refreshAll };
})();
