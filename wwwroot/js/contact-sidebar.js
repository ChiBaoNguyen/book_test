/* Contact info + quick support boxes (contact page sidebar + home map row) */
(function () {
  'use strict';

  function getSetting(...keys) {
    if (typeof getSiteSetting === 'function') {
      return getSiteSetting(...keys);
    }
    const settings = window.SITE_SETTINGS || {};
    for (const key of keys) {
      const value = (settings[key] || '').trim();
      if (value) return value;
    }
    return '';
  }

  function setContactInfoField(field, value) {
    const row = document.querySelector(`#contactInfoBox [data-contact-field="${field}"]`);
    if (!row) return;
    const valueEl = row.querySelector('.contact-info-item__value');
    if (!value) {
      row.classList.add('d-none');
      if (valueEl) valueEl.textContent = '';
      return;
    }
    row.classList.remove('d-none');
    if (valueEl) valueEl.textContent = value;
  }

  function toTelHref(phone) {
    if (!phone) return '#';
    const normalized = phone.replace(/[^\d+]/g, '');
    return normalized ? `tel:${normalized}` : '#';
  }

  function applyContactInfoSettings() {
    const box = document.getElementById('contactInfoBox');
    if (!box) return;

    const orgName = getSetting('SITE_NAME', 'company_name', 'company', 'brandName');
    const orgEl = document.getElementById('contactInfoOrgName');
    if (orgEl) orgEl.textContent = orgName;

    setContactInfoField('address', getSetting('SITE_ADDRESS', 'COMPANY_ADDRESS'));
    setContactInfoField('phone', getSetting('SITE_PHONE'));
    setContactInfoField('email', getSetting('SITE_EMAIL'));
    setContactInfoField('fax', getSetting('SITE_FAX'));
    setContactInfoField('website', getSetting('SITE_URL', 'SITE_WEBSITE', 'WEBSITE_URL'));
    setContactInfoField('zalo', getSetting('ZALO_OA', 'ZALO_NAME', 'SITE_ZALO'));
  }

  function applyQuickSupportSettings() {
    const box = document.getElementById('contactActionsBox');
    const hotlineLink = document.getElementById('contactActionHotline');
    const hotlineSub = document.getElementById('contactActionHotlineSub');
    const zaloLink = document.getElementById('contactActionZalo');
    const zaloSub = document.getElementById('contactActionZaloSub');

    const phone = getSetting('SITE_PHONE');
    const zaloUrl = getSetting('ZALO_URL', 'ZALO_LINK', 'SITE_ZALO_URL');
    const zaloName = getSetting('ZALO_OA', 'ZALO_NAME', 'SITE_ZALO');

    let visible = 0;

    if (phone && hotlineLink) {
      hotlineLink.href = toTelHref(phone);
      if (hotlineSub) hotlineSub.textContent = phone;
      hotlineLink.classList.remove('d-none');
      visible += 1;
    } else {
      hotlineLink?.classList.add('d-none');
    }

    if (zaloUrl && zaloLink) {
      zaloLink.href = zaloUrl;
      if (zaloSub) zaloSub.textContent = zaloName || zaloUrl;
      zaloLink.classList.remove('d-none');
      visible += 1;
    } else {
      zaloLink?.classList.add('d-none');
    }

    if (box) box.classList.toggle('d-none', visible === 0);
  }

  function refresh() {
    applyContactInfoSettings();
    applyQuickSupportSettings();
  }

  function hasBoxes() {
    return document.getElementById('contactInfoBox') || document.getElementById('contactActionsBox');
  }

  window.ContactSidebar = { refresh };

  document.addEventListener('DOMContentLoaded', () => {
    if (hasBoxes()) refresh();
  });
})();
