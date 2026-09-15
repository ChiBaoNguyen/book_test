(function () {
  'use strict';

  const cfg = window.CONTACT_PAGE || {};
  let langCode = localStorage.getItem('selectedLanguage') || 'vi';
  let translations = {};
  let defaultLang = 'vi';
  let captchaResult = 0;
  let faqCache = [];

  function pickFaqTranslation(faq) {
    const translations = faq?.translations || faq?.Translations || [];
    if (!Array.isArray(translations) || !translations.length) return null;
    const lang = (langCode || 'vi').toLowerCase();
    let tr = translations.find(x =>
      (x.languageCode || x.LanguageCode || '').toLowerCase() === lang
    );
    if (!tr && lang.length >= 2) {
      tr = translations.find(x => {
        const tLang = (x.languageCode || x.LanguageCode || '').toLowerCase();
        return tLang.length >= 2 && tLang.substring(0, 2) === lang.substring(0, 2);
      });
    }
    return tr || translations[0] || null;
  }

  function bindFaqAccordion() {
    document.querySelectorAll('.contact-faq-item').forEach(item => {
      const trigger = item.querySelector('.contact-faq-trigger');
      if (!trigger || trigger.dataset.bound === '1') return;
      trigger.dataset.bound = '1';
      trigger.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.contact-faq-item').forEach(i => {
          i.classList.remove('open');
          const ic = i.querySelector('.contact-faq-icon i');
          if (ic) ic.className = 'bi bi-plus';
          i.querySelector('.contact-faq-trigger')?.setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          item.classList.add('open');
          const ic = item.querySelector('.contact-faq-icon i');
          if (ic) ic.className = 'bi bi-dash';
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  function renderFaqs() {
    const listEl = document.getElementById('contactFaqList');
    if (!listEl) return;

    if (!faqCache.length) {
      listEl.innerHTML = `<p class="contact-faq-empty mb-0">${escapeHtml(t('contactFaqEmpty'))}</p>`;
      return;
    }

    const sorted = [...faqCache].sort((a, b) =>
      (a.sortOrder ?? a.SortOrder ?? 0) - (b.sortOrder ?? b.SortOrder ?? 0)
    );

    listEl.innerHTML = '';
    let rendered = 0;
    sorted.forEach((faq, index) => {
      const tr = pickFaqTranslation(faq);
      if (!tr) return;
      const question = (tr.question || tr.Question || '').trim();
      const answer = tr.answer || tr.Answer || '';
      if (!question) return;

      const isFirst = rendered === 0;
      rendered += 1;

      const item = document.createElement('div');
      item.className = `contact-faq-item${isFirst ? ' open' : ''}`;
      item.innerHTML = `
        <button type="button" class="contact-faq-trigger" aria-expanded="${isFirst ? 'true' : 'false'}">
          <span></span>
          <span class="contact-faq-icon"><i class="bi ${isFirst ? 'bi-dash' : 'bi-plus'}"></i></span>
        </button>
        <div class="contact-faq-answer"></div>
      `;
      item.querySelector('.contact-faq-trigger span:first-child').textContent = question;
      item.querySelector('.contact-faq-answer').innerHTML = answer;
      listEl.appendChild(item);
    });

    if (!rendered) {
      listEl.innerHTML = `<p class="contact-faq-empty mb-0">${escapeHtml(t('contactFaqEmpty'))}</p>`;
      return;
    }

    bindFaqAccordion();
  }

  async function loadFaqs() {
    const listEl = document.getElementById('contactFaqList');
    if (!listEl) return;

    listEl.innerHTML = `
      <div class="contact-faq-loading text-center py-4">
        <div class="spinner-border spinner-border-sm text-warning" role="status"></div>
      </div>`;

    try {
      const listRes = await fetch('/api/Portal/faqs?pageNumber=1&pageSize=100');
      if (!listRes.ok) throw new Error('list failed');
      const listData = await listRes.json();
      const items = listData.items || listData.Items || [];
      if (!items.length) {
        faqCache = [];
        renderFaqs();
        return;
      }

      const details = await Promise.all(items.map(async (item) => {
        const id = item.id || item.Id;
        if (!id) return null;
        try {
          const res = await fetch(`/api/Portal/faq/${encodeURIComponent(id)}`);
          if (!res.ok) return null;
          return await res.json();
        } catch (e) {
          return null;
        }
      }));

      faqCache = details.filter(Boolean);
      renderFaqs();
    } catch (e) {
      listEl.innerHTML = `<p class="contact-faq-error mb-0">${escapeHtml(t('contactFaqError'))}</p>`;
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function t(key) {
    if (langCode && translations[langCode]) {
      return translations[langCode][key] || translations[defaultLang]?.[key] || key;
    }
    return translations[defaultLang]?.[key] || key;
  }

  async function loadTranslations() {
    try {
      const res = await fetch('/locales/page.json');
      if (!res.ok) return;
      const data = await res.json();
      defaultLang = data.default || 'vi';
      translations = data;
    } catch (e) { /* ignore */ }
  }

  function getMenuTitleForLang(targetLang) {
    try {
      const raw = localStorage.getItem('currentMenuMatch');
      if (raw) {
        const menu = JSON.parse(raw);
        const list = menu.translations || menu.Translations || [];
        if (Array.isArray(list) && list.length) {
          const lang = (targetLang || 'vi').toLowerCase();
          let tr = list.find(x => (x.languageCode || x.LanguageCode || '').toLowerCase() === lang);
          if (!tr && lang.length >= 2) {
            tr = list.find(x => (x.languageCode || x.LanguageCode || '').toLowerCase().substring(0, 2) === lang.substring(0, 2));
          }
          tr = tr || list[0];
          const title = tr?.title || tr?.Title;
          if (title) return title;
        }
      }
    } catch (e) { /* ignore */ }
    const active = document.querySelector('.nav-link.active');
    if (active) return active.textContent.trim();
    return cfg.initialPageTitle || 'Liên hệ';
  }

  function getCurrentMenuIcon() {
    try {
      const raw = localStorage.getItem('currentMenuMatch');
      if (raw) {
        const menu = JSON.parse(raw);
        return (menu.icon || menu.Icon || '').trim();
      }
    } catch (e) { /* ignore */ }
    return '';
  }

  function buildMenuLabelHtml() {
    const title = getMenuTitleForLang(langCode);
    const display = escapeHtml((title || cfg.initialPageTitle || 'Liên hệ').toUpperCase());
    const icon = getCurrentMenuIcon();
    let iconHtml = '';
    if (icon && /\bcil\b/i.test(icon)) {
      iconHtml = `<i class="${escapeHtml(icon)} page-menu-label-icon" aria-hidden="true"></i>`;
    }
    return `<p class="page-menu-label">${iconHtml}<span>${display}</span></p>`;
  }

  function updatePageMenuLabel() {
    const el = document.getElementById('pageMenuLabel');
    if (el) el.innerHTML = buildMenuLabelHtml();
  }

  function updatePageTitle() {
    const title = getMenuTitleForLang(langCode);
    const siteName = document.title.includes(' - ')
      ? document.title.split(' - ').slice(1).join(' - ')
      : (document.title || '');
    document.title = siteName ? `${title} - ${siteName}` : title;
  }

  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.placeholder = t(key);
    });

    const nameLabel = document.getElementById('contactNameLabel');
    if (nameLabel) nameLabel.innerHTML = `${t('contactName')} <span class="text-danger">${t('required')}</span>`;
    const emailLabel = document.getElementById('contactEmailLabel');
    if (emailLabel) emailLabel.innerHTML = `${t('contactEmail')} <span class="text-danger">${t('required')}</span>`;
    const phoneLabel = document.getElementById('contactPhoneLabel');
    if (phoneLabel) phoneLabel.textContent = t('contactPhone');
    const subjectLabel = document.getElementById('contactSubjectLabel');
    if (subjectLabel) subjectLabel.innerHTML = `${t('contactSubject')} <span class="text-danger">${t('required')}</span>`;
    const messageLabel = document.getElementById('contactMessageLabel');
    if (messageLabel) messageLabel.innerHTML = `${t('contactMessage')} <span class="text-danger">${t('required')}</span>`;
    const securityLabel = document.getElementById('contactSecurityLabel');
    if (securityLabel) securityLabel.innerHTML = `${t('contactSecurity')} <span class="text-danger">${t('required')}</span>`;

    const nameInput = document.getElementById('name');
    if (nameInput) nameInput.placeholder = t('contactNamePlaceholder');
    const emailInput = document.getElementById('email');
    if (emailInput) emailInput.placeholder = t('contactEmailPlaceholder');
    const phoneInput = document.getElementById('phone');
    if (phoneInput) phoneInput.placeholder = t('contactPhonePlaceholder');
    const subjectInput = document.getElementById('subject');
    if (subjectInput) subjectInput.placeholder = t('contactSubjectPlaceholder');
    const messageInput = document.getElementById('message');
    if (messageInput) messageInput.placeholder = t('contactMessagePlaceholder');
    const captchaAnswer = document.getElementById('captchaAnswer');
    if (captchaAnswer) captchaAnswer.placeholder = t('contactCaptchaAnswer');
    const captchaError = document.getElementById('captchaError');
    if (captchaError) captchaError.textContent = t('contactCaptchaError');
    const refreshBtn = document.getElementById('refreshCaptcha');
    if (refreshBtn) refreshBtn.title = t('contactCaptchaRefresh');
    const submitText = document.getElementById('submitBtnText');
    if (submitText) submitText.textContent = t('contactSubmit');
  }

  function generateCaptcha() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operators = ['+', '-', '×'];
    const op = operators[Math.floor(Math.random() * operators.length)];
    let result, question;
    if (op === '+') {
      result = num1 + num2;
      question = `${num1} + ${num2} = ?`;
    } else if (op === '-') {
      const maxNum = Math.max(num1, num2);
      const minNum = Math.min(num1, num2);
      result = maxNum - minNum;
      question = `${maxNum} - ${minNum} = ?`;
    } else {
      result = num1 * num2;
      question = `${num1} × ${num2} = ?`;
    }
    captchaResult = result;
    const qEl = document.getElementById('captchaQuestion');
    if (qEl) qEl.textContent = question;
    const ans = document.getElementById('captchaAnswer');
    if (ans) { ans.value = ''; ans.classList.remove('is-invalid'); }
    const err = document.getElementById('captchaError');
    if (err) err.classList.add('d-none');
  }

  function initForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    generateCaptcha();
    document.getElementById('refreshCaptcha')?.addEventListener('click', generateCaptcha);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const alertDiv = document.getElementById('contactAlert');
      const alertMsg = document.getElementById('contactAlertMessage');
      const captchaError = document.getElementById('captchaError');
      const captchaAnswer = document.getElementById('captchaAnswer');
      const submitBtn = document.getElementById('submitBtn');
      const spinner = submitBtn?.querySelector('.spinner-border');
      const btnText = submitBtn?.querySelector('.btn-text');

      alertDiv?.classList.add('d-none');
      alertDiv?.classList.remove('alert-success', 'alert-danger');
      captchaError?.classList.add('d-none');

      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
      }

      const userAnswer = parseInt(captchaAnswer?.value.trim() || '', 10);
      if (isNaN(userAnswer) || userAnswer !== captchaResult) {
        captchaError?.classList.remove('d-none');
        captchaAnswer?.classList.add('is-invalid');
        generateCaptcha();
        return;
      }

      const subject = document.getElementById('subject')?.value.trim() || '';
      const message = document.getElementById('message')?.value.trim() || '';

      if (submitBtn) submitBtn.disabled = true;
      spinner?.classList.remove('d-none');
      if (btnText) btnText.textContent = t('contactSubmitting');

      try {
        const res = await fetch(cfg.submitUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: document.getElementById('name')?.value.trim(),
            email: document.getElementById('email')?.value.trim(),
            phone: document.getElementById('phone')?.value.trim() || null,
            subject,
            message
          })
        });
        const result = await res.json();
        if (res.ok && result.success) {
          alertDiv?.classList.remove('d-none');
          alertDiv?.classList.add('alert-success');
          if (alertMsg) alertMsg.textContent = result.message || t('contactSuccess');
          form.reset();
          form.classList.remove('was-validated');
          generateCaptcha();
        } else {
          alertDiv?.classList.remove('d-none');
          alertDiv?.classList.add('alert-danger');
          if (alertMsg) alertMsg.textContent = result.message || t('contactError');
        }
      } catch (err) {
        alertDiv?.classList.remove('d-none');
        alertDiv?.classList.add('alert-danger');
        if (alertMsg) alertMsg.textContent = t('contactError');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        spinner?.classList.add('d-none');
        if (btnText) btnText.textContent = t('contactSubmit');
        alertDiv?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  function getSiteSetting(...keys) {
    const settings = window.SITE_SETTINGS || {};
    for (const key of keys) {
      const value = (settings[key] || '').trim();
      if (value) return value;
    }
    return '';
  }

  function applyContactSidebarSettings() {
    if (window.ContactSidebar?.refresh) {
      window.ContactSidebar.refresh();
      return;
    }
  }

  function setQuickBarCard(field, value) {
    const card = document.querySelector(`#contactQuickGrid [data-quick-field="${field}"]`);
    if (!card) return;
    const infoEl = card.querySelector('.contact-quick-card__info');
    if (!value) {
      card.classList.add('d-none');
      if (infoEl) infoEl.textContent = '';
      return;
    }
    card.classList.remove('d-none');
    if (infoEl) infoEl.textContent = value;
  }

  function applyQuickBarSettings() {
    const section = document.querySelector('.contact-quick-bar');
    const grid = document.getElementById('contactQuickGrid');
    if (!grid) return;

    setQuickBarCard('phone', getSiteSetting('SITE_PHONE'));
    setQuickBarCard('email', getSiteSetting('SITE_EMAIL'));
    setQuickBarCard('address', getSiteSetting('SITE_ADDRESS', 'COMPANY_ADDRESS'));
    setQuickBarCard('zalo', getSiteSetting('ZALO_OA', 'ZALO_NAME', 'SITE_ZALO'));

    const visible = grid.querySelectorAll('[data-quick-field]:not(.d-none)').length;
    section?.classList.toggle('d-none', visible === 0);
  }

  async function init() {
    await loadTranslations();
    applyI18n();
    applyQuickBarSettings();
    applyContactSidebarSettings();
    updatePageMenuLabel();
    updatePageTitle();
    await loadFaqs();
    initForm();
  }

  document.addEventListener('DOMContentLoaded', init);

  window.addEventListener('menuLoaded', () => {
    updatePageMenuLabel();
    updatePageTitle();
  });

  window.addEventListener('languageChanged', async (e) => {
    langCode = e.detail?.langCode || 'vi';
    await loadTranslations();
    applyI18n();
    updatePageMenuLabel();
    updatePageTitle();
    renderFaqs();
  });
})();
