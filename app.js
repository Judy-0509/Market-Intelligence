// Market Intelligence — interactivity recreated from the Claude Design "Market Brief" component.
// Vanilla JS port: nav (홈/리포트), auto-cycling hero carousel, chip filters,
// bookmark toggles, and per-application random thumbnail pools.
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
    { id: 'c1', app: '스마트폰', category: '스마트폰', title: '스마트폰 수요 회복 신호, 하반기 가격 반등 기대', author: '이정현', date: '2024.05.20', tags: ['#출하량', '#프리미엄', '#교체수요'] },
    { id: 'c2', app: '휴머노이드', category: '휴머노이드', title: '휴머노이드 양산 로드맵 점검, 부품 수혜 주목', author: '박지훈', date: '2024.05.20', tags: ['#액추에이터', '#모터', '#감속기'] },
    { id: 'c3', app: '오토', category: '오토', title: '자동차 수출 호조 지속, 하이브리드 강세', author: '최재원', date: '2024.05.19', tags: ['#HEV', '#수출', '#완성차'] },
    { id: 'c4', app: '스마트폰', category: '스마트폰', title: '온디바이스 AI 탑재 확산, 교체 사이클 자극', author: '연예지', date: '2024.05.19', tags: ['#온디바이스AI', '#ASP', '#반도체'] }
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

  // ---------- State ----------
  var state = { activeNav: '홈', activeChip: '전체', reportChip: '전체', activeDot: 0, saved: {}, thumbIdx: {} };
  var timer = null;
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var el = function (id) { return document.getElementById(id); };

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
    timer = setInterval(function () {
      state.activeDot = (state.activeDot + 1) % 4;
      updateHero();
    }, 8500);
  }

  function goDot(i) {
    clearInterval(timer);
    state.activeDot = i;
    updateHero();
    startTimer();
  }

  function renderHomeChips() {
    el('home-chips').innerHTML = ['전체', '스마트폰', '오토', '휴머노이드'].map(function (label) {
      var active = state.activeChip === label;
      return '<button type="button" class="chip' + (active ? ' is-active' : '') + '" data-homechip="' + label +
        '" aria-pressed="' + active + '">' + label + '</button>';
    }).join('');
  }

  function renderCards() {
    el('cards').innerHTML = cardData.filter(function (c) {
      return state.activeChip === '전체' || c.app === state.activeChip;
    }).map(function (c) {
      var pool = imagePools[c.app] || imagePools['스마트폰'];
      if (state.thumbIdx[c.id] == null) state.thumbIdx[c.id] = Math.floor(Math.random() * pool.length);
      var idx = state.thumbIdx[c.id];
      var saved = !!state.saved[c.id];
      return '<div class="card">' +
          '<div class="card__thumb" style="background:' + pool[idx] + ';"></div>' +
          '<div class="card__category">' + c.category + '</div>' +
          '<div class="card__title">' + c.title + '</div>' +
          '<div class="card__meta"><span>' + c.author + '</span><span>·</span><span>' + c.date + '</span></div>' +
          '<div class="card__foot">' +
            '<div class="tags">' + c.tags.map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('') + '</div>' +
            '<button type="button" class="bookmark" data-bookmark="' + c.id + '" aria-label="북마크" aria-pressed="' + saved + '">' + ICON.bookmark(18, saved) + '</button>' +
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
    el('report-list').innerHTML = reportData.filter(function (c) {
      return sel === '전체' || c.app === sel;
    }).map(function (c) {
      var saved = !!state.saved[c.id];
      return '<div class="report-row">' +
          '<div class="report-row__main">' +
            '<div class="report-row__category">' + c.category + '</div>' +
            '<div class="report-row__title">' + c.title + '</div>' +
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
            '<button type="button" class="bookmark" data-bookmark="' + c.id + '" aria-label="북마크" aria-pressed="' + saved + '">' + ICON.bookmark(20, saved) + '</button>' +
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

  // ---------- Single delegated click handler ----------
  document.addEventListener('click', function (e) {
    var nav = e.target.closest('[data-nav]');
    if (nav) { state.activeNav = nav.getAttribute('data-nav'); renderNav(); updateView(); return; }

    var dot = e.target.closest('[data-dot]');
    if (dot) { goDot(parseInt(dot.getAttribute('data-dot'), 10)); return; }

    var hc = e.target.closest('[data-homechip]');
    if (hc) { state.activeChip = hc.getAttribute('data-homechip'); renderHomeChips(); renderCards(); return; }

    var rc = e.target.closest('[data-reportchip]');
    if (rc) { state.reportChip = rc.getAttribute('data-reportchip'); renderReportChips(); renderReportList(); return; }

    var bm = e.target.closest('[data-bookmark]');
    if (bm) {
      var id = bm.getAttribute('data-bookmark');
      state.saved[id] = !state.saved[id];
      renderCards();
      renderReportList();
      return;
    }
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

    // Pause auto-advance while the user is hovering or keyboard-focused inside the hero.
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
