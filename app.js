// Market Intelligence — interactivity recreated from the Claude Design "Market Brief" component.
// Vanilla JS port: nav (홈/리포트), auto-cycling hero carousel, chip filters, bookmark
// toggles, random thumbnail pools, live search, notification/account menus, and a
// report detail modal.
(function () {
  'use strict';

  var ACCENT = '#1f9d57';

  // ---------- SVG icons ----------
  var ICON = {
    eye: function (s) {
      return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="#8a8a90" stroke-width="1.6"/>' +
        '<circle cx="12" cy="12" r="2.5" stroke="#8a8a90" stroke-width="1.6"/></svg>';
    },
    bookmark: function (s, saved) {
      return saved
        ? '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="' + ACCENT + '" aria-hidden="true">' +
            '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.2L5 21V4a1 1 0 0 1 1-1Z"/></svg>'
        : '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
            '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.2L5 21V4a1 1 0 0 1 1-1Z" stroke="#b4b4ba" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    }
  };

  // ---------- Application-area thumbnail pools (~20 each), randomly assigned ----------
  // Replace any entry with `url("/path/to/photo.jpg")` to drop in a real image.
  var imagePools = (function () {
    function make(hues) {
      var out = [];
      for (var i = 0; i < 20; i++) {
        var h = hues[i % hues.length] + ((i * 9) % 26) - 13;
        var ang = 115 + ((i * 23) % 90);
        var sat = 26 + ((i * 7) % 16);
        out.push('linear-gradient(' + ang + 'deg, hsl(' + h + ' ' + sat + '% 30%), hsl(' + (h + 14) + ' ' + (sat + 6) + '% 11%))');
      }
      return out;
    }
    return {
      '스마트폰': make([212, 228, 200, 240]),
      '오토': make([205, 196, 215, 188]),
      '휴머노이드': make([268, 300, 244, 320])
    };
  })();

  // ---------- Data ----------
  var heroes = [
    { line1: '스마트폰 수요 회복 신호,', line2: '2분기 업황 바닥 통과 전망', body: '글로벌 스마트폰 출하량이 2개 분기 연속 증가하며 회복세가 뚜렷해지고 있습니다. 프리미엄 신모델 효과와 교체 수요가 맞물리며 하반기에는 더 강한 모멘텀이 기대됩니다.', author: '김민수', role: 'IT/전기전자 애널리스트', date: '2024.05.20', image: 'background — smartphone', bg: 'radial-gradient(circle at 78% 42%, #3a3a40 0%, #1d1d20 40%, #101012 80%)' },
    { line1: 'AI 서버 투자 가속,', line2: '전력·냉각 인프라가 핵심 변수', body: '하이퍼스케일러의 설비 투자가 재확대되며 AI 서버 수요가 견조합니다. 전력 효율과 냉각 솔루션을 확보한 업체로 수혜가 집중될 전망입니다.', author: '박지훈', role: 'IT 하드웨어 애널리스트', date: '2024.05.20', image: 'background — AI server', bg: 'radial-gradient(circle at 75% 45%, #1b2b40 0%, #11202f 42%, #07101a 82%)' },
    { line1: '자동차 수출 호조 지속,', line2: '하이브리드가 실적을 견인', body: '친환경차 믹스 개선과 단가 상승으로 완성차 수익성이 개선되고 있습니다. 하이브리드 라인업 강화가 하반기 모멘텀의 중심이 될 것입니다.', author: '최재원', role: '자동차 애널리스트', date: '2024.05.19', image: 'background — vehicle', bg: 'radial-gradient(circle at 76% 44%, #4a525c 0%, #2a3138 42%, #14181c 82%)' },
    { line1: '원/달러 환율 전망 업데이트,', line2: '하반기 1,300원대 박스권 예상', body: '미국 금리 경로와 수출 회복이 환율의 방향성을 좌우할 전망입니다. 변동성 확대 구간에 대비한 환헤지 전략이 필요한 시점입니다.', author: '연예지', role: '이코노미스트', date: '2024.05.19', image: 'background — currency/macro', bg: 'radial-gradient(circle at 76% 42%, #5a4226 0%, #38281a 44%, #1a120c 82%)' }
  ];
  var heroSlides = heroes.map(function (h) { return Object.assign({}, h, { title: h.line1 + ' ' + h.line2 }); });

  var cardData = [
    { id: 'c1', app: '스마트폰', category: '스마트폰', title: '스마트폰 수요 회복 신호, 하반기 가격 반등 기대', author: '이정현', date: '2024.05.20', views: '9.3K', summary: '글로벌 스마트폰 출하량이 2개 분기 연속 증가하며 회복세가 뚜렷합니다. 프리미엄 신모델과 교체 수요를 바탕으로 하반기 가격 반등 가능성을 점검합니다.', tags: ['#출하량', '#프리미엄', '#교체수요'] },
    { id: 'c2', app: '휴머노이드', category: '휴머노이드', title: '휴머노이드 양산 로드맵 점검, 부품 수혜 주목', author: '박지훈', date: '2024.05.20', views: '8.1K', summary: '휴머노이드 양산 로드맵이 구체화되며 액추에이터·모터·감속기 등 핵심 부품 밸류체인의 수혜 가능성을 점검합니다.', tags: ['#액추에이터', '#모터', '#감속기'] },
    { id: 'c3', app: '오토', category: '오토', title: '자동차 수출 호조 지속, 하이브리드 강세', author: '최재원', date: '2024.05.19', views: '6.7K', summary: '친환경차 믹스 개선과 단가 상승으로 완성차 수익성이 개선되고 있습니다. 하이브리드 라인업 강세가 수출 호조를 뒷받침합니다.', tags: ['#HEV', '#수출', '#완성차'] },
    { id: 'c4', app: '스마트폰', category: '스마트폰', title: '온디바이스 AI 탑재 확산, 교체 사이클 자극', author: '연예지', date: '2024.05.19', views: '7.0K', summary: '온디바이스 AI 탑재가 플래그십을 넘어 확산되며 평균판매단가와 교체 수요를 동시에 자극하고 있습니다.', tags: ['#온디바이스AI', '#ASP', '#반도체'] }
  ];

  var rankData = [
    { rank: '1', title: '반도체 재고 정상화와 업황 사이클 점검', date: '2024.05.19', views: '12.4K' },
    { rank: '2', title: 'AI 서버 투자 확대? 가격 변동', date: '2024.05.17', views: '8.7K' },
    { rank: '3', title: '2024 스마트폰 출하량 프리뷰', date: '2024.05.16', views: '6.1K' },
    { rank: '4', title: '자동차: 하이브리드 슈퍼사이클 진입', date: '2024.05.15', views: '5.3K' },
    { rank: '5', title: '원/달러 환율 전망 업데이트', date: '2024.05.14', views: '4.2K' }
  ];

  var reportData = [
    { id: 'r1', app: 'Smartphone', category: 'Smartphone', title: '스마트폰 수요 회복 신호, 2분기 업황 바닥 통과', author: '김민수', date: '2024.05.20', views: '12.4K', summary: '글로벌 출하량이 2개 분기 연속 증가하며 회복세가 뚜렷합니다. 프리미엄 신모델과 교체 수요가 하반기 모멘텀을 키울 전망입니다.', tags: ['#출하량', '#프리미엄', '#교체수요'] },
    { id: 'r2', app: 'Smartphone', category: 'Smartphone', title: '온디바이스 AI 탑재 확산, 교체 사이클 자극', author: '박지훈', date: '2024.05.19', views: '7.8K', summary: '온디바이스 AI 기능이 플래그십을 넘어 중급기로 확대되며 평균판매단가와 교체 수요를 동시에 끌어올리고 있습니다.', tags: ['#온디바이스AI', '#ASP', '#반도체'] },
    { id: 'r3', app: 'Humanoid', category: 'Humanoid', title: '휴머노이드 로봇 양산 로드맵 점검', author: '이정현', date: '2024.05.19', views: '9.2K', summary: '주요 빅테크의 휴머노이드 시제품 공개가 이어지며 양산 시점 논의가 본격화되고 있습니다. 액추에이터·모터 밸류체인이 핵심입니다.', tags: ['#액추에이터', '#모터', '#감속기'] },
    { id: 'r4', app: 'Humanoid', category: 'Humanoid', title: '휴머노이드 부품 밸류체인 분석', author: '한서연', date: '2024.05.18', views: '6.4K', summary: '관절 구동부의 정밀 감속기와 토크 센서가 원가의 핵심을 차지합니다. 국내 부품사의 진입 가능성을 점검합니다.', tags: ['#감속기', '#센서', '#부품'] },
    { id: 'r5', app: 'Auto', category: 'Auto', title: '자동차 수출 호조 지속, 하이브리드 강세', author: '최재원', date: '2024.05.18', views: '5.3K', summary: '친환경차 믹스 개선과 단가 상승으로 완성차 수익성이 개선되고 있습니다. 하이브리드 라인업 강화가 실적을 견인합니다.', tags: ['#HEV', '#수출', '#완성차'] },
    { id: 'r6', app: 'Auto', category: 'Auto', title: '전기차 캐즘 속 배터리 출하 점검', author: '김도윤', date: '2024.05.17', views: '4.9K', summary: '전기차 수요 둔화 구간에서도 신규 플랫폼 채택과 ESS 수요가 배터리 출하의 하방을 지지하고 있습니다.', tags: ['#배터리', '#EV', '#ESS'] }
  ];

  function findById(list, id) {
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) return list[i]; }
    return null;
  }

  // ---------- State ----------
  var state = { activeNav: '홈', activeChip: '전체', reportChip: '전체', activeDot: 0, saved: {}, thumbIdx: {},
    searchVal: '', notifOpen: false, accountOpen: false, notifRead: false, savedOnly: false, detail: null };
  var timer = null;
  var toastTimer = null;
  var lastFocus = null;
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var el = function (id) { return document.getElementById(id); };

  function matchesSearch(item) {
    var q = state.searchVal.trim().toLowerCase();
    if (!q) return true;
    var hay = [item.title, item.category, item.author, item.summary || '', (item.tags || []).join(' ')].join(' ').toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  // ---------- Renderers ----------
  function renderNav() {
    el('nav').innerHTML = ['홈', '리포트'].map(function (label) {
      var active = state.activeNav === label;
      return '<button type="button" class="nav__item' + (active ? ' is-active' : '') + '" data-nav="' + label + '"' +
        (active ? ' aria-current="page"' : '') + '>' + label + (active ? '<span class="nav__underline"></span>' : '') + '</button>';
    }).join('');
  }

  function renderHero() {
    el('hero-track').innerHTML = heroSlides.map(function (h) {
      return '<div class="hero__slide" style="background:' + h.bg + ';">' +
          '<div class="hero__scrim"></div>' +
          '<div class="hero__content">' +
            '<div class="hero__eyebrow">오늘의 인사이트</div>' +
            '<h1 class="hero__title">' + h.title + '</h1>' +
            '<p class="hero__body">' + h.body + '</p>' +
            '<div class="hero__meta">' +
              '<span class="author">' + h.author + '</span>' +
              '<span class="sep">|</span>' +
              '<span>' + h.role + '</span>' +
              '<span class="sep">•</span>' +
              '<span>' + h.date + '</span>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join('');
    updateHero();
  }

  function renderDots() {
    el('hero-dots').innerHTML = [0, 1, 2, 3].map(function (i) {
      var active = state.activeDot === i;
      return '<button type="button" class="hero__dot' + (active ? ' is-active' : '') + '" data-dot="' + i + '"' +
        ' aria-label="슬라이드 ' + (i + 1) + '"' + (active ? ' aria-current="true"' : '') + '></button>';
    }).join('');
  }

  function updateHero() {
    el('hero-track').style.transform = 'translateX(-' + (state.activeDot * 25) + '%)';
    renderDots();
  }

  function stopTimer() { clearInterval(timer); }
  function startTimer() {
    if (reduceMotion) return;
    clearInterval(timer);
    timer = setInterval(function () { state.activeDot = (state.activeDot + 1) % 4; updateHero(); }, 8500);
  }
  function goDot(i) { clearInterval(timer); state.activeDot = i; updateHero(); startTimer(); }

  function renderHomeChips() {
    el('home-chips').innerHTML = ['전체', '스마트폰', '오토', '휴머노이드'].map(function (label) {
      var active = state.activeChip === label;
      return '<button type="button" class="chip' + (active ? ' is-active' : '') + '" data-homechip="' + label +
        '" aria-pressed="' + active + '">' + label + '</button>';
    }).join('');
  }

  function bookmarkBtn(id, size, saved) {
    return '<button type="button" class="bookmark" data-bookmark="' + id + '" aria-label="북마크" aria-pressed="' + saved + '">' +
      ICON.bookmark(size, saved) + '</button>';
  }

  function renderCards() {
    var list = cardData.filter(function (c) {
      return (state.activeChip === '전체' || c.app === state.activeChip) && matchesSearch(c);
    });
    if (!list.length) { el('cards').innerHTML = '<div class="empty">검색 결과가 없습니다.</div>'; return; }
    el('cards').innerHTML = list.map(function (c) {
      var pool = imagePools[c.app] || imagePools['스마트폰'];
      if (state.thumbIdx[c.id] == null) state.thumbIdx[c.id] = Math.floor(Math.random() * pool.length);
      var idx = state.thumbIdx[c.id];
      var saved = !!state.saved[c.id];
      return '<div class="card" data-detail="' + c.id + '" data-listtype="card">' +
          '<div class="card__thumb" style="background:' + pool[idx] + ';"></div>' +
          '<div class="card__category">' + c.category + '</div>' +
          '<button type="button" class="card__title" data-detail="' + c.id + '" data-listtype="card">' + c.title + '</button>' +
          '<div class="card__meta"><span>' + c.author + '</span><span>·</span><span>' + c.date + '</span></div>' +
          '<div class="card__foot">' +
            '<div class="tags">' + c.tags.map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('') + '</div>' +
            bookmarkBtn(c.id, 18, saved) +
          '</div>' +
        '</div>';
    }).join('');
  }

  function renderRanking() {
    el('ranking').innerHTML = rankData.map(function (r) {
      return '<div class="rank-row">' +
          '<span class="rank-row__num">' + r.rank + '</span>' +
          '<span class="rank-row__title">' + r.title + '</span>' +
          '<span class="rank-row__date">' + r.date + '</span>' +
          '<span class="rank-row__views">' + ICON.eye(13) + ' ' + r.views + '</span>' +
        '</div>';
    }).join('');
  }

  function renderReportChips() {
    el('report-chips').innerHTML = ['전체', 'Smartphone', 'Humanoid', 'Auto'].map(function (label) {
      var active = state.reportChip === label;
      return '<button type="button" class="chip' + (active ? ' is-active' : '') + '" data-reportchip="' + label +
        '" aria-pressed="' + active + '">' + label + '</button>';
    }).join('');
  }

  function renderReportList() {
    var sel = state.reportChip;
    var list = reportData.filter(function (c) {
      return (sel === '전체' || c.app === sel) && (!state.savedOnly || state.saved[c.id]) && matchesSearch(c);
    });
    if (!list.length) {
      var msg = state.savedOnly ? '북마크한 리포트가 없습니다.' : '검색 결과가 없습니다.';
      el('report-list').innerHTML = '<div class="empty">' + msg + '</div>';
      return;
    }
    el('report-list').innerHTML = list.map(function (c) {
      var saved = !!state.saved[c.id];
      return '<div class="report-row" data-detail="' + c.id + '" data-listtype="report">' +
          '<div class="report-row__main">' +
            '<div class="report-row__category">' + c.category + '</div>' +
            '<button type="button" class="report-row__title" data-detail="' + c.id + '" data-listtype="report">' + c.title + '</button>' +
            '<p class="report-row__summary">' + c.summary + '</p>' +
            '<div class="report-row__meta">' +
              '<span class="author">' + c.author + '</span>' +
              '<span class="mdot">·</span>' +
              '<span class="date">' + c.date + '</span>' +
              '<span class="report-row__divider"></span>' +
              c.tags.map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('') +
            '</div>' +
          '</div>' +
          '<div class="report-row__side">' +
            bookmarkBtn(c.id, 20, saved) +
            '<span class="report-row__views">' + ICON.eye(14) + ' ' + c.views + '</span>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  function updateView() {
    var isHome = state.activeNav === '홈';
    el('home-view').classList.toggle('hidden', !isHome);
    el('report-view').classList.toggle('hidden', isHome);
  }

  // ---------- Header menus (notifications / account) ----------
  function syncMenus() {
    var n = el('notif-menu'), a = el('account-menu');
    if (n) n.classList.toggle('is-open', state.notifOpen);
    if (a) a.classList.toggle('is-open', state.accountOpen);
    var nb = el('bell-btn'), ab = el('account-btn');
    if (nb) nb.setAttribute('aria-expanded', String(state.notifOpen));
    if (ab) ab.setAttribute('aria-expanded', String(state.accountOpen));
  }
  function closeMenus() { state.notifOpen = false; state.accountOpen = false; syncMenus(); }
  function toggleNotif() { state.notifOpen = !state.notifOpen; state.accountOpen = false; syncMenus(); }
  function toggleAccount() { state.accountOpen = !state.accountOpen; state.notifOpen = false; syncMenus(); }
  function updateBadge() {
    var b = el('bell-badge');
    if (b) b.classList.toggle('is-read', state.notifRead);
  }

  function handleAction(a) {
    if (a === 'readall') { state.notifRead = true; updateBadge(); showToast('알림을 모두 읽음으로 표시했습니다.'); return; }
    closeMenus();
    if (a === 'bookmarks') {
      state.activeNav = '리포트'; state.reportChip = '전체'; state.savedOnly = true; state.searchVal = '';
      var s = el('search'); if (s) s.value = '';
      renderNav(); renderReportChips(); renderReportList(); updateView(); window.scrollTo(0, 0);
      showToast('북마크한 리포트만 표시합니다.');
      return;
    }
    if (a === 'profile') { showToast('프로필은 준비 중인 기능입니다.'); return; }
    if (a === 'settings') { showToast('설정은 준비 중인 기능입니다.'); return; }
    if (a === 'logout') { showToast('로그아웃되었습니다.'); return; }
  }

  function goReports() {
    state.activeNav = '리포트'; state.savedOnly = false;
    renderNav(); renderReportList(); updateView(); window.scrollTo(0, 0);
  }

  // ---------- Detail modal ----------
  function modalBookmarkInner(saved) {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="' + (saved ? '#fff' : 'none') + '" stroke="#fff" stroke-width="1.6" aria-hidden="true">' +
      '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.2L5 21V4a1 1 0 0 1 1-1Z"/></svg>' +
      '<span>' + (saved ? '저장됨' : '저장') + '</span>';
  }

  function renderDetail(item) {
    var saved = !!state.saved[item.id];
    var views = item.views ? '<span class="report-row__divider"></span><span class="modal__views">' + ICON.eye(14) + ' ' + item.views + '</span>' : '';
    var summary = item.summary ? '<p class="modal__summary">' + item.summary + '</p>' : '';
    var tags = (item.tags || []).map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('');
    return '<div class="modal__overlay">' +
        '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">' +
          '<button id="modal-close" type="button" class="modal__close" data-close aria-label="닫기">&times;</button>' +
          '<div class="modal__category">' + item.category + '</div>' +
          '<h2 id="modal-title" class="modal__title">' + item.title + '</h2>' +
          '<div class="modal__meta"><span>' + item.author + '</span><span class="mdot">·</span><span>' + item.date + '</span>' + views + '</div>' +
          summary +
          '<div class="modal__tags">' + tags + '</div>' +
          '<div class="modal__actions">' +
            '<button id="modal-bookmark" type="button" class="btn-primary" data-bookmark="' + item.id + '" data-context="modal" aria-pressed="' + saved + '">' + modalBookmarkInner(saved) + '</button>' +
            '<button type="button" class="btn-ghost" data-close>닫기</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function openDetail(item) {
    state.detail = item;
    lastFocus = document.activeElement;
    closeMenus();
    el('modal-root').innerHTML = renderDetail(item);
    document.body.style.overflow = 'hidden';
    var c = el('modal-close');
    if (c) c.focus();
  }

  function closeDetail() {
    state.detail = null;
    el('modal-root').innerHTML = '';
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function syncModalBookmark() {
    var b = el('modal-bookmark');
    if (!b || !state.detail) return;
    var saved = !!state.saved[state.detail.id];
    b.setAttribute('aria-pressed', String(saved));
    b.innerHTML = modalBookmarkInner(saved);
  }

  // ---------- Toast ----------
  function showToast(msg) {
    var t = el('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-show'); }, 2400);
  }

  // ---------- Click delegation ----------
  document.addEventListener('click', function (e) {
    // Menu toggles
    if (e.target.closest('#bell-btn')) { toggleNotif(); return; }
    if (e.target.closest('#account-btn')) { toggleAccount(); return; }
    // Click outside an open menu closes it
    if (!e.target.closest('.menu') && (state.notifOpen || state.accountOpen)) closeMenus();

    // Dropdown actions
    var action = e.target.closest('[data-action]');
    if (action) { handleAction(action.getAttribute('data-action')); return; }

    // Modal close (× / 닫기 buttons, or backdrop)
    if (e.target.closest('[data-close]')) { closeDetail(); return; }
    if (e.target.classList && e.target.classList.contains('modal__overlay')) { closeDetail(); return; }

    // Nav
    var nav = e.target.closest('[data-nav]');
    if (nav) { state.activeNav = nav.getAttribute('data-nav'); state.savedOnly = false; renderNav(); renderReportList(); updateView(); return; }

    // Carousel dots
    var dot = e.target.closest('[data-dot]');
    if (dot) { goDot(parseInt(dot.getAttribute('data-dot'), 10)); return; }

    // Home filter chips
    var hc = e.target.closest('[data-homechip]');
    if (hc) { state.activeChip = hc.getAttribute('data-homechip'); renderHomeChips(); renderCards(); return; }

    // Report filter chips
    var rc = e.target.closest('[data-reportchip]');
    if (rc) { state.reportChip = rc.getAttribute('data-reportchip'); state.savedOnly = false; renderReportChips(); renderReportList(); return; }

    // Bookmark toggle (cards, report rows, modal)
    var bm = e.target.closest('[data-bookmark]');
    if (bm) {
      var id = bm.getAttribute('data-bookmark');
      state.saved[id] = !state.saved[id];
      renderCards();
      renderReportList();
      if (state.detail) syncModalBookmark();
      return;
    }

    // "더보기" → report page
    if (e.target.closest('.panel__more')) { goReports(); return; }

    // Open detail (cards, report rows, notification items)
    var det = e.target.closest('[data-detail]');
    if (det) {
      var type = det.getAttribute('data-listtype');
      var item = findById(type === 'card' ? cardData : reportData, det.getAttribute('data-detail'));
      if (item) openDetail(item);
      return;
    }
  });

  // ---------- Keyboard: Escape closes modal / menus ----------
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (state.detail) { closeDetail(); }
    else if (state.notifOpen || state.accountOpen) { closeMenus(); }
  });

  // ---------- Init ----------
  function init() {
    renderNav();
    renderHero();
    renderHomeChips();
    renderCards();
    renderRanking();
    renderReportChips();
    renderReportList();
    updateView();

    var s = el('search');
    if (s) s.addEventListener('input', function (e) { state.searchVal = e.target.value; renderCards(); renderReportList(); });

    // Pause auto-advance while hovering / keyboard-focused inside the hero.
    var heroEl = document.querySelector('.hero');
    if (heroEl) {
      heroEl.addEventListener('mouseenter', stopTimer);
      heroEl.addEventListener('mouseleave', startTimer);
      heroEl.addEventListener('focusin', stopTimer);
      heroEl.addEventListener('focusout', startTimer);
    }
    startTimer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
