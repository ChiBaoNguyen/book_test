(function () {
  'use strict';

  function initMobileMenu() {
    var toggle = document.getElementById('heritageMenuToggle');
    var overlay = document.getElementById('heritageMobileMenu');
    var closeBtn = document.getElementById('heritageMenuClose');
    var mobileNav = document.getElementById('heritageMobileNav');

    if (!toggle || !overlay || !mobileNav) return;

    function openMenu() {
      syncMobileNav();
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    function syncMobileNav() {
      var desktopItems = document.querySelectorAll('.heritage-nav-desktop #menuItems > .nav-item');
      mobileNav.innerHTML = '';
      desktopItems.forEach(function (item) {
        var link = item.querySelector(':scope > .nav-link');
        if (!link || link.classList.contains('dropdown-toggle')) return;
        var clone = link.cloneNode(true);
        clone.classList.remove('dropdown-toggle');
        clone.removeAttribute('data-bs-toggle');
        clone.addEventListener('click', closeMenu);
        var wrap = document.createElement('div');
        wrap.appendChild(clone);
        mobileNav.appendChild(wrap);
      });
    }

    toggle.addEventListener('click', openMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);

    window.addEventListener('languageChanged', function () {
      setTimeout(syncMobileNav, 400);
    });

    var origLoadMenu = window.loadMenu;
    if (origLoadMenu) {
      window.loadMenu = function () {
        return origLoadMenu.apply(this, arguments).then(function (r) {
          setTimeout(syncMobileNav, 200);
          return r;
        });
      };
    }

    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(syncMobileNav, 600);
    });
  }

  function initLangSwitcher() {
    var options = document.querySelectorAll('[data-heritage-lang]');
    options.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        var lang = btn.getAttribute('data-heritage-lang');
        if (!lang) return;
        localStorage.setItem('selectedLanguage', lang);
        options.forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-heritage-lang') === lang);
          b.classList.toggle('lang-active', b.getAttribute('data-heritage-lang') === lang);
        });
        window.dispatchEvent(new CustomEvent('languageChanged', {
          detail: { langCode: lang }
        }));
        if (window.loadMenu) window.loadMenu(lang);
      });
    });

    var current = (localStorage.getItem('selectedLanguage') || 'vi').toLowerCase();
    options.forEach(function (b) {
      var match = b.getAttribute('data-heritage-lang').toLowerCase() === current;
      b.classList.toggle('active', match);
      if (match) b.classList.add('lang-active');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initMobileMenu();
    initLangSwitcher();
  });
})();
