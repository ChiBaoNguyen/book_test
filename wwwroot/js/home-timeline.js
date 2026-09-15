/* Homepage timeline — HOME_TIMELINE from Portal API */
(function () {
  'use strict';

  const TIMELINE_CODE = 'HOME_TIMELINE';
  const API_URL = '/api/Portal/timelines/code/' + encodeURIComponent(TIMELINE_CODE);

  const CLOCK_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';

  function isTimelineEnabled(timeline) {
    if (!timeline) return false;
    if (timeline.deleted === true || timeline.Deleted === true) return false;
    const enabled = timeline.enabled ?? timeline.Enabled;
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

  /** Nhóm timeline: translations[].title + translations[].description */
  function pickGroupTranslation(timeline, langCode) {
    return pickTranslation(timeline.translations || timeline.Translations || [], langCode);
  }

  /** Từng mốc: items[].translations[].title + items[].translations[].content */
  function pickItemTranslation(item, langCode) {
    return pickTranslation(item.translations || item.Translations || [], langCode);
  }

  function stripHtml(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(String(html), 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function truncateText(text, max) {
    const plain = stripHtml(text);
    if (!plain) return '';
    if (plain.length <= max) return plain;
    return plain.slice(0, max).trim() + '…';
  }

  function resolveEventLabel(item) {
    const customText = (item.eventTimeText ?? item.EventTimeText ?? '').trim();
    if (customText) return customText;
    return formatEventLabel(item.eventTime ?? item.EventTime);
  }

  function formatEventLabel(eventTime) {
    if (!eventTime) return '';
    const s = String(eventTime).trim();
    const d = new Date(s);
    if (!isNaN(d.getTime()) && /^\d{4}/.test(s)) {
      const y = d.getFullYear();
      if (y > 1) return String(y);
    }
    return s.length > 24 ? s.slice(0, 24) : s;
  }

  function mediaUrl(url) {
    if (!url) return '';
    const value = String(url).trim();
    if (/^https?:\/\//i.test(value) || value.startsWith('/')) return value;
    return value.startsWith('//') ? `https:${value}` : value;
  }

  function renderIcon(iconClass) {
    const cls = (iconClass || '').trim();
    if (cls) {
      const normalized = cls.startsWith('bi ') ? cls : cls.startsWith('bi-') ? `bi ${cls}` : cls;
      return `<i class="${escapeHtml(normalized)}" aria-hidden="true"></i>`;
    }
    return CLOCK_SVG;
  }

  function sortItems(items) {
    return [...(items || [])].sort((a, b) => {
      const orderA = a.sortOrder ?? a.SortOrder ?? 0;
      const orderB = b.sortOrder ?? b.SortOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      const timeA = a.eventTime ?? a.EventTime ?? '';
      const timeB = b.eventTime ?? b.EventTime ?? '';
      return String(timeA).localeCompare(String(timeB));
    });
  }

  function buildPreparedItems(items, langCode) {
    return sortItems(items).map((item, index) => {
      const itemTr = pickItemTranslation(item, langCode);
      const itemTitle = (itemTr?.title ?? itemTr?.Title ?? '').trim();
      const itemContent = (itemTr?.content ?? itemTr?.Content ?? '').trim();

      return {
        index,
        id: item.id || item.Id || String(index),
        eventLabel: resolveEventLabel(item),
        icon: item.icon ?? item.Icon ?? '',
        image: mediaUrl(item.image ?? item.Image ?? ''),
        itemTitle,
        itemContent,
        itemPreview: truncateText(itemContent, 90)
      };
    }).filter(item => item.itemTitle || item.itemContent || item.eventLabel);
  }

  /** Header: chỉ từ nhóm timeline (không lấy từ mốc) */
  function renderGroupHeader(groupTr) {
    if (!groupTr) return '';
    const groupTitle = (groupTr.title ?? groupTr.Title ?? '').trim();
    const groupDescription = (groupTr.description ?? groupTr.Description ?? '').trim();
    if (!groupTitle && !groupDescription) return '';

    return `
      <div class="home-timeline__header-inner">
        ${groupTitle ? `<h2 class="home-timeline__title">${escapeHtml(groupTitle)}</h2>` : ''}
        ${groupDescription ? `<p class="home-timeline__desc">${escapeHtml(groupDescription)}</p>` : ''}
      </div>`;
  }

  function renderMilestone(item, isActive) {
    const activeClass = isActive ? ' home-timeline__milestone--active' : '';
    return `
      <button type="button"
        class="home-timeline__milestone${activeClass}"
        role="tab"
        aria-selected="${isActive ? 'true' : 'false'}"
        data-index="${item.index}"
        id="homeTimelineTab-${item.index}"
        aria-controls="homeTimelinePanel">
        <span class="home-timeline__dot">${renderIcon(item.icon)}</span>
        ${item.eventLabel ? `<p class="home-timeline__year">${escapeHtml(item.eventLabel)}</p>` : ''}
        ${item.itemTitle ? `<p class="home-timeline__milestone-title">${escapeHtml(item.itemTitle)}</p>` : ''}
        ${item.itemPreview ? `<p class="home-timeline__milestone-preview">${escapeHtml(item.itemPreview)}</p>` : ''}
      </button>`;
  }

  function renderItemDetail(item) {
    if (!item) return '';
    const imageHtml = item.image
      ? `<div class="home-timeline__detail-media"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.itemTitle)}" loading="lazy" /></div>`
      : '';

    return `
      <div class="home-timeline__detail-inner" id="homeTimelinePanel" role="tabpanel" aria-labelledby="homeTimelineTab-${item.index}">
        <div class="home-timeline__detail-main">
          ${item.itemTitle ? `
          <div class="home-timeline__detail-head">
            <div class="home-timeline__detail-bar" aria-hidden="true"></div>
            <h3 class="home-timeline__detail-title">${escapeHtml(item.itemTitle)}</h3>
          </div>` : ''}
          ${item.itemContent ? `<div class="home-timeline__detail-content">${item.itemContent}</div>` : ''}
        </div>
        ${imageHtml}
      </div>`;
  }

  function bindMilestoneClicks(section, prepared, detailEl) {
    const milestones = section.querySelectorAll('.home-timeline__milestone');
    milestones.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        const item = prepared.find(p => p.index === idx);
        if (!item) return;

        milestones.forEach(m => {
          m.classList.remove('home-timeline__milestone--active');
          m.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('home-timeline__milestone--active');
        btn.setAttribute('aria-selected', 'true');

        detailEl.innerHTML = renderItemDetail(item);
        detailEl.classList.remove('d-none');
      });
    });
  }

  function renderTimeline(timeline, langCode) {
    const section = document.getElementById('homeTimelineSection');
    const headerEl = document.getElementById('homeTimelineHeader');
    const railEl = document.getElementById('homeTimelineRail');
    const detailEl = document.getElementById('homeTimelineDetail');
    if (!section || !headerEl || !railEl || !detailEl) return false;

    const groupTr = pickGroupTranslation(timeline, langCode);
    const prepared = buildPreparedItems(timeline.items || timeline.Items || [], langCode);

    if (!prepared.length) return false;

    headerEl.innerHTML = renderGroupHeader(groupTr);
    railEl.innerHTML = prepared.map((item, i) => renderMilestone(item, i === 0)).join('');

    detailEl.innerHTML = renderItemDetail(prepared[0]);
    detailEl.classList.remove('d-none');

    bindMilestoneClicks(section, prepared, detailEl);
    return true;
  }

  async function loadHomeTimeline() {
    const section = document.getElementById('homeTimelineSection');
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

      const timeline = await res.json();
      if (!isTimelineEnabled(timeline)) {
        section.classList.add('d-none');
        return;
      }

      if (renderTimeline(timeline, langCode)) {
        section.classList.remove('d-none');
      } else {
        section.classList.add('d-none');
      }
    } catch {
      section.classList.add('d-none');
    }
  }

  document.addEventListener('DOMContentLoaded', loadHomeTimeline);
  window.addEventListener('languageChanged', loadHomeTimeline);
})();
