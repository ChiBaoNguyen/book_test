function getSiteSetting(...keys) {
    const settings = window.SITE_SETTINGS || {};
    for (const key of keys) {
        const value = (settings[key] || '').trim();
        if (value) return value;
    }
    return '';
}

function toTelHref(phone) {
    if (!phone) return '';
    const normalized = phone.replace(/[^\d+]/g, '');
    return normalized ? `tel:${normalized}` : '';
}

function initFloatContact() {
    const wrap = document.getElementById('heritageFloatContact');
    if (!wrap) return;

    const zaloBtn = document.getElementById('floatContactZalo');
    const phoneBtn = document.getElementById('floatContactPhone');
    const emailBtn = document.getElementById('floatContactEmail');

    const zaloUrl = getSiteSetting('ZALO_URL', 'ZALO_LINK', 'SITE_ZALO_URL');
    const zaloName = getSiteSetting('ZALO_OA', 'ZALO_NAME', 'SITE_ZALO');
    const phone = getSiteSetting('SITE_PHONE');
    const email = getSiteSetting('SITE_EMAIL');

    let visible = 0;

    if (zaloUrl && zaloBtn) {
        zaloBtn.href = zaloUrl;
        zaloBtn.title = zaloName ? `Zalo: ${zaloName}` : 'Zalo';
        zaloBtn.classList.remove('d-none');
        visible += 1;
    }

    const telHref = toTelHref(phone);
    if (telHref && phoneBtn) {
        phoneBtn.href = telHref;
        phoneBtn.title = `Gọi: ${phone}`;
        phoneBtn.classList.remove('d-none');
        visible += 1;
    }

    if (email && emailBtn) {
        emailBtn.href = `mailto:${email}`;
        emailBtn.title = `Email: ${email}`;
        emailBtn.classList.remove('d-none');
        visible += 1;
    }

    wrap.classList.toggle('d-none', visible === 0);
}

function secureMediaUrl(src) {
    if (!src) return src;
    let url = String(src).trim();
    if (url.startsWith('//')) url = `https:${url}`;
    else if (/^http:\/\//i.test(url) && window.location.protocol === 'https:') {
        url = url.replace(/^http:\/\//i, 'https://');
    }
    return url;
}

function getMediaProxyUrl(url) {
    try {
        const resolved = secureMediaUrl(url);
        const parsed = new URL(resolved, window.location.origin);
        if (parsed.origin !== window.location.origin &&
            !/youtube\.com|youtu\.be|vimeo\.com/i.test(resolved)) {
            return `/api/Portal/proxy/file?url=${encodeURIComponent(resolved)}`;
        }
        return resolved;
    } catch {
        return url;
    }
}

function wrapResponsiveIframe(iframe) {
    if (iframe.parentElement?.classList.contains('embed-responsive')) return;
    const wrap = document.createElement('div');
    wrap.className = 'embed-responsive';
    iframe.parentNode.insertBefore(wrap, iframe);
    wrap.appendChild(iframe);
}

function initEmbeddedMedia(root) {
    const scope = root || document;
    scope.querySelectorAll('.content-body video, .notification-content-body video').forEach(video => {
        if (video.dataset.mediaEnhanced === '1') return;
        video.dataset.mediaEnhanced = '1';
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('controls', '');
        video.removeAttribute('autoplay');
        video.querySelectorAll('source').forEach(source => {
            const src = source.getAttribute('src');
            if (src) source.src = secureMediaUrl(src);
        });
        const srcAttr = video.getAttribute('src');
        if (srcAttr) {
            video.src = secureMediaUrl(srcAttr);
        }
    });

    scope.querySelectorAll('.content-body iframe, .notification-content-body iframe').forEach(iframe => {
        if (iframe.dataset.mediaEnhanced === '1') return;
        iframe.dataset.mediaEnhanced = '1';
        const src = iframe.getAttribute('src');
        if (src) iframe.src = secureMediaUrl(src);
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute(
            'allow',
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
        );
        wrapResponsiveIframe(iframe);
    });
}

function observeContentMedia() {
    const selectors = '.content-body, .notification-content-body, .article-body, .event-body';
    document.querySelectorAll(selectors).forEach(el => {
        initEmbeddedMedia(el);
        if (el._mediaObserver) return;
        const observer = new MutationObserver(() => initEmbeddedMedia(el));
        observer.observe(el, { childList: true, subtree: true });
        el._mediaObserver = observer;
    });
}

window.initEmbeddedMedia = initEmbeddedMedia;

document.addEventListener('DOMContentLoaded', function () {
    initFloatContact();
    observeContentMedia();

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (!href || href === '#' || href.length <= 1) {
                return;
            }

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function (e) {
            if (!form.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });
});
