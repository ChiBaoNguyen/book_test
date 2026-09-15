(function () {
  'use strict';

  const cfg = window.EVENTS_PAGE || {};
  const EVENTS_API = '/api/Portal/events';
  const NOTIF_API = '/api/Portal/notifications';
  const EVENT_PAGE_SIZE = 5;
  const NOTIF_PAGE_SIZE = 8;
  const CALENDAR_FETCH_SIZE = 200;

  let langCode = (localStorage.getItem('selectedLanguage') || 'vi').toLowerCase();
  let translations = {};
  let defaultLang = 'vi';

  let calYear = new Date().getFullYear();
  let calMonth = new Date().getMonth();
  let selectedDay = null;
  let calendarEvents = [];

  let eventsPage = 1;
  let eventsTotalPages = 1;
  let dayFilter = null;

  let notifPage = 1;
  let notifTotalPages = 1;
  let notifItems = [];

  const MONTH_SHORT = ['Th.1', 'Th.2', 'Th.3', 'Th.4', 'Th.5', 'Th.6', 'Th.7', 'Th.8', 'Th.9', 'Th.10', 'Th.11', 'Th.12'];
  const WEEKDAYS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  const WEEKDAYS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  function t(key, fallback) {
    const pack = translations[langCode] || translations[defaultLang] || {};
    return pack[key] || fallback || key;
  }

  async function loadTranslations() {
    try {
      const res = await fetch('/locales/page.json');
      if (!res.ok) return;
      const data = await res.json();
      defaultLang = data.default || 'vi';
      translations = data;
    } catch { /* ignore */ }
  }

  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const val = t(key);
      if (val) el.textContent = val;
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function stripHtml(html) {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || '').trim();
  }

  function isPublished(item) {
    if (!item) return false;
    if ('published' in item) return item.published === true;
    if ('Published' in item) return item.Published === true;
    return false;
  }

  function onlyPublished(items) {
    return (items || []).filter(isPublished);
  }

  function pickTranslation(item) {
    const list = item.translations || item.Translations || [];
    if (!list.length) return null;
    let tr = list.find(x => (x.languageCode || x.LanguageCode || '').toLowerCase() === langCode);
    if (!tr && langCode.length >= 2) {
      tr = list.find(x => (x.languageCode || x.LanguageCode || '').toLowerCase().startsWith(langCode.substring(0, 2)));
    }
    return tr || list[0];
  }

  function eventUrl(slug) {
    if (!slug) return '#';
    return (cfg.eventBaseUrl || '/event/') + encodeURIComponent(slug);
  }

  function notificationUrl(id) {
    if (!id) return '#';
    return (cfg.notificationBaseUrl || '/notification/') + encodeURIComponent(id);
  }

  function parseDate(val) {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }

  function sameDay(a, b) {
    return a && b
      && a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  function formatTime(d) {
    if (!d) return '';
    const h = d.getHours();
    const m = d.getMinutes();
    if (h === 0 && m === 0) return t('eventsAllDay', 'Cáº£ ngÃ y');
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function formatDateRange(from, to) {
    const f = parseDate(from);
    const t2 = parseDate(to);
    if (!f && !t2) return '';
    const fmt = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (f && t2 && !sameDay(f, t2)) return `${fmt(f)}â€“${fmt(t2)}`;
    if (f) return fmt(f);
    return t2 ? fmt(t2) : '';
  }

  function eventStatus(d) {
    if (!d) return 'upcoming';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (eventDay.getTime() === today.getTime()) return 'live';
    if (eventDay < today) return 'ended';
    return 'upcoming';
  }

  function statusLabel(status) {
    if (status === 'live') return t('eventsStatusLive', 'ÄANG DIá»„N RA');
    if (status === 'ended') return t('eventsStatusEnded', 'ÄÃƒ Káº¾T THÃšC');
    return t('eventsStatusUpcoming', 'Sáº®P DIá»„N RA');
  }

  function getMonthLabel(year, month) {
    const monthNames = langCode.startsWith('en')
      ? ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      : ['ThÃ¡ng 1', 'ThÃ¡ng 2', 'ThÃ¡ng 3', 'ThÃ¡ng 4', 'ThÃ¡ng 5', 'ThÃ¡ng 6', 'ThÃ¡ng 7', 'ThÃ¡ng 8', 'ThÃ¡ng 9', 'ThÃ¡ng 10', 'ThÃ¡ng 11', 'ThÃ¡ng 12'];
    return `${monthNames[month]} / ${year}`;
  }

  function eventsOnDay(year, month, day) {
    return calendarEvents.filter(ev => {
      const d = parseDate(ev.eventDate || ev.EventDate);
      return d && d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  function daysWithEvents(year, month) {
    const set = new Set();
    calendarEvents.forEach(ev => {
      const d = parseDate(ev.eventDate || ev.EventDate);
      if (d && d.getFullYear() === year && d.getMonth() === month) {
        set.add(d.getDate());
      }
    });
    return set;
  }

  function renderCalendar() {
    const monthLabel = document.getElementById('eventsCalMonthLabel');
    const weekdaysEl = document.getElementById('eventsCalWeekdays');
    const daysEl = document.getElementById('eventsCalDays');
    if (!monthLabel || !weekdaysEl || !daysEl) return;

    monthLabel.textContent = getMonthLabel(calYear, calMonth);

    const weekdays = langCode.startsWith('en') ? WEEKDAYS_EN : WEEKDAYS_VI;
    weekdaysEl.innerHTML = weekdays.map(w => `<div class="events-calendar__weekday">${w}</div>`).join('');

    const first = new Date(calYear, calMonth, 1);
    let startPad = first.getDay() - 1;
    if (startPad < 0) startPad = 6;

    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const eventDays = daysWithEvents(calYear, calMonth);
    const today = new Date();

    let html = '';
    for (let i = 0; i < startPad; i++) {
      html += '<div class="events-calendar__day events-calendar__day--empty"></div>';
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day;
      const isSelected = selectedDay === day;
      const hasEvent = eventDays.has(day);
      const classes = ['events-calendar__day'];
      if (isToday) classes.push('events-calendar__day--today');
      if (isSelected) classes.push('events-calendar__day--selected');
      if (hasEvent) classes.push('events-calendar__day--has-event');
      html += `<button type="button" class="${classes.join(' ')}" data-day="${day}">${day}${hasEvent && !isSelected ? '<span class="events-calendar__day-dot"></span>' : ''}</button>`;
    }
    daysEl.innerHTML = html;

    daysEl.querySelectorAll('[data-day]').forEach(btn => {
      btn.addEventListener('click', () => {
        const day = parseInt(btn.getAttribute('data-day'), 10);
        selectedDay = selectedDay === day ? null : day;
        dayFilter = selectedDay
          ? new Date(calYear, calMonth, selectedDay)
          : null;
        eventsPage = 1;
        renderCalendar();
        loadEventsList();
        document.getElementById('eventsListFooter')?.classList.toggle('d-none', !dayFilter);
      });
    });
  }

  function buildPagination(current, total, prefix) {
    if (total <= 1) return '';
    const buttons = [];
    const addPage = p => buttons.push({ type: 'page', page: p });
    addPage(1);
    if (current > 3) buttons.push({ type: 'ellipsis' });
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
      addPage(p);
    }
    if (current < total - 2) buttons.push({ type: 'ellipsis' });
    if (total > 1) addPage(total);

    const unique = [];
    buttons.forEach(b => {
      if (b.type === 'ellipsis') {
        if (unique.length && unique[unique.length - 1].type !== 'ellipsis') unique.push(b);
        return;
      }
      if (!unique.some(x => x.type === 'page' && x.page === b.page)) unique.push(b);
    });

    return `
      <button type="button" class="events-pagination__nav" data-action="prev" data-prefix="${prefix}" ${current <= 1 ? 'disabled' : ''}>
        <i class="bi bi-chevron-left"></i>
      </button>
      ${unique.map(btn => {
        if (btn.type === 'ellipsis') return '<span class="events-pagination__ellipsis">...</span>';
        return `<button type="button" class="events-pagination__page${btn.page === current ? ' is-active' : ''}" data-page="${btn.page}" data-prefix="${prefix}">${btn.page}</button>`;
      }).join('')}
      <button type="button" class="events-pagination__nav" data-action="next" data-prefix="${prefix}" ${current >= total ? 'disabled' : ''}>
        <i class="bi bi-chevron-right"></i>
      </button>
    `;
  }

  function renderEventCard(ev) {
    const tr = pickTranslation(ev);
    const title = tr?.title || tr?.Title || t('events', 'Sá»± kiá»‡n');
    const slug = tr?.urlSlug || tr?.UrlSlug || '';
    const category = ev.categoryName || ev.CategoryName || t('events', 'Sá»° KIá»†N');
    const d = parseDate(ev.eventDate || ev.EventDate);
    const day = d ? d.getDate() : 'â€”';
    const month = d ? MONTH_SHORT[d.getMonth()] : '';
    const status = eventStatus(d);
    const statusCls = status === 'live' ? 'events-card__status--live'
      : status === 'ended' ? 'events-card__status--ended'
      : 'events-card__status--upcoming';

    return `
      <a href="${escapeHtml(eventUrl(slug))}" class="events-card">
        <div class="events-card__date">
          <span class="events-card__date-day">${day}</span>
          <span class="events-card__date-month">${escapeHtml(month)}</span>
        </div>
        <div class="events-card__body">
          <span class="events-card__category">${escapeHtml(category.toUpperCase())}</span>
          <h3 class="events-card__title">${escapeHtml(title)}</h3>
          <div class="events-card__meta">
            <span><i class="bi bi-clock"></i> ${escapeHtml(formatTime(d))}</span>
          </div>
        </div>
        <span class="events-card__status ${statusCls}">${escapeHtml(statusLabel(status))}</span>
      </a>
    `;
  }

  async function loadCalendarEvents() {
    try {
      const res = await fetch(`${EVENTS_API}?pageNumber=1&pageSize=${CALENDAR_FETCH_SIZE}`);
      if (!res.ok) return;
      const data = await res.json();
      calendarEvents = onlyPublished(data.items || data.Items || []);
      renderCalendar();
    } catch (err) {
    }
  }

  async function loadEventsList() {
    const listEl = document.getElementById('eventsList');
    const pagEl = document.getElementById('eventsPagination');
    if (!listEl) return;

    listEl.innerHTML = '<div class="events-loading"><div class="spinner-border spinner-border-sm text-warning" role="status"></div></div>';

    try {
      let items = [];
      let totalPages = 1;

      if (dayFilter) {
        const dayItems = eventsOnDay(dayFilter.getFullYear(), dayFilter.getMonth(), dayFilter.getDate());
        const start = (eventsPage - 1) * EVENT_PAGE_SIZE;
        items = dayItems.slice(start, start + EVENT_PAGE_SIZE);
        totalPages = Math.max(1, Math.ceil(dayItems.length / EVENT_PAGE_SIZE));
      } else {
        const res = await fetch(`${EVENTS_API}?pageNumber=${eventsPage}&pageSize=${EVENT_PAGE_SIZE}`);
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        items = onlyPublished(data.items || data.Items || []);
        totalPages = data.totalPages || data.TotalPages || 1;
      }

      eventsTotalPages = totalPages;

      if (!items.length) {
        listEl.innerHTML = `<p class="events-empty">${escapeHtml(t('noEvents', 'ChÆ°a cÃ³ sá»± kiá»‡n'))}</p>`;
        pagEl?.classList.add('d-none');
        return;
      }

      listEl.innerHTML = items.map(renderEventCard).join('');

      if (pagEl) {
        if (totalPages > 1) {
          pagEl.innerHTML = buildPagination(eventsPage, totalPages, 'events');
          pagEl.classList.remove('d-none');
        } else {
          pagEl.classList.add('d-none');
        }
      }
    } catch (err) {
      listEl.innerHTML = `<p class="events-empty">${escapeHtml(t('eventsLoadError', 'KhÃ´ng táº£i Ä‘Æ°á»£c dá»¯ liá»‡u'))}</p>`;
    }
  }

  function notifAccent(index) {
    const accents = ['bronze', 'blue', 'green'];
    return accents[index % accents.length];
  }

  function notifIcon(index) {
    const icons = ['bi-wrench', 'bi-cloud-rain', 'bi-tag', 'bi-megaphone'];
    return icons[index % icons.length];
  }

  function renderFeaturedNotif(item) {
    const tr = pickTranslation(item);
    const title = tr?.title || tr?.Title || '';
    const content = stripHtml(tr?.content || tr?.Content || '');
    const id = item.id || item.Id;
    const dateStr = formatDateRange(item.from || item.From, item.to || item.To)
      || (item.dateAdd || item.DateAdd ? formatDateRange(item.dateAdd || item.DateAdd, null) : '');

    return `
      <a href="${escapeHtml(notificationUrl(id))}" class="notif-featured">
        <div class="notif-featured__icon"><i class="bi bi-exclamation-triangle"></i></div>
        <div>
          <h3 class="notif-featured__title">${escapeHtml(title)}</h3>
          ${dateStr ? `<p class="notif-featured__date">${escapeHtml(t('eventsNotifEffective', 'Hiá»‡u lá»±c'))}: ${escapeHtml(dateStr)}</p>` : ''}
          ${content ? `<p class="notif-featured__excerpt">${escapeHtml(content)}</p>` : ''}
          <span class="notif-featured__link">${escapeHtml(t('eventsReadMore', 'XEM THÃŠM â†’'))}</span>
        </div>
      </a>
    `;
  }

  function renderNotifCard(item, index) {
    const tr = pickTranslation(item);
    const title = tr?.title || tr?.Title || '';
    const id = item.id || item.Id;
    const accent = notifAccent(index);
    const dateStr = formatDateRange(item.from || item.From, item.to || item.To);

    return `
      <a href="${escapeHtml(notificationUrl(id))}" class="notif-card notif-card--${accent}">
        <div class="notif-card__icon"><i class="bi ${notifIcon(index)}"></i></div>
        <div class="flex-1 min-w-0" style="flex:1;min-width:0">
          <div class="notif-card__meta">
            <span class="notif-card__badge">${escapeHtml(t('eventsNotifBadge', 'THÃ”NG BÃO'))}</span>
            ${dateStr ? `<span class="notif-card__date">${escapeHtml(dateStr)}</span>` : ''}
          </div>
          <p class="notif-card__title">${escapeHtml(title)}</p>
        </div>
        <span class="notif-card__link">${escapeHtml(t('eventsView', 'XEM â†’'))}</span>
      </a>
    `;
  }

  function renderSidebarItem(item) {
    const tr = pickTranslation(item);
    const title = tr?.title || tr?.Title || '';
    const id = item.id || item.Id;
    const d = parseDate(item.dateAdd || item.DateAdd || item.from || item.From);
    const dayStr = d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` : 'â€”';
    const monthStr = d ? MONTH_SHORT[d.getMonth()] : '';

    return `
      <a href="${escapeHtml(notificationUrl(id))}" class="notif-sidebar-item">
        <div class="notif-sidebar-item__date">
          <span class="notif-sidebar-item__date-day">${escapeHtml(dayStr)}</span>
          <span class="notif-sidebar-item__date-month">${escapeHtml(monthStr)}</span>
        </div>
        <div class="notif-sidebar-item__body">
          <span class="notif-sidebar-item__badge">${escapeHtml(t('eventsNotifBadge', 'THÃ”NG BÃO'))}</span>
          <p class="notif-sidebar-item__title">${escapeHtml(title)}</p>
        </div>
        <i class="bi bi-arrow-right notif-sidebar-item__arrow"></i>
      </a>
    `;
  }

  async function loadNotifications(append) {
    const featuredEl = document.getElementById('notifFeatured');
    const cardsEl = document.getElementById('notifCards');
    const sidebarEl = document.getElementById('notifSidebarList');
    const loadMoreBtn = document.getElementById('notifLoadMore');
    const viewAllTop = document.getElementById('notifViewAllTop');

    if (!append && featuredEl) {
      featuredEl.innerHTML = '<div class="events-loading events-loading--light"><div class="spinner-border spinner-border-sm text-secondary" role="status"></div></div>';
    }

    try {
      const res = await fetch(`${NOTIF_API}?pageNumber=${notifPage}&pageSize=${NOTIF_PAGE_SIZE}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      const items = onlyPublished(data.items || data.Items || []);
      notifTotalPages = data.totalPages || data.TotalPages || 1;

      if (append) {
        notifItems = notifItems.concat(items);
      } else {
        notifItems = items;
      }

      if (!notifItems.length) {
        if (featuredEl) featuredEl.innerHTML = `<p class="events-empty events-empty--dark">${escapeHtml(t('noNotifications', 'KhÃ´ng cÃ³ thÃ´ng bÃ¡o'))}</p>`;
        if (cardsEl) cardsEl.innerHTML = '';
        if (sidebarEl) sidebarEl.innerHTML = '';
        return;
      }

      if (featuredEl && !append) {
        featuredEl.innerHTML = renderFeaturedNotif(notifItems[0]);
      }

      if (cardsEl && !append) {
        const rest = notifItems.slice(1, 4);
        cardsEl.innerHTML = rest.map((item, i) => renderNotifCard(item, i)).join('');
      }

      if (sidebarEl) {
        if (append) {
          sidebarEl.insertAdjacentHTML('beforeend', items.map(renderSidebarItem).join(''));
        } else {
          sidebarEl.innerHTML = notifItems.map(renderSidebarItem).join('');
        }
      }

      const hasMore = notifPage < notifTotalPages;
      loadMoreBtn?.classList.toggle('d-none', !hasMore);
      viewAllTop?.classList.toggle('d-none', notifTotalPages <= 1);

      if (viewAllTop && hasMore) {
        viewAllTop.onclick = () => {
          document.getElementById('notificationsSection')?.scrollIntoView({ behavior: 'smooth' });
          if (notifPage < notifTotalPages) {
            notifPage += 1;
            loadNotifications(true);
          }
        };
      }
    } catch (err) {
      if (featuredEl && !append) {
        featuredEl.innerHTML = `<p class="events-empty events-empty--dark">${escapeHtml(t('eventsLoadError', 'KhÃ´ng táº£i Ä‘Æ°á»£c dá»¯ liá»‡u'))}</p>`;
      }
    }
  }

  function bindEvents() {
    document.getElementById('eventsCalPrev')?.addEventListener('click', () => {
      calMonth -= 1;
      if (calMonth < 0) { calMonth = 11; calYear -= 1; }
      selectedDay = null;
      dayFilter = null;
      eventsPage = 1;
      renderCalendar();
      loadEventsList();
      document.getElementById('eventsListFooter')?.classList.add('d-none');
    });

    document.getElementById('eventsCalNext')?.addEventListener('click', () => {
      calMonth += 1;
      if (calMonth > 11) { calMonth = 0; calYear += 1; }
      selectedDay = null;
      dayFilter = null;
      eventsPage = 1;
      renderCalendar();
      loadEventsList();
      document.getElementById('eventsListFooter')?.classList.add('d-none');
    });

    document.getElementById('eventsClearDayFilter')?.addEventListener('click', () => {
      selectedDay = null;
      dayFilter = null;
      eventsPage = 1;
      renderCalendar();
      loadEventsList();
      document.getElementById('eventsListFooter')?.classList.add('d-none');
    });

    document.getElementById('eventsPagination')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-page], [data-action]');
      if (!btn || btn.getAttribute('data-prefix') !== 'events') return;
      if (btn.hasAttribute('data-page')) {
        eventsPage = parseInt(btn.getAttribute('data-page'), 10);
      } else if (btn.getAttribute('data-action') === 'prev') {
        eventsPage = Math.max(1, eventsPage - 1);
      } else if (btn.getAttribute('data-action') === 'next') {
        eventsPage = Math.min(eventsTotalPages, eventsPage + 1);
      }
      loadEventsList();
    });

    document.getElementById('notifLoadMore')?.addEventListener('click', () => {
      if (notifPage < notifTotalPages) {
        notifPage += 1;
        loadNotifications(true);
      }
    });
  }

  function updatePageTitle() {
    const title = cfg.initialPageTitle;
    if (!title) return;
    const siteName = document.title.includes(' - ')
      ? document.title.split(' - ').slice(1).join(' - ')
      : '';
    document.title = siteName ? `${title} - ${siteName}` : title;
  }

  async function boot() {
    await loadTranslations();
    applyI18n();
    updatePageTitle();
    bindEvents();
    renderCalendar();
    await Promise.all([loadCalendarEvents(), loadEventsList(), loadNotifications(false)]);
  }

  document.addEventListener('DOMContentLoaded', boot);

  window.addEventListener('languageChanged', async e => {
    langCode = (e.detail?.langCode || 'vi').toLowerCase();
    await loadTranslations();
    applyI18n();
    renderCalendar();
    loadEventsList();
    notifPage = 1;
    loadNotifications(false);
  });
})();
