/* ============================================================
   대장님 AI 오피스 · app.js
   빌드 없는 순수 HTML/CSS/JS · 데이터는 seed.js / data.json
   ============================================================ */
(function () {
  "use strict";

  var KEY = {
    theme: "office.theme",
    style: "office.mapStyle",
    motion: "office.motion",
    memo: "office.directives",
    read: "office.notifRead"
  };

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function loadJSON(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function saveJSON(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  function store(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  var data = null;
  var state = {
    tab: "map",
    mapStyle: "basic",
    motion: true,
    theme: "light",
    directives: []
  };

  var agents = [];
  var talkTimer = null;
  var clockTimer = null;
  var toastTimer = null;
  var lastFocus = null;

  /* ------------------------------------------------------------
     컬러 팔레트 · 스프라이트
     ------------------------------------------------------------ */
  var PALETTE = {
    p0: { body: "#E09272", dark: "#B4603F", ink: "#4A2318" },
    p1: { body: "#E7B36B", dark: "#BE8A42", ink: "#4A3218" },
    p2: { body: "#95BAD9", dark: "#5F8BB0", ink: "#24384A" },
    p3: { body: "#A9C88C", dark: "#7C9E5C", ink: "#33421F" }
  };

  function spriteSvg(id) {
    var p = PALETTE[id] || PALETTE.p2;
    var face = "";
    /* eyes + glints */
    face += '<circle cx="22" cy="38" r="2.6" fill="#2B2118"/>' +
      '<circle cx="34" cy="38" r="2.6" fill="#2B2118"/>' +
      '<circle cx="22.8" cy="37.2" r="0.85" fill="#fff"/>' +
      '<circle cx="34.8" cy="37.2" r="0.85" fill="#fff"/>';
    /* cheeks */
    face += '<circle cx="15.5" cy="45" r="3" fill="#E58B7C" opacity=".5"/>' +
      '<circle cx="40.5" cy="45" r="3" fill="#E58B7C" opacity=".5"/>';
    /* mouth */
    if (id === "p0") {
      face += '<path d="M22.5 43.5q5.5 5.5 11 .5" fill="none" stroke="#2B2118" stroke-width="1.8" stroke-linecap="round"/>';
    } else if (id === "p1") {
      face += '<path d="M23 47q5 4 10 0" fill="none" stroke="#2B2118" stroke-width="1.7" stroke-linecap="round"/>';
    } else if (id === "p2") {
      face += '<path d="M23 44v6h6v-6M23 47h6" fill="none" stroke="#2B2118" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
    } else {
      face += '<ellipse cx="28" cy="47.4" rx="2.6" ry="2.2" fill="#2B2118"/>';
    }
    /* accessories */
    var extra = "";
    if (id === "p0") {
      /* 왕관 + 별 배지 — 부대장 클로드 */
      extra += '<path d="M16.5 21.5l2.2-9.4 5.1 5.2 4.2-8 4.2 8 5.1-5.2 2.2 9.4z" fill="#F2C64E" stroke="#C08F1E" stroke-width="1.1" stroke-linejoin="round"/>' +
        '<rect x="16.2" y="21.4" width="23.6" height="3.1" rx="1.55" fill="#E3B33A" stroke="#C08F1E" stroke-width="1"/>' +
        '<circle cx="18.7" cy="12.8" r="1" fill="#B98413"/>' +
        '<circle cx="28" cy="10" r="1" fill="#B98413"/>' +
        '<circle cx="37.3" cy="12.8" r="1" fill="#B98413"/>' +
        '<path d="M28 50.6l1.9 3.8 4.2.6-3 2.9.7 4.2-3.8-2-3.8 2 .7-4.2-3-2.9 4.2-.6z" fill="#FBE08C" stroke="#C9A02C" stroke-width=".9" stroke-linejoin="round"/>';
    } else if (id === "p1") {
      extra += '<g fill="none" stroke="#6B4A2A" stroke-width="1.5">' +
        '<circle cx="22" cy="38" r="6.2"/>' +
        '<circle cx="34" cy="38" r="6.2"/>' +
        '</g><path d="M28 38h0" stroke="#6B4A2A" stroke-width="1.4"/>';
    } else if (id === "p2") {
      extra += '<path d="M11 35a17 17 0 0 1 34 0" fill="none" stroke="#3F6079" stroke-width="2.3" stroke-linecap="round"/>' +
        '<rect x="7.6" y="32" width="5.6" height="9.5" rx="2.8" fill="#3F6079"/>' +
        '<rect x="42.8" y="32" width="5.6" height="9.5" rx="2.8" fill="#3F6079"/>' +
        '<path d="M45 41.5c0 3.4-3.4 5.4-6.4 5.4" fill="none" stroke="#3F6079" stroke-width="1.6" stroke-linecap="round"/>' +
        '<circle cx="38" cy="47" r="1.4" fill="#3F6079"/>';
    } else {
      extra += '<path d="M11 31a17.4 12.4 0 0 1 34 0z" fill="#6E9153"/>' +
        '<ellipse cx="28" cy="31" rx="19" ry="3.2" fill="#5A7A42"/>' +
        '<path d="M27 19c0-3 2-4 3-6" fill="none" stroke="#5A7A42" stroke-width="1.6" stroke-linecap="round"/>' +
        '<circle cx="30.4" cy="12.4" r="2.4" fill="#8FB26A"/>';
    }
    return '' +
      '<svg class="sprite" viewBox="0 0 56 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
      '<ellipse cx="28" cy="68" rx="15" ry="3.2" fill="rgba(0,0,0,.32)"/>' +
      '<ellipse cx="7.5" cy="46" rx="4" ry="6" fill="' + p.dark + '"/>' +
      '<ellipse cx="48.5" cy="46" rx="4" ry="6" fill="' + p.dark + '"/>' +
      '<ellipse cx="28" cy="44" rx="20" ry="24" fill="' + p.dark + '"/>' +
      '<ellipse cx="28" cy="42.4" rx="18.6" ry="22.4" fill="' + p.body + '"/>' +
      '<ellipse cx="21" cy="32" rx="6" ry="9" fill="#fff" opacity=".2"/>' +
      '<circle cx="13.5" cy="53" r="1.7" fill="' + p.dark + '" opacity=".55"/>' +
      '<circle cx="42.5" cy="55" r="1.5" fill="' + p.dark + '" opacity=".5"/>' +
      '<circle cx="19" cy="59" r="1.2" fill="' + p.dark + '" opacity=".45"/>' +
      face + extra +
      '</svg>';
  }

  /* ------------------------------------------------------------
     시간·날짜 헬퍼
     ------------------------------------------------------------ */
  function fmtClock(d) {
    var h = d.getHours();
    var ampm = h < 12 ? "오전" : "오후";
    var hh = h % 12 || 12;
    return ampm + " " + hh + ":" + pad(d.getMinutes());
  }

  function fmtDateLabel(d) {
    var days = ["일", "월", "화", "수", "목", "금", "토"];
    return (d.getMonth() + 1) + "/" + d.getDate() + "(" + days[d.getDay()] + ")";
  }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function dday(isoDate) {
    var target = new Date(isoDate + "T00:00:00");
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var diff = Math.round((target - now) / 86400000);
    if (diff === 0) return "D-DAY";
    if (diff > 0) return "D-" + diff;
    return "D+" + Math.abs(diff);
  }

  function minutesOf(hhmm) {
    var parts = String(hhmm).split(":");
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || "0", 10);
  }

  /* ------------------------------------------------------------
     부트스트랩
     ------------------------------------------------------------ */
  function boot() {
    var seed = window.SECRETARY_SEED;
    if (location.protocol === "file:") {
      start(seed);
      return;
    }
    fetch("data.json", { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("no data");
        return res.json();
      })
      .then(function (json) { start(json); })
      .catch(function () { start(seed); });
  }

  function start(json) {
    if (!json) {
      document.body.insertAdjacentHTML("beforeend",
        '<p style="padding:24px;text-align:center;font-size:13px">데이터를 불러오지 못했습니다. seed.js 파일을 확인해 주세요.</p>');
      return;
    }
    data = json;
    state.theme = window.localStorage.getItem(KEY.theme) === "dark" ? "dark" : "light";
    state.mapStyle = loadJSON(KEY.style, "basic") === "clay" ? "clay" : "basic";
    var motionRaw = window.localStorage.getItem(KEY.motion);
    state.motion = motionRaw === null ? true : motionRaw === "on";
    state.directives = loadJSON(KEY.memo, []);
    if (!Array.isArray(state.directives)) state.directives = [];

    applyTheme(state.theme, true);
    applyMapStyle(state.mapStyle, true);
    applyMotion(state.motion, true);
    renderAll();
    buildAgents();
    bind();
    setTab(initialTab(), true);
    updateClock();
    clockTimer = window.setInterval(updateClock, 20000);
    updateBadge();
  }

  function initialTab() {
    var hash = (location.hash || "").replace("#", "");
    var allowed = ["map", "meeting", "dash", "cal", "credits", "entries"];
    return allowed.indexOf(hash) >= 0 ? hash : "map";
  }

  /* ------------------------------------------------------------
     전체 렌더
     ------------------------------------------------------------ */
  function renderAll() {
    renderMapRooms();
    renderTeam();
    renderChain();
    renderRoster();
    renderPipeline();
    renderLogs();
    renderMemos();
    renderStats();
    renderDealsAndCoupons();
    renderFamily();
    renderCalendar();
    renderAwards();
    renderBirthdays();
    renderCredits();
    renderEntries();
    var count = data.stats && data.stats.entries ? data.stats.entries.total : "–";
    var todayEl = $("#todayCount");
    if (todayEl) todayEl.textContent = count;
  }

  function renderMapRooms() {
    var cards = $("#roomCards");
    if (!cards) return;
    cards.innerHTML = data.rooms.map(function (room) {
      return '<button class="room-card" type="button" data-room="' + esc(room.id) + '" data-tab="' + esc(room.tab) + '">' +
        '<span class="rc-icon" aria-hidden="true">' + room.icon + '</span>' +
        '<span class="rc-body">' +
        '<span class="rc-name">' + esc(room.name) + '</span>' +
        '<span class="rc-line">' + esc(room.line) + '</span>' +
        '</span>' +
        '<span class="rc-enter">입장 →</span>' +
        '</button>';
    }).join("");
  }

  function renderTeam() {
    var box = $("#teamGrid");
    if (!box) return;
    box.innerHTML = data.team.map(function (t) {
      var warm = t.status !== "가동 중";
      return '<div class="team-card">' +
        '<div class="team-avatar" aria-hidden="true">' + spriteSvg(t.id) + '</div>' +
        '<div class="team-main">' +
        '<div class="team-top"><span class="team-name">' + esc(t.name) + '</span>' +
        '<span class="team-role">' + esc(t.role) + '</span>' +
        '<span class="team-handle">' + esc(t.handle) + '</span></div>' +
        '<p class="team-note">' + esc(t.note) + '</p>' +
        '<div class="team-duties">' + t.duties.map(function (d) {
          return "<span>" + esc(d) + "</span>";
        }).join("") + '</div>' +
        '</div>' +
        '<span class="team-state' + (warm ? " warm" : "") + '"><span class="live-dot"></span>' + esc(t.status) + '</span>' +
        '</div>';
    }).join("");
  }

  function renderChain() {
    var box = $("#chainStrip");
    if (!box || !data.chain) return;
    box.innerHTML = data.chain.map(function (c, i) {
      var html = '<div class="chain-node ' + esc(c.tone || "") + '">' +
        '<span class="cn-name">' + esc(c.name) + '</span>' +
        '<small>' + esc(c.role) + '</small></div>';
      if (i < data.chain.length - 1) html += '<span class="chain-arrow" aria-hidden="true">›</span>';
      return html;
    }).join("");
  }

  function renderRoster() {
    var on = $("#onCount");
    if (on) on.textContent = "👥 " + data.team.length + "명 ON";
    var roster = $("#mapRoster");
    if (roster) {
      roster.textContent = data.roster || data.team.map(function (t) { return t.name + " " + t.role; }).join(" · ");
    }
    var bots = $("#botCount");
    if (bots) bots.textContent = data.team.length;
  }

  function renderPipeline() {
    var box = $("#pipe");
    if (!box) return;
    box.innerHTML = data.pipeline.map(function (s) {
      return '<div class="pipe-step ' + esc(s.state) + '">' +
        '<span class="num">' + esc(s.step) + '</span>' +
        '<div class="ps-body"><div class="ps-title">' + esc(s.title) + '</div>' +
        '<div class="ps-note">' + esc(s.note) + '</div></div>' +
        '<span class="ps-owner">' + esc(s.owner) + '</span>' +
        '</div>';
    }).join("");
  }

  var WHO = { p0: "부대장 클로드", p1: "1호", p2: "2호 크리", p3: "3호", captain: "대장님" };

  function renderLogs() {
    var box = $("#logList");
    if (!box) return;
    box.innerHTML = data.reports.map(function (r) {
      return '<div class="log-item">' +
        '<span class="log-time">' + esc(r.at) + '</span>' +
        '<div class="log-body">' +
        '<div class="log-top"><span class="log-who">' + esc(WHO[r.from] || r.from) + '</span>' +
        '<span class="log-arrow">→</span><span class="log-who">' + esc(WHO[r.to] || r.to) + '</span>' +
        '<span class="log-tag">' + esc(r.tag) + '</span></div>' +
        '<p class="log-text">' + esc(r.text) + '</p>' +
        '</div></div>';
    }).join("");
  }

  function renderMemos() {
    var box = $("#memoList");
    if (!box) return;
    box.innerHTML = state.directives.map(function (m) {
      return '<div class="memo-item" data-id="' + esc(m.id) + '">' +
        '<span class="mi-text">' + esc(m.text) + '</span>' +
        '<span class="mi-time">' + esc(m.at) + '</span>' +
        '<button class="mi-del" type="button" aria-label="메모 삭제" data-del="' + esc(m.id) + '">✕</button>' +
        '</div>';
    }).join("");
  }

  function renderStats() {
    var box = $("#statGrid");
    if (!box) return;
    var s = data.stats;
    var cards = [
      {
        cls: "accent",
        label: "🎟️ 누적 응모",
        value: s.entries.total,
        unit: "건",
        sub: "11/26 " + s.entries.prev + " + 오늘 " + s.entries.today
      },
      {
        label: "🛒 100% 페이백",
        value: s.deals.total,
        unit: "건",
        sub: "미달 " + s.deals.under + "건 · 자부담 0원 " + s.deals.zero
      },
      {
        label: "🏆 오늘 당첨 확인",
        value: s.awards.today,
        unit: "건",
        sub: "다음 발표 " + s.awards.nextDate + " · " + s.awards.nextCount + "건"
      },
      {
        label: "🎫 0원 쿠폰",
        value: s.coupons.zero,
        unit: "종",
        sub: "앱테크 퀴즈 " + s.coupons.quiz + "건 · 클릭 " + s.coupons.naverPoint + "원"
      }
    ];
    box.innerHTML = cards.map(function (c) {
      return '<div class="stat-card ' + (c.cls || "") + '">' +
        '<div class="sc-label">' + c.label + '</div>' +
        '<div class="sc-value">' + c.value + '<small>' + c.unit + '</small></div>' +
        '<div class="sc-sub">' + esc(c.sub) + '</div>' +
        '</div>';
    }).join("");
  }

  function renderDealsAndCoupons() {
    var bars = $("#dealBars");
    if (bars) {
      var d = data.stats.deals;
      bars.innerHTML =
        barRow("미달 공고", d.under, d.total, (d.under / d.total) * 100, "green") +
        barRow("자부담 0원", d.zero, d.total, (d.zero / d.total) * 100, "");
    }
    var mini = $("#dealMini");
    if (mini) {
      mini.innerHTML = data.deals.items.slice(0, 3).map(function (it) {
        return '<div class="mini-row"><span class="mr-dot green"></span>' +
          '<div class="mr-main"><div class="mr-title">' + esc(it.name) + '</div>' +
          '<div class="mr-sub">' + esc(it.platform) + " · 정원 " + it.slots + " / 신청 " + it.applied + '</div></div>' +
          '<span class="mr-val">' + esc(it.pay) + '</span></div>';
      }).join("");
    }
    var coupons = $("#couponMini");
    if (coupons) {
      coupons.innerHTML = data.coupons.slice(0, 4).map(function (c) {
        return '<div class="mini-row"><span class="mr-dot ' + esc(c.tone) + '"></span>' +
          '<div class="mr-main"><div class="mr-title">' + esc(c.title) + '</div>' +
          '<div class="mr-sub">' + esc(c.prize) + '</div></div>' +
          '<span class="mr-val">' + esc(c.deadline) + '</span></div>';
      }).join("");
    }
  }

  function barRow(label, value, total, pct, tone) {
    return '<div class="bar-row">' +
      '<div class="bar-top"><span>' + esc(label) + '</span><span><strong>' + value + '</strong> / ' + total + '</span></div>' +
      '<div class="bar-track"><div class="bar-fill ' + tone + '" style="width:' + Math.max(4, Math.min(100, pct)).toFixed(0) + '%"></div></div>' +
      '</div>';
  }

  function renderFamily() {
    var ringBox = $("#homeRing");
    var mini = $("#familyMini");
    if (!ringBox || !mini) return;
    var total = data.stats.home.total;
    var done = data.stats.home.done;
    var pct = total ? Math.round((done / total) * 100) : 0;
    ringBox.innerHTML = '<div class="ring" style="--p:' + pct + '"><span>' + done + "<small>/" + total + "</small></span></div>" +
      '<div class="hr-text"><strong>오늘 집안일 · 17:00 알람</strong>' +
      esc(data.chores.slice(2, 5).map(function (c) { return c.text; }).join(" · ")) +
      '<br>알람이 오면 하나씩 체크하면 됩니다.</div>';
    var next = nextBirthday();
    var rows = [];
    if (next) {
      rows.push('<div class="mini-row"><span class="mr-dot amber"></span>' +
        '<div class="mr-main"><div class="mr-title">' + esc(next.name) + " 생신</div>" +
        '<div class="mr-sub">' + esc(next.kind + " " + next.origin + " · " + next.solar) + '</div></div>' +
        '<span class="mr-val">' + dday(next.solar) + '</span></div>');
      rows.push('<div class="mini-row"><span class="mr-dot"></span>' +
        '<div class="mr-main"><div class="mr-title">생일 알람</div>' +
        '<div class="mr-sub">' + esc(next.alarm) + ' 08:30 · 1호 등록</div></div>' +
        '<span class="mr-val">' + dday(next.alarm) + '</span></div>');
    }
    rows.push('<div class="mini-row"><span class="mr-dot green"></span>' +
      '<div class="mr-main"><div class="mr-title">남은 집안일</div>' +
      '<div class="mr-sub">' + (total - done) + '개 · 청소기 · 세탁 · 아이 책 정리</div></div>' +
      '<span class="mr-val">' + (total - done) + '개</span></div>');
    mini.innerHTML = rows.join("");
  }

  function renderCalendar() {
    var box = $("#timeline");
    if (!box) return;
    var label = $("#todayLabel");
    if (label) label.textContent = fmtDateLabel(new Date());
    var nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    box.innerHTML = data.routine.map(function (r) {
      var m = minutesOf(r.time);
      var isNow = Math.abs(nowMin - m) <= 20;
      return '<div class="tl-item' + (isNow ? " now" : "") + '">' +
        '<span class="tl-time">' + esc(r.time) + '</span>' +
        '<span class="tl-rail"><span class="tl-dot"></span></span>' +
        '<div class="tl-body"><div class="tl-title">' + esc(r.title) + '</div>' +
        '<div class="tl-note">' + esc(r.note) + '</div>' +
        '<span class="tl-owner">' + esc(r.owner) + '</span></div>' +
        '</div>';
    }).join("");
  }

  function renderAwards() {
    var box = $("#awardList");
    if (!box) return;
    box.innerHTML = data.awards.map(function (a, i) {
      return '<details class="award-item"' + (i === 0 ? " open" : "") + '>' +
        '<summary><span class="award-date">' + esc(a.date) + ' (' + esc(a.dow) + ')</span>' +
        '<span>' + esc(a.count) + '건 발표</span>' +
        '<span class="award-count">' + esc(a.dday || "") + '</span></summary>' +
        '<ul class="award-items">' + a.items.map(function (it) {
          return "<li>" + esc(it) + "</li>";
        }).join("") + '</ul></details>';
    }).join("");
  }

  function renderBirthdays() {
    var box = $("#bdayList");
    if (!box) return;
    var list = data.birthdays.slice().sort(function (a, b) {
      return a.solar < b.solar ? -1 : 1;
    });
    box.innerHTML = list.map(function (b) {
      return '<div class="bday-row"><span class="bday-name">' + esc(b.name) + '</span>' +
        '<span class="bday-meta">' + esc(b.kind + " " + b.origin + " · " + b.solar) + ' / 알람 ' + esc(b.alarm) + '</span>' +
        '<span class="bday-dday">' + dday(b.solar) + '</span></div>';
    }).join("");
  }

  function renderCredits() {
    var box = $("#creditList");
    if (!box) return;
    box.innerHTML = data.credits.agents.map(function (c) {
      var team = data.team.filter(function (t) { return t.id === c.id; })[0] || { name: c.id, role: "" };
      return '<div class="credit-card">' +
        '<div class="cc-avatar" aria-hidden="true">' + spriteSvg(c.id) + '</div>' +
        '<div class="cc-body">' +
        '<div class="cc-top"><span class="cc-name">' + esc(team.name) + '</span>' +
        '<span class="cc-role">' + esc(team.role) + '</span>' +
        '<span class="cc-state ' + (c.tone === "amber" ? "amber" : "") + '">' + esc(c.state) + '</span></div>' +
        '<div class="cc-note">' + esc(c.note) + '</div>' +
        '<div class="cc-today">오늘 처리 <strong>' + esc(c.today) + '</strong></div>' +
        '</div></div>';
    }).join("");

    var chain = $("#relayChain");
    if (chain) {
      var order = ["p1", "p2", "p3"];
      chain.innerHTML = order.map(function (id, i) {
        var t = data.team.filter(function (x) { return x.id === id; })[0];
        var now = id === "p2";
        var html = '<div class="relay-node' + (now ? " is-now" : "") + '">' +
          '<span>' + esc(t.name) + '</span>' +
          '<small>' + (now ? "이 오피스 담당" : i === 2 ? "합류 대기" : "가동 중") + '</small></div>';
        if (i < order.length - 1) html += '<span class="relay-arrow" aria-hidden="true">→</span>';
        return html;
      }).join("");
    }
    var rule = $("#relayRule");
    if (rule) rule.textContent = data.credits.rule;
    var rules = $("#relayRules");
    if (rules) {
      rules.innerHTML = data.credits.rules.map(function (r) {
        return "<li>" + esc(r) + "</li>";
      }).join("");
    }
  }

  function renderEntries() {
    var s = data.stats;
    var sum = $("#entriesSummary");
    if (sum) {
      sum.innerHTML = [
        { v: s.entries.today, l: "오늘 응모" },
        { v: s.deals.under, l: "체험단 미달" },
        { v: s.coupons.zero, l: "0원 쿠폰" }
      ].map(function (x) {
        return '<div class="es-item"><strong>' + x.v + '</strong><span>' + x.l + '</span></div>';
      }).join("");
    }

    var count = $("#entryCount");
    if (count) count.textContent = data.entries.length;

    var list = $("#entryList");
    if (list) {
      list.innerHTML = data.entries.map(function (e, i) {
        var due = /^11\/27/.test(e.deadline);
        return '<div class="entry-item">' +
          '<span class="entry-no">' + pad(i + 1) + '</span>' +
          '<div class="entry-body">' +
          '<div class="entry-title">' +
          (e.url ? '<a href="' + esc(e.url) + '" target="_blank" rel="noopener noreferrer">' + esc(e.title) + ' ↗</a>' : esc(e.title)) +
          '</div>' +
          '<div class="entry-host">' + esc(e.host) + '</div>' +
          '<div class="entry-meta">' +
          '<span class="prize">' + esc(e.prize) + '</span>' +
          '<span class="' + (due ? "due" : "") + '">마감 ' + esc(e.deadline) + '</span>' +
          '<span>발표 ' + esc(e.announce) + '</span>' +
          '</div></div></div>';
      }).join("");
    }

    var deals = $("#dealList");
    if (deals) {
      deals.innerHTML = data.deals.items.map(function (d) {
        var pct = d.slots ? (d.applied / d.slots) * 100 : 0;
        var hot = d.slots - d.applied >= Math.max(10, d.slots * 0.6);
        return '<div class="deal-item">' +
          '<div class="deal-top"><div class="deal-name">' +
          (d.url ? '<a href="' + esc(d.url) + '" target="_blank" rel="noopener noreferrer">' + esc(d.name) + ' ↗</a>' : esc(d.name)) +
          '</div><span class="deal-pay">' + esc(d.pay) + '</span></div>' +
          '<div class="deal-meta">' +
          '<span class="dm">' + esc(d.platform) + '</span>' +
          '<span class="dm">' + esc(d.market) + '</span>' +
          '<span class="dm' + (hot ? " hot" : "") + '">정원 ' + d.slots + ' / 신청 ' + d.applied + '</span>' +
          '<span class="dm">~' + esc(d.deadline) + '</span>' +
          '</div>' +
          '<div class="deal-slots" aria-hidden="true"><i style="width:' + Math.max(2, Math.min(100, pct)).toFixed(0) + '%"></i></div>' +
          '</div>';
      }).join("");
    }

    var coupons = $("#couponList");
    if (coupons) {
      coupons.innerHTML = data.coupons.map(function (c) {
        return '<div class="coupon-item">' +
          '<span class="coupon-ico" aria-hidden="true">🎫</span>' +
          '<div class="coupon-body">' +
          '<div class="coupon-title">' +
          (c.url ? '<a href="' + esc(c.url) + '" target="_blank" rel="noopener noreferrer">' + esc(c.title) + ' ↗</a>' : esc(c.title)) +
          '</div>' +
          '<div class="coupon-prize">' + esc(c.prize) + '</div>' +
          '<div class="coupon-note">' + esc(c.note) + '</div>' +
          '</div>' +
          '<span class="coupon-due ' + esc(c.tone) + '">' + esc(c.deadline) + '</span>' +
          '</div>';
      }).join("");
    }
  }

  function nextBirthday() {
    var today = todayKey();
    var list = data.birthdays.filter(function (b) { return b.solar >= today; })
      .sort(function (a, b) { return a.solar < b.solar ? -1 : 1; });
    return list[0] || data.birthdays[0];
  }

  /* ------------------------------------------------------------
     탭
     ------------------------------------------------------------ */
  function setTab(name, silent) {
    var allowed = ["map", "meeting", "dash", "cal", "credits", "entries"];
    if (allowed.indexOf(name) < 0) name = "map";
    state.tab = name;
    $$(".tab").forEach(function (btn) {
      var on = btn.getAttribute("data-tab") === name;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
      if (!btn.id) btn.id = "tab-" + btn.getAttribute("data-tab");
    });
    $$(".view").forEach(function (view) {
      var on = view.getAttribute("data-view") === name;
      view.classList.toggle("is-active", on);
      if (on) view.removeAttribute("hidden");
      else view.setAttribute("hidden", "");
    });
    if (!silent) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      try { history.replaceState(null, "", "#" + name); } catch (e) { /* ignore */ }
    }
    if (name === "map") {
      if (state.motion) startMotion();
    } else {
      stopMotion(true);
    }
  }

  /* ------------------------------------------------------------
     캐릭터 · 이동
     ------------------------------------------------------------ */
  var SPOTS = {
    grand: [[13, 33], [20, 26], [26, 42], [15, 48], [28, 32], [32, 44]],
    command: [[46, 40], [55, 29], [61, 44], [71, 34], [50, 54], [69, 51], [76, 42], [64, 53]],
    lounge: [[58, 72], [66, 80], [75, 69], [83, 78]],
    corridor: [[40, 56], [44, 63], [37, 41], [43, 47], [33, 55]]
  };
  var ROUTE = {
    p0: ["grand", "command", "lounge", "corridor"],
    p1: ["grand", "command", "corridor", "grand"],
    p2: ["command", "lounge", "corridor", "command"],
    p3: ["command", "grand", "corridor"]
  };
  var LINES = {
    p0: ["📋 총괄 검토", "⚡ 브리핑 조율", "🔗 GitHub 동기화", "📋 총괄 검토 완료", "⚡ 4명 체제 정렬"],
    p1: ["💬 브리핑 준비 완료", "💬 3호 게이트 확인 중", "⚡ 지시 정리 중", "🎯 12/1 발표 9건"],
    p2: ["🎯 페토세라 0/16!", "💬 0원 쿠폰 6종", "⚡ 응모 10건 완료", "🎯 미달 26건 추렸어요", "☕ 잠깐 충전 중"],
    p3: ["💬 검증 게이트 세팅", "⚡ 실행 승인 대기", "🎯 중복 0건 확인"]
  };
  var POS = { p0: [36, 52], p1: [16, 36], p2: [55, 47], p3: [71, 31] };

  function buildAgents() {
    var box = $("#agents");
    var stage = $("#officeStage");
    if (!box || !stage) return;
    box.innerHTML = "";
    agents = data.team.map(function (t) {
      var el = document.createElement("div");
      el.className = "agent " + t.id;
      el.setAttribute("data-agent", t.id);
      el.innerHTML = '<span class="bubble"></span>' +
        '<span class="sprite-wrap">' + spriteSvg(t.id) + '</span>' +
        '<span class="agent-tag">' + esc(t.name) + '</span>';
      box.appendChild(el);
      var p = POS[t.id] || [50, 40];
      el.style.left = p[0] + "%";
      el.style.top = p[1] + "%";
      return {
        id: t.id,
        el: el,
        x: p[0],
        y: p[1],
        rooms: ROUTE[t.id] || ["command"],
        timer: null,
        waiting: null
      };
    });
  }

  function startMotion() {
    if (!state.motion || state.tab !== "map") return;
    agents.forEach(function (a) {
      window.clearTimeout(a.timer);
      window.clearTimeout(a.waiting);
      a.timer = window.setTimeout(function () { moveAgent(a); }, 400 + Math.random() * 1200);
    });
    scheduleTalk();
  }

  function stopMotion(freeze) {
    window.clearTimeout(talkTimer);
    talkTimer = null;
    agents.forEach(function (a) {
      window.clearTimeout(a.timer);
      window.clearTimeout(a.waiting);
      a.el.classList.remove("walk");
      a.el.classList.remove("talk");
      if (freeze) freezeAgent(a);
    });
  }

  function freezeAgent(a) {
    var stage = $("#officeStage");
    if (!stage) return;
    var sr = stage.getBoundingClientRect();
    var ar = a.el.getBoundingClientRect();
    if (!sr.width || !sr.height) return;
    var x = ((ar.left + ar.width / 2 - sr.left) / sr.width) * 100;
    var y = ((ar.top + ar.height - sr.top) / sr.height) * 100;
    a.x = x;
    a.y = y;
    a.el.style.transitionDuration = "0s";
    a.el.style.left = x + "%";
    a.el.style.top = y + "%";
    void a.el.offsetWidth;
    a.el.style.transitionDuration = "";
  }

  function pickSpot(a) {
    var best = null;
    var bestGap = -1;
    for (var i = 0; i < 12; i++) {
      var room = pick(a.rooms);
      var candidate = pick(SPOTS[room] || SPOTS.command);
      var gap = 99;
      agents.forEach(function (other) {
        if (other === a) return;
        var dx = other.x - candidate[0];
        var dy = other.y - candidate[1];
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < gap) gap = dist;
      });
      if (gap > bestGap) { bestGap = gap; best = candidate; }
      if (bestGap > 13) break;
    }
    return best || pick(SPOTS.command);
  }

  function moveAgent(a) {
    if (!state.motion || state.tab !== "map" || document.hidden) return;
    var pt = pickSpot(a);
    var dx = pt[0] - a.x;
    var dy = pt[1] - a.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 4) {
      a.waiting = window.setTimeout(function () { moveAgent(a); }, 500);
      return;
    }
    var dur = Math.max(1.7, Math.min(6.5, dist / 8.5));
    a.el.style.transitionDuration = dur + "s";
    a.el.classList.add("walk");
    if (dx < -0.8) a.el.classList.add("face-left");
    else if (dx > 0.8) a.el.classList.remove("face-left");
    a.x = pt[0];
    a.y = pt[1];
    a.el.style.left = a.x + "%";
    a.el.style.top = a.y + "%";
    window.clearTimeout(a.timer);
    a.timer = window.setTimeout(function () {
      a.el.classList.remove("walk");
      a.waiting = window.setTimeout(function () {
        moveAgent(a);
      }, 900 + Math.random() * 2800);
    }, dur * 1000 + 90);
  }

  function scheduleTalk() {
    window.clearTimeout(talkTimer);
    talkTimer = window.setTimeout(function () {
      if (state.motion && state.tab === "map" && !document.hidden) {
        agents.forEach(function (x) { x.el.classList.remove("talk"); });
        var a = pick(agents);
        if (a) {
          var bubble = a.el.querySelector(".bubble");
          bubble.textContent = pick(LINES[a.id] || ["💬"]);
          a.el.classList.add("talk");
          window.setTimeout(function () { a.el.classList.remove("talk"); }, 2600);
        }
      }
      scheduleTalk();
    }, 3600 + Math.random() * 3600);
  }

  /* ------------------------------------------------------------
     테마 · 배경 · 움직임
     ------------------------------------------------------------ */
  function applyTheme(theme, silent) {
    state.theme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    var icon = $("#themeIcon");
    if (icon) icon.textContent = theme === "dark" ? "☀️" : "🌙";
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#16120f" : "#FAF5EC");
    store(KEY.theme, theme);
    if (!silent) toast(theme === "dark" ? "🌙 나이트 오피스로 바꿨어요" : "☀️ 라이트 오피스로 돌아왔어요");
  }

  function applyMapStyle(style, silent) {
    state.mapStyle = style;
    var stage = $("#officeStage");
    if (stage) {
      stage.classList.toggle("style-basic", style === "basic");
      stage.classList.toggle("style-clay", style === "clay");
    }
    $$(".seg-btn").forEach(function (btn) {
      var on = btn.getAttribute("data-style") === style;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    saveJSON(KEY.style, style);
    if (!silent) toast(style === "clay" ? "🧸 클레이 휴게실로 바뀌었어요" : "🏢 기본 오피스로 돌아왔어요");
  }

  function applyMotion(on, silent) {
    state.motion = on;
    var btn = $("#motionBtn");
    var label = $("#motionLabel");
    if (btn) {
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    }
    if (label) label.textContent = on ? "움직임 ON" : "움직임 OFF";
    try { window.localStorage.setItem(KEY.motion, on ? "on" : "off"); } catch (e) { /* ignore */ }
    if (on) {
      if (state.tab === "map") startMotion();
    } else {
      stopMotion(true);
    }
    if (!silent) toast(on ? "✨ 봇들이 움직이기 시작했어요" : "움직임을 멈췄어요");
  }

  /* ------------------------------------------------------------
     시계 · 알림
     ------------------------------------------------------------ */
  function updateClock() {
    var el = $("#clockChip");
    if (el) el.textContent = "🕘 " + fmtClock(new Date());
  }

  function readIds() {
    var ids = loadJSON(KEY.read, []);
    return Array.isArray(ids) ? ids : [];
  }

  function updateBadge() {
    var badge = $("#notifBadge");
    if (!badge || !data.alerts) return;
    var read = readIds();
    var unread = data.alerts.filter(function (a) { return read.indexOf(a.id) < 0; }).length;
    badge.textContent = unread;
    badge.hidden = unread === 0;
  }

  function markAlertsRead() {
    saveJSON(KEY.read, data.alerts.map(function (a) { return a.id; }));
    updateBadge();
  }

  /* ------------------------------------------------------------
     시트 · 토스트
     ------------------------------------------------------------ */
  function openSheet(title, html, onReady) {
    lastFocus = document.activeElement;
    $("#sheetTitle").textContent = title;
    $("#sheetBody").innerHTML = html;
    var back = $("#sheetBackdrop");
    back.hidden = false;
    document.body.style.overflow = "hidden";
    var close = $("#sheetClose");
    if (close) close.focus();
    if (onReady) onReady();
  }

  function closeSheet() {
    var back = $("#sheetBackdrop");
    if (!back || back.hidden) return;
    back.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function toast(message) {
    var el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { el.classList.remove("show"); }, 2000);
  }

  function openAlerts() {
    if (!data.alerts) return;
    var html = data.alerts.map(function (a) {
      return '<div class="alert-item">' +
        '<span class="alert-bar ' + esc(a.tone) + '"></span>' +
        '<div class="alert-body"><div class="alert-title">' + esc(a.title) +
        '<span class="alert-when">' + esc(a.when) + '</span></div>' +
        '<div class="alert-text">' + esc(a.body) + '</div></div></div>';
    }).join("");
    openSheet("🔔 알림", html);
    markAlertsRead();
  }

  function openRelay() {
    var order = ["p1", "p2", "p3"];
    var chain = order.map(function (id, i) {
      var t = data.team.filter(function (x) { return x.id === id; })[0];
      var now = id === "p2";
      var out = '<div class="relay-node' + (now ? " is-now" : "") + '"><span>' + esc(t.name) + '</span>' +
        '<small>' + (now ? "이 오피스 담당" : i === 2 ? "합류 대기" : "가동 중") + '</small></div>';
      if (i < order.length - 1) out += '<span class="relay-arrow">→</span>';
      return out;
    }).join("");
    var html = '<div class="relay-chain">' + chain + '</div>' +
      '<p class="relay-sheet-note">' + esc(data.credits.rule) + '</p>' +
      '<ul class="rule-list">' + data.credits.rules.map(function (r) {
        return "<li>" + esc(r) + "</li>";
      }).join("") + '</ul>';
    openSheet("⚡ 크레딧 릴레이", html);
  }

  /* ------------------------------------------------------------
     방 패널
     ------------------------------------------------------------ */
  function openRoom(id) {
    var room = data.rooms.filter(function (r) { return r.id === id; })[0];
    if (!room) return;
    $("#rpIcon").textContent = room.icon;
    $("#rpName").textContent = room.name;
    $("#rpDesc").textContent = room.desc;
    $("#rpList").innerHTML = room.activities.map(function (a) {
      return "<li>" + esc(a) + "</li>";
    }).join("");
    var enter = $("#rpEnter");
    enter.textContent = room.tabLabel + " →";
    enter.setAttribute("data-tab", room.tab);
    var panel = $("#roomPanel");
    panel.hidden = false;
    $$(".zone").forEach(function (z) {
      z.classList.toggle("is-open", z.getAttribute("data-room") === id);
    });
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function closeRoom() {
    var panel = $("#roomPanel");
    if (panel) panel.hidden = true;
    $$(".zone").forEach(function (z) { z.classList.remove("is-open"); });
  }

  /* ------------------------------------------------------------
     메모
     ------------------------------------------------------------ */
  function addMemo() {
    var input = $("#memoInput");
    var text = (input.value || "").trim();
    if (!text) {
      input.focus();
      toast("내용을 먼저 적어 주세요");
      return;
    }
    var now = new Date();
    state.directives.unshift({
      id: "dm-" + now.getTime(),
      text: text,
      at: fmtDateLabel(now) + " " + pad(now.getHours()) + ":" + pad(now.getMinutes())
    });
    saveJSON(KEY.memo, state.directives);
    input.value = "";
    renderMemos();
    toast("📝 지시를 저장했어요");
  }

  function deleteMemo(id) {
    state.directives = state.directives.filter(function (m) { return m.id !== id; });
    saveJSON(KEY.memo, state.directives);
    renderMemos();
    toast("메모를 지웠어요");
  }

  function exportJson() {
    var payload = {
      exportedAt: new Date().toISOString(),
      office: data.captain ? data.captain.office : "대장님 AI 오피스",
      directives: state.directives,
      stats: data.stats,
      entries: data.entries,
      deals: data.deals,
      coupons: data.coupons,
      awards: data.awards
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    var d = new Date();
    a.href = url;
    a.download = "office-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    toast("JSON으로 내보냈어요");
  }

  /* ------------------------------------------------------------
     이벤트
     ------------------------------------------------------------ */
  function bind() {
    $$(".tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setTab(btn.getAttribute("data-tab"));
      });
    });

    $("#btnTheme").addEventListener("click", function () {
      applyTheme(state.theme === "dark" ? "light" : "dark");
    });
    $("#btnBell").addEventListener("click", openAlerts);
    $("#btnRelay").addEventListener("click", openRelay);

    $$(".seg-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var style = btn.getAttribute("data-style");
        if (style !== state.mapStyle) applyMapStyle(style);
      });
    });
    $("#motionBtn").addEventListener("click", function () {
      applyMotion(!state.motion);
    });

    $$(".zone").forEach(function (zone) {
      zone.addEventListener("click", function () {
        openRoom(zone.getAttribute("data-room"));
      });
    });
    $("#rpClose").addEventListener("click", closeRoom);
    $("#rpEnter").addEventListener("click", function () {
      var tab = $("#rpEnter").getAttribute("data-tab");
      closeRoom();
      setTab(tab);
    });

    $("#roomCards").addEventListener("click", function (ev) {
      var card = ev.target.closest ? ev.target.closest(".room-card") : null;
      if (!card) return;
      openRoom(card.getAttribute("data-room"));
    });

    document.addEventListener("click", function (ev) {
      var goto = ev.target.closest ? ev.target.closest("[data-goto]") : null;
      if (goto) setTab(goto.getAttribute("data-goto"));
    });

    $("#btnMemoSave").addEventListener("click", addMemo);
    $("#memoInput").addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) addMemo();
    });
    $("#memoList").addEventListener("click", function (ev) {
      var btn = ev.target.closest ? ev.target.closest("[data-del]") : null;
      if (btn) deleteMemo(btn.getAttribute("data-del"));
    });
    $("#btnExport").addEventListener("click", exportJson);

    $("#sheetClose").addEventListener("click", closeSheet);
    $("#sheetBackdrop").addEventListener("click", function (ev) {
      if (ev.target === $("#sheetBackdrop")) closeSheet();
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") closeSheet();
    });

    window.addEventListener("resize", function () {
      if (state.motion && state.tab === "map") freezeAgentAll();
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        stopMotion(true);
      } else if (state.motion && state.tab === "map") {
        startMotion();
      }
    });
  }

  function freezeAgentAll() {
    agents.forEach(function (a) {
      window.clearTimeout(a.timer);
      window.clearTimeout(a.waiting);
      a.el.classList.remove("walk");
      freezeAgent(a);
    });
    if (state.motion) startMotion();
  }

  boot();
})();
