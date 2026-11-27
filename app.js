/* ============================================================
   바이코 AI 오피스 · app.js
   빌드 없는 순수 HTML/CSS/JS · 데이터는 seed.js / data.json
   ============================================================ */
(function () {
  "use strict";

  var KEY = {
    theme: "office.theme",
    style: "office.mapStyle",
    motion: "office.motion",
    memo: "office.directives",
    read: "office.notifRead",
    couponDone: "office.couponDone",
    money: "office.moneyCheck",
    decide: "office.decisions"
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
    floor: "all",
    mapStyle: "basic",
    motion: true,
    theme: "light",
    directives: [],
    couponDone: {},
    moneyCheck: {},
    decisions: {},
    role: "p1"
  };

  var agents = [];
  var talkTimer = null;
  var clockTimer = null;
  var toastTimer = null;
  var lastFocus = null;
  var rideTimer = null;
  var profileTimer = null;
  var dialogTimer = null;

  /* 가벼운 진동 피드백 (지원 기기 · 사용자 터치 안에서만) */
  function haptic(ms) {
    try { if (navigator.vibrate && navigator.userActivation && navigator.userActivation.isActive) navigator.vibrate(ms || 8); } catch (e) { /* ignore */ }
  }

  function teamById(id) {
    return (data.team || []).filter(function (t) { return t.id === id; })[0];
  }

  /* ------------------------------------------------------------
     컬러 팔레트 · 스프라이트
     ------------------------------------------------------------ */
  /* ------------------------------------------------------------
     캐릭터 — 정장 입은 귀여운 동물 6명 (고퀄 SVG)
     회장님 호랑이·블랙 3피스+골드타이·금메달 / 피사장 시바견·네이비 / 피사원 토끼·블루 / 클부장 곰·에스프레소+골드타이
     지과장 여우·에메랄드+모노클 / 제미대리 다람쥐·민트
     ------------------------------------------------------------ */
  var PALETTE = {
    captain: {
      fur: "#E8933F", furDark: "#B5652A", furLight: "#FFF6EA", stripe: "#2E2620",
      suit: "#1C1B20", suitLight: "#2B2A31", trouser: "#14131A",
      shirt: "#FBFCFE", tie: "#D4A94A", tieStyle: "necktie"
    },
    p1: {
      fur: "#EFBB77", furDark: "#C0863F", furLight: "#FFF3E0",
      suit: "#26344E", suitLight: "#33456A", trouser: "#222C3C",
      shirt: "#FBFCFE", tie: "#B0392F", tieStyle: "necktie"
    },
    p2: {
      fur: "#D8E5F2", furDark: "#9EB6CE", furLight: "#FFFFFF",
      suit: "#2E6FA8", suitLight: "#3E86C2", trouser: "#27587E",
      shirt: "#FBFCFE", tie: "#7FB3DC", tieStyle: "bow"
    },
    p0: {
      fur: "#C68A5A", furDark: "#96613A", furLight: "#F3DCC2",
      suit: "#2E2C33", suitLight: "#403D47", trouser: "#26242A",
      shirt: "#FBFCFE", tie: "#DEAF3D", tieStyle: "necktie"
    },
    p4: {
      fur: "#E79451", furDark: "#B0622A", furLight: "#FFF7EC",
      suit: "#10A37F", suitLight: "#18B78F", trouser: "#0B4C3C",
      shirt: "#FBFCFE", tie: "#F2C64E", tieStyle: "necktie"
    },
    p3: {
      fur: "#BE8A5F", furDark: "#946440", furLight: "#F6E6D2",
      suit: "#4FBB9D", suitLight: "#6BD0B4", trouser: "#2E7A66",
      shirt: "#FBFCFE", tie: "#2C8C74", tieStyle: "necktie"
    }
  };
  var EAR = { captain: "tiger", p1: "shiba", p2: "rabbit", p0: "bear", p4: "fox", p3: "squirrel" };

  /* 머리 뒤로 나온 귀 */
  function earsSvg(kind, a) {
    if (kind === "tiger") {
      /* 둥근 귀 + 귀 안쪽 줄무늬 */
      return '<circle cx="19.6" cy="19.2" r="4.6" fill="' + a.fur + '"/>' +
        '<circle cx="19.6" cy="19.4" r="2.3" fill="' + a.furLight + '"/>' +
        '<path d="M19.6 15.2v2.2" stroke="' + a.stripe + '" stroke-width="1.3" stroke-linecap="round" opacity=".6"/>' +
        '<circle cx="36.4" cy="19.2" r="4.6" fill="' + a.fur + '"/>' +
        '<circle cx="36.4" cy="19.4" r="2.3" fill="' + a.furLight + '"/>' +
        '<path d="M36.4 15.2v2.2" stroke="' + a.stripe + '" stroke-width="1.3" stroke-linecap="round" opacity=".6"/>';
    }
    if (kind === "shiba") {
      return '<path d="M19.9 21.2L15.3 9.2l9.6 4.9z" fill="' + a.fur + '"/>' +
        '<path d="M20.5 18.9l-2.6-6.4 4.8 2.7z" fill="' + a.furLight + '"/>' +
        '<path d="M36.1 21.2L40.7 9.2l-9.6 4.9z" fill="' + a.fur + '"/>' +
        '<path d="M35.5 18.9l2.6-6.4-4.8 2.7z" fill="' + a.furLight + '"/>';
    }
    if (kind === "rabbit") {
      return '<ellipse cx="21.5" cy="11.4" rx="3.4" ry="8.3" fill="' + a.fur + '" transform="rotate(-12 21.5 11.4)"/>' +
        '<ellipse cx="21.7" cy="11.2" rx="1.6" ry="5.5" fill="#F0BAC8" transform="rotate(-12 21.7 11.2)"/>' +
        '<ellipse cx="34.5" cy="11.4" rx="3.4" ry="8.3" fill="' + a.fur + '" transform="rotate(12 34.5 11.4)"/>' +
        '<ellipse cx="34.3" cy="11.2" rx="1.6" ry="5.5" fill="#F0BAC8" transform="rotate(12 34.3 11.2)"/>' +
        '<path d="M23.2 19.4c1.6-1.4 2.6-2.6 3.2-4" stroke="' + a.furDark + '" stroke-width=".7" fill="none" opacity=".4"/>';
    }
    if (kind === "bear") {
      return '<circle cx="18.2" cy="16.4" r="5.2" fill="' + a.fur + '"/>' +
        '<circle cx="18.2" cy="16.4" r="2.6" fill="' + a.furLight + '"/>' +
        '<circle cx="37.8" cy="16.4" r="5.2" fill="' + a.fur + '"/>' +
        '<circle cx="37.8" cy="16.4" r="2.6" fill="' + a.furLight + '"/>';
    }
    if (kind === "fox") {
      return '<path d="M19.6 22.4L13.9 8.4l10.5 5.8z" fill="' + a.fur + '"/>' +
        '<path d="M14.6 9.6l4.6 2.6-1.9.9z" fill="' + a.furDark + '"/>' +
        '<path d="M20.2 19c-1.4-3.4-2.4-5.6-2.9-7.3 1.9 1 3.6 1.9 5 2.6z" fill="' + a.furLight + '"/>' +
        '<path d="M36.4 22.4L42.1 8.4l-10.5 5.8z" fill="' + a.fur + '"/>' +
        '<path d="M41.4 9.6l-4.6 2.6 1.9.9z" fill="' + a.furDark + '"/>' +
        '<path d="M35.8 19c1.4-3.4 2.4-5.6 2.9-7.3-1.9 1-3.6 1.9-5 2.6z" fill="' + a.furLight + '"/>';
    }
    /* squirrel */
    return '<path d="M19.4 20.6L16.2 11.2l6.6 3.7z" fill="' + a.fur + '"/>' +
      '<path d="M19.9 18.3l-1.5-4.4 3 1.7z" fill="' + a.furLight + '"/>' +
      '<path d="M36.6 20.6L39.8 11.2l-6.6 3.7z" fill="' + a.fur + '"/>' +
      '<path d="M36.1 18.3l1.5-4.4-3 1.7z" fill="' + a.furLight + '"/>';
  }

  /* 몸 뒤로 보이는 꼬리 */
  function tailSvg(kind, a) {
    if (kind === "squirrel") {
      return '<path d="M39.8 61.4c4.6-.2 7.6-3 7.8-7 .2-3.6-2.2-6.4-5-6.2-2.2.2-3.4 2.4-2.6 4.2.6 1.4 2.4 1.6 3.3.5" fill="none" stroke="' + a.furDark + '" stroke-width="7.4" stroke-linecap="round"/>' +
        '<path d="M39.8 61.4c4.6-.2 7.6-3 7.8-7 .2-3.6-2.2-6.4-5-6.2-2.2.2-3.4 2.4-2.6 4.2.6 1.4 2.4 1.6 3.3.5" fill="none" stroke="' + a.fur + '" stroke-width="4.4" stroke-linecap="round"/>';
    }
    return "";
  }

  function spriteSvg(id) {
    var a = PALETTE[id] || PALETTE.p2;
    var kind = EAR[id] || "rabbit";
    var s = [];

    /* 바닥 그림자 — 몸(.sb) 밖에 두어 회장님 황금 아우라가 그림자까지 감싸지 않게 합니다 */
    s.push('<ellipse class="ground-shadow" cx="28" cy="68.6" rx="13" ry="2.8" fill="rgba(24,30,38,.20)"/>');

    /* 몸 실루엣 묶음 — 이 그룹의 윤곽을 따라 황금 아우라가 붙습니다 */
    s.push('<g class="sb">' + tailSvg(kind, a));

    /* 다리 · 구두 */
    s.push('<rect x="21.5" y="52.2" width="6.2" height="11" rx="3" fill="' + a.trouser + '"/>' +
      '<rect x="28.3" y="52.2" width="6.2" height="11" rx="3" fill="' + a.trouser + '"/>' +
      '<rect x="19.4" y="62.6" width="8.2" height="4.2" rx="2.1" fill="#2A2320"/>' +
      '<rect x="28.4" y="62.6" width="8.2" height="4.2" rx="2.1" fill="#2A2320"/>' +
      '<rect x="19.4" y="62.6" width="8.2" height="1.5" rx=".75" fill="#5A4E46" opacity=".6"/>' +
      '<rect x="28.4" y="62.6" width="8.2" height="1.5" rx=".75" fill="#5A4E46" opacity=".6"/>');

    /* 재킷 · 셔츠 · 라펠 */
    if (kind === "tiger") {
      /* 회장님 호랑이 — 당당한 어깨선 (어깨 요크·각진 견갑) */
      s.push('<path d="M15.5 43.6c.4-6.7 5.5-10.8 12.5-10.8s12.1 4.1 12.5 10.8l.6 4.8H14.9z" fill="' + a.suit + '"/>' +
        '<path d="M15.6 43.1c.6-5.3 4.6-8.9 9.4-9.2-2.9 2.4-4.5 5.5-4.8 9.7z" fill="#fff" opacity=".07"/>' +
        '<path d="M40.4 43.1c-.6-5.3-4.6-8.9-9.4-9.2 2.9 2.4 4.5 5.5 4.8 9.7z" fill="#fff" opacity=".07"/>' +
        '<path d="M15.9 41.6h5.1l-.7 2.9h-4.9zM35.7 41.6h5.1l-.5 2.9h-4.9z" fill="' + a.suitLight + '" opacity=".85"/>');
    }
    s.push('<path d="M17.2 44.4c0-6.2 4.6-9.8 10.8-9.8s10.8 3.6 10.8 9.8l1.35 12.7c.16 1.5-.94 2.7-2.45 2.7H18.3c-1.51 0-2.61-1.2-2.45-2.7z" fill="' + a.suit + '"/>' +
      '<path d="M22.4 36.4L28 47.6l5.6-11.2c-3.4-1-7.8-1-11.2 0z" fill="' + a.shirt + '"/>' +
      '<path d="M22.2 36 28 47.8 24.6 49 19.2 39.2z" fill="' + a.suitLight + '"/>' +
      '<path d="M33.8 36 28 47.8 31.4 49 36.8 39.2z" fill="' + a.suitLight + '"/>' +
      '<path d="M18.6 45.4c-.2-4.6 3.4-8.4 8.2-9.2-3.6 2.2-5.6 5.4-6.2 10z" fill="#fff" opacity=".10"/>' +
      '<path d="M32.8 45.6h4.6" stroke="#000" stroke-opacity=".16" stroke-width=".9" stroke-linecap="round"/>' +
      '<circle cx="31.6" cy="52.4" r=".85" fill="#fff" opacity=".38"/>' +
      '<circle cx="31.6" cy="55.6" r=".85" fill="#fff" opacity=".38"/>');

    /* 넥타이 */
    if (a.tieStyle === "bow") {
      s.push('<path d="M23.6 40.4c1.9-1 3.3-.2 4.1 1.2.8-1.4 2.2-2.2 4.1-1.2 1.1 2 .3 4-1.7 4.6-1.1.3-1.9 0-2.4-.8-.5.8-1.3 1.1-2.4.8-2-.6-2.8-2.6-1.7-4.6z" fill="' + a.tie + '"/>' +
        '<circle cx="28" cy="42.6" r="1.6" fill="' + a.tie + '" stroke="' + a.suit + '" stroke-width=".5"/>');
    } else {
      s.push('<path d="M26.3 38.5h3.4l-.3 2.2-1.4 1-1.4-1z" fill="' + a.tie + '"/>' +
        '<path d="M26.4 42.1 28 41.1l1.6 1 .95 6.7-2.55 2.7-2.55-2.7z" fill="' + a.tie + '"/>' +
        '<path d="M28 41.1v10.4" stroke="#000" stroke-opacity=".14" stroke-width=".8"/>' +
        '<path d="M25.9 46.6h4.2" stroke="#fff" stroke-opacity=".35" stroke-width=".9"/>');
    }

    /* 팔 · 손 */
    s.push('<path d="M17.4 41.2c-2.7 1.9-4 5.4-4 9.5 0 2 2.4 2.6 3.5 1 1.1-1.7 1.5-4.9 1.5-8z" fill="' + a.suit + '"/>' +
      '<path d="M38.6 41.2c2.7 1.9 4 5.4 4 9.5 0 2-2.4 2.6-3.5 1-1.1-1.7-1.5-4.9-1.5-8z" fill="' + a.suit + '"/>' +
      '<circle cx="15.7" cy="51.7" r="2.7" fill="' + a.fur + '"/>' +
      '<circle cx="40.3" cy="51.7" r="2.7" fill="' + a.fur + '"/>' +
      '<circle cx="15.7" cy="51.7" r="2.7" fill="' + a.furDark + '" opacity=".18"/>' +
      '<circle cx="40.3" cy="51.7" r="2.7" fill="' + a.furDark + '" opacity=".18"/>');

    /* 귀 · 머리 */
    s.push(earsSvg(kind, a) +
      '<ellipse cx="28" cy="28.2" rx="14.2" ry="13.4" fill="' + a.fur + '" stroke="rgba(38,44,54,.10)" stroke-width=".8"/>' +
      '<ellipse cx="22.4" cy="21.4" rx="5.6" ry="3.8" fill="#fff" opacity=".16"/>');
    if (kind === "tiger") {
      /* 이마·관자놀이 굵은 줄무늬 (카리스마) */
      var st = a.stripe;
      s.push('<g stroke="' + st + '" stroke-linecap="round" fill="none" opacity=".95">' +
        '<path d="M28 15.6v4M25.2 16.2l-.5 3.2M30.8 16.2l.5 3.2" stroke-width="1.8"/>' +
        '</g>' +
        '<path d="M15.5 26.6l3.3 1.9M15.2 31l3.8 1.8M40.5 26.6l-3.3 1.9M40.8 31l-3.8 1.8" stroke="' + st +
        '" stroke-width="1.8" stroke-linecap="round" opacity=".9"/>' +
        '<path d="M22.6 40.4h10.8v2.6c0 1.4-1.6 2.1-2.6 1.2-1.6 1.4-4 1.4-5.6 0-1 .9-2.6.2-2.6-1.2z" fill="' +
        a.furLight + '" opacity=".95"/>');
    }

    /* 얼굴 — 주둥이 */
    s.push('<ellipse cx="28" cy="32.9" rx="8.8" ry="6.4" fill="' + a.furLight + '"/>');
    if (kind === "shiba") {
      s.push('<ellipse cx="17.6" cy="31.4" rx="3.1" ry="4.2" fill="' + a.furLight + '"/>' +
        '<ellipse cx="38.4" cy="31.4" rx="3.1" ry="4.2" fill="' + a.furLight + '"/>');
    }
    if (kind === "fox") {
      s.push('<ellipse cx="18.4" cy="33.4" rx="3.4" ry="3.1" fill="' + a.furLight + '"/>' +
        '<ellipse cx="37.6" cy="33.4" rx="3.4" ry="3.1" fill="' + a.furLight + '"/>');
    }
    if (kind === "squirrel") {
      s.push('<ellipse cx="28" cy="30.4" rx="3.6" ry="2.6" fill="' + a.furLight + '" opacity=".9"/>');
    }
    if (kind === "tiger") {
      s.push('<ellipse cx="18.7" cy="32.4" rx="3.3" ry="3.5" fill="' + a.furLight + '" opacity=".95"/>' +
        '<ellipse cx="37.3" cy="32.4" rx="3.3" ry="3.5" fill="' + a.furLight + '" opacity=".95"/>' +
        '<path d="M15.6 33.6h4M36.4 33.6h4M16.2 36.2h3M37 36.2h3" stroke="' + a.stripe +
        '" stroke-width=".55" stroke-linecap="round" opacity=".45"/>');
    }

    /* 눈 (깜빡임) — 호랑이는 치켜뜬 눈매 · 짙은 눈썹 */
    if (kind === "tiger") {
      s.push('<path d="M18.4 19.3 25 22.3 24.6 23.1 18.2 21.6z" fill="#231A12"/>' +
        '<path d="M37.6 19.3 31 22.3 31.4 23.1 37.8 21.6z" fill="#231A12"/>' +
        '<g class="eye">' +
        '<ellipse cx="22.4" cy="26.6" rx="2.9" ry="2.05" transform="rotate(14 22.4 26.6)" fill="#2B2118"/>' +
        '<circle cx="21.2" cy="25.9" r=".55" fill="#fff"/>' +
        '</g>' +
        '<g class="eye">' +
        '<ellipse cx="33.6" cy="26.6" rx="2.9" ry="2.05" transform="rotate(-14 33.6 26.6)" fill="#2B2118"/>' +
        '<circle cx="34.8" cy="25.9" r=".55" fill="#fff"/>' +
        '</g>' +
        '<path d="M19.8 24.4c1.8-1.1 4.2-1 5.7.4M36.2 24.4c-1.8-1.1-4.2-1-5.7.4" stroke="' + a.furDark + '" stroke-width="1" stroke-linecap="round" fill="none" opacity=".7"/>');
    } else {
      s.push('<g class="eye"><ellipse cx="22.5" cy="26.2" rx="2.85" ry="3.1" fill="#2B2118"/><circle cx="23.5" cy="25.2" r="1" fill="#fff"/></g>' +
        '<g class="eye"><ellipse cx="33.5" cy="26.2" rx="2.85" ry="3.1" fill="#2B2118"/><circle cx="34.5" cy="25.2" r="1" fill="#fff"/></g>' +
        '<path d="M19.4 21.5c1.5-.9 3.1-.9 4.5-.2M32.1 21.3c1.4-.7 3-.7 4.5.2" stroke="' + a.furDark + '" stroke-width=".85" stroke-linecap="round" fill="none" opacity=".5"/>');
    }

    /* 코 · 입 · 볼 — 호랑이는 굳은 입매 + 송곳니 */
    s.push('<path d="M26.7 30c.4-1.2 2.2-1.2 2.6 0 .4 1-.6 1.9-1.3 1.9s-1.7-.9-1.3-1.9z" fill="#3A2A22"/>' +
      '<path d="M28 31.9v1.4" stroke="#3A2A22" stroke-width=".85" stroke-linecap="round"/>' +
      (kind === "tiger"
        ? '<path d="M26.2 33.7h3.6" stroke="#3A2A22" stroke-width="1.15" stroke-linecap="round"/>' +
          '<path d="M26.2 33.6l-.7.9M29.8 33.6l.7.9" stroke="#3A2A22" stroke-width=".8" stroke-linecap="round"/>' +
          '<path d="M26.6 33.8l.45 1.3.45-1.2zM29.4 33.8l-.45 1.3-.45-1.2z" fill="#FFFDF7" stroke="#3A2A22" stroke-width=".26" stroke-linejoin="round"/>'
        : '<path d="M28 33.3c-.9 1.2-2.4 1.1-3-.4M28 33.3c.9 1.2 2.4 1.1 3-.4" stroke="#3A2A22" stroke-width=".85" stroke-linecap="round" fill="none"/>' +
          '<ellipse cx="17.6" cy="31.8" rx="2.6" ry="1.6" fill="#E9817A" opacity=".38"/>' +
          '<ellipse cx="38.4" cy="31.8" rx="2.6" ry="1.6" fill="#E9817A" opacity=".38"/>'));
    if (kind === "squirrel") {
      s.push('<rect x="26.4" y="34.6" width="1.5" height="2.4" rx=".5" fill="#FFFDF8" stroke="#C9B49B" stroke-width=".3"/>' +
        '<rect x="28.1" y="34.6" width="1.5" height="2.4" rx=".5" fill="#FFFDF8" stroke="#C9B49B" stroke-width=".3"/>');
    }
    if (kind === "fox") {
      s.push('<path d="M28 36.2v.9" stroke="#3A2A22" stroke-width=".8" stroke-linecap="round"/>');
    }

    /* 액세서리 */
    if (id === "captain") {
      /* 금메달 회장 배지 + 리본 · 금 넥타이 바 · 금 견장 */
      s.push('<path d="M17.1 41.4h3.6l-1.1 3.3h-3.5z" fill="#8C1B1B" opacity=".9"/>' +
        '<path d="M17.6 46.3l1.9-1.5 1.9 1.5-1.9 2.1z" fill="#8C1B1B" opacity=".85"/>' +
        '<circle cx="19.3" cy="45.2" r="2.5" fill="#F2C64E" stroke="#B8862F" stroke-width=".6"/>' +
        '<circle cx="19.3" cy="45.2" r="1.5" fill="#FFF0BF"/>' +
        '<path d="M25.7 47.9h4.6" stroke="#F2C64E" stroke-width=".9" stroke-linecap="round"/>' +
        '<circle cx="28" cy="47.9" r=".75" fill="#FFF0BF"/>' +
        '<rect x="15.7" y="38.2" width="4" height="1.7" rx=".6" fill="#F2C64E" stroke="#B8862F" stroke-width=".4" transform="rotate(-12 17.7 39)"/>' +
        '<rect x="36.3" y="38.2" width="4" height="1.7" rx=".6" fill="#F2C64E" stroke="#B8862F" stroke-width=".4" transform="rotate(12 38.3 39)"/>');
    } else if (id === "p0") {
      /* 왕관 + 골드 스타 배지 */
      s.push('<path d="M19.4 14.2l1.3-7.3 4.3 3.5 3-4.9 3 4.9 4.3-3.5 1.3 7.3z" fill="#F2C64E" stroke="#C08F1E" stroke-width=".8" stroke-linejoin="round"/>' +
        '<rect x="19" y="13.4" width="18" height="3.1" rx="1.55" fill="#E3B33A" stroke="#C08F1E" stroke-width=".8"/>' +
        '<circle cx="20.7" cy="7.5" r=".95" fill="#FFF0BF"/>' +
        '<circle cx="28" cy="5.2" r=".95" fill="#FFF0BF"/>' +
        '<circle cx="35.3" cy="7.5" r=".95" fill="#FFF0BF"/>' +
        '<circle cx="28" cy="15" r=".9" fill="#C08F1E"/>' +
        '<path d="M20.6 44.9l.8 1.7 1.9.2-1.4 1.3.4 1.9-1.7-1-1.7 1 .4-1.9-1.4-1.3 1.9-.2z" fill="#FBE08C" stroke="#C9A02C" stroke-width=".5"/>');
    } else if (id === "p4") {
      /* 모노클 · 전구 배지 · 노트 */
      s.push('<circle cx="33.5" cy="26.2" r="5.3" fill="rgba(255,255,255,.16)" stroke="#0B3B2E" stroke-width="1.2"/>' +
        '<path d="M38.9 27.2c1.8 1.6 2.2 4 1 6" fill="none" stroke="#0B3B2E" stroke-width=".8" stroke-linecap="round"/>' +
        '<path d="M18.6 43.6v-2.4M17.4 42.6h2.4M17.9 41.7l1.4 1.4M19.3 41.7l-1.4 1.4" stroke="#FFE07A" stroke-width=".7" stroke-linecap="round"/>' +
        '<circle cx="18.6" cy="42.6" r="1.7" fill="#FFE07A" stroke="#C9A02C" stroke-width=".5"/>' +
        '<rect x="31.6" y="46.6" width="4.6" height="5.4" rx=".9" fill="#EAFBF4" stroke="#0B5B49" stroke-width=".5"/>' +
        '<path d="M32.6 48.4h2.6M32.6 49.7h2.6M32.6 51h1.7" stroke="#10A37F" stroke-width=".5" stroke-linecap="round"/>');
    } else if (id === "p1") {
      /* 금색 라펠 핀 */
      s.push('<path d="M20.2 44.2v-2.2M19.1 43.2h2.2" stroke="#E9C46A" stroke-width=".7" stroke-linecap="round"/>' +
        '<circle cx="20.2" cy="43.2" r="1.1" fill="#E9C46A" stroke="#B8862F" stroke-width=".4"/>');
    } else if (id === "p3") {
      /* 도토리 배지 */
      s.push('<path d="M18.2 42.2c0-1.4 1.2-2.4 2.5-2.4s2.5 1 2.5 2.4z" fill="#8A5A32"/>' +
        '<path d="M18.6 42.4h4.2c.4 1.6-.6 3.2-2.1 3.2s-2.5-1.6-2.1-3.2z" fill="#C98D4F"/>');
    }

    return '<svg class="sprite" viewBox="0 0 56 72" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
      s.join("") + '</g></svg>';
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

  /* awards 요일은 data.json의 수기 dow를 믿지 않고 날짜에서 계산합니다.
     (11/30 월 · 12/1 화 … 2026년 달력 기준, 연말 넘김은 updatedAt 기준으로 처리) */
  var DOW_KO = ["일", "월", "화", "수", "목", "금", "토"];

  function dataYear() {
    var y = data && data.updatedAt ? parseInt(String(data.updatedAt).slice(0, 4), 10) : NaN;
    return isNaN(y) ? new Date().getFullYear() : y;
  }

  function monthDayYear(md) {
    var parts = String(md).split("/");
    var m = parseInt(parts[0], 10);
    var d = parseInt(parts[1], 10);
    if (!m || !d) return null;
    var y = dataYear();
    var baseM = data && data.updatedAt ? parseInt(String(data.updatedAt).slice(5, 7), 10) : (new Date().getMonth() + 1);
    if (m < baseM) y += 1;
    return { y: y, m: m, d: d };
  }

  function dowOf(md) {
    var p = monthDayYear(md);
    if (!p) return "";
    return DOW_KO[new Date(p.y, p.m - 1, p.d).getDay()];
  }

  /* 마감일은 data.json에서 YYYY-MM-DD(deadline) + HH:MM(deadlineTime) + 표시용 deadlineLabel 로 통일했습니다.
     예전 MM/DD · M-D 표기가 남아 있어도 읽도록 남겨 둡니다. */
  function isoDateOf(item) {
    var raw = item && item.deadline != null ? String(item.deadline) : "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    var p = raw.split(/[^0-9]+/).filter(function (x) { return x !== ""; });
    if (p.length < 2) return "";
    var y = dataYear();
    var m = parseInt(p[0], 10), d = parseInt(p[1], 10);
    if (!m || !d) return "";
    var baseM = data && data.updatedAt ? parseInt(String(data.updatedAt).slice(5, 7), 10) : (new Date().getMonth() + 1);
    if (m < baseM) y += 1;   /* 11월 데이터에 1/5 마감 = 이듬해 */
    return y + "-" + pad(m) + "-" + pad(d);
  }

  /* 응모·체험단 공통 표시 형식: 11/30 (월) 18:00 */
  function deadlineShort(item) {
    if (!item) return "";
    var iso = isoDateOf(item);
    if (!iso) return item.deadlineLabel || "미정";
    var y = parseInt(iso.slice(0, 4), 10);
    var m = parseInt(iso.slice(5, 7), 10);
    var d = parseInt(iso.slice(8, 10), 10);
    var wd = DOW_KO[new Date(y, m - 1, d).getDay()];
    return m + "/" + d + " (" + wd + ")" + (item.deadlineTime ? " " + item.deadlineTime : "");
  }

  /* 쿠폰은 "선착순"·"시간대별"처럼 날짜가 없는 마감도 있어 label을 우선합니다. */
  function deadlineText(item) {
    if (!item) return "";
    if (!isoDateOf(item) && item.deadlineLabel) return item.deadlineLabel;
    return deadlineShort(item);
  }

  function deadlineKey(item) {
    var iso = isoDateOf(item) || "9999-12-31";
    return parseInt(iso.replace(/-/g, ""), 10) || 99991231;
  }

  function isDueToday(item) {
    var iso = isoDateOf(item);
    return !!iso && iso === todayKey();
  }

  function gradeBadge(v) {
    if (!v || !v.sourceGrade) return "";
    var g = String(v.sourceGrade).toUpperCase();
    var label = { A: "공식 홈페이지", B: "공식 공지", C: "이벤트 사이트", D: "미확인" }[g] || "미확인";
    return '<span class="grade g' + esc(g) + '" title="출처 등급 ' + esc(g) + ' · ' + esc(label) + '">' +
      esc(g) + '<span class="grade-label">' + esc(label) + '</span></span>';
  }

  function verifiedRank() {
    var list = data.entries.concat(data.coupons).filter(function (x) { return x.verification; });
    var out = { A: 0, B: 0, C: 0, D: 0 };
    list.forEach(function (x) {
      var g = String(x.verification.sourceGrade || "D").toUpperCase();
      if (out[g] == null) out[g] = 0;
      out[g] += 1;
    });
    return out;
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
    state.couponDone = loadJSON(KEY.couponDone, {});
    if (!state.couponDone || typeof state.couponDone !== "object") state.couponDone = {};
    state.moneyCheck = loadJSON(KEY.money, {});
    if (!state.moneyCheck || typeof state.moneyCheck !== "object") state.moneyCheck = {};
    state.decisions = loadJSON(KEY.decide, {});
    if (!state.decisions || typeof state.decisions !== "object") state.decisions = {};

    applyTheme(state.theme, true);
    applyMapStyle(state.mapStyle, true);
    applyMotion(state.motion, true);
    renderAll();
    buildAgents();
    applyFloorState();
    bind();
    setTab(initialTab(), true);
    updateClock();
    clockTimer = window.setInterval(updateClock, 20000);
    updateBadge();
  }

  function initialTab() {
    var hash = (location.hash || "").replace("#", "");
    var allowed = ["map", "meeting", "dash", "cal", "credits", "entries", "money"];
    return allowed.indexOf(hash) >= 0 ? hash : "map";
  }

  /* ------------------------------------------------------------
     전체 렌더
     ------------------------------------------------------------ */
  function renderAll() {
    renderFloors();
    renderTeam();
    renderChain();
    renderRoster();
    renderFloorCards();
    renderPipeline();
    renderLogs();
    renderMemos();
    renderStats();
    renderDealsAndCoupons();
    renderFamily();
    renderCalendar();
    renderNextRoutine();
    renderAwards();
    renderBirthdays();
    renderCredits();
    renderPacket();
    renderEntries();
    renderRoles();
    renderGates();
    renderMoney();
    var count = data.stats && data.stats.entries ? data.stats.entries.total : "–";
    var todayEl = $("#todayCount");
    if (todayEl) todayEl.textContent = count;
  }

  function floorById(id) {
    return (data.floors || []).filter(function (f) { return f.id === id; })[0];
  }

  function renderFloors() {
    var stack = $("#floorStack");
    if (!stack || !data.floors) return;
    stack.innerHTML = data.floors.map(function (f) {
      return '<div class="floor tone-' + esc(f.tone) + '" data-floor="' + esc(f.id) + '"' +
        ' role="button" tabindex="0" aria-label="' + esc(f.label + " " + f.name + " 보기") + '">' +
        '<div class="floor-scene" aria-hidden="true"></div>' +
        '<div class="floor-top">' +
        '<span class="fl-no">' + esc(f.label) + '</span>' +
        '<span class="fl-name">' + esc(f.name) + '</span>' +
        '<span class="fl-who">' + esc(f.members) + '</span>' +
        '<span class="fl-icon" aria-hidden="true">' + esc(f.icon || "") + '</span>' +
        '</div>' +
        '<div class="floor-agents" data-floor-agents="' + esc(f.id) + '"></div>' +
        '<span class="floor-line">' + esc(f.line || "") + '</span>' +
        floorHud(f) +
        '<div class="floor-profile" aria-live="polite"></div>' +
        '<div class="floor-doors" aria-hidden="true"><i class="door l"></i><i class="door r"></i>' +
        '<b class="door-label">▲ ' + esc(f.label) + '</b></div>' +
        '</div>';
    }).join("");
  }

  function floorCardBrief(f) {
    var t = f.tasks || [];
    return t.slice(0, 3).join(" · ") + (t.length > 3 ? " 외 " + (t.length - 3) : "");
  }

  function miniAva(id) {
    return '<span>' + spriteSvg(id) + '</span>';
  }

  function floorAgents(f) {
    return (f.agents && f.agents.length ? f.agents : data.team.filter(function (t) { return t.floor === f.id; }).map(function (t) { return t.id; }));
  }

  function renderFloorCards() {
    var box = $("#floorCards");
    if (!box || !data.floors) return;
    var hint = $("#floorCardsHint");
    if (state.floor === "all") {
      if (hint) hint.textContent = "층을 눌러 자세히";
      box.innerHTML = data.floors.map(function (f) {
        return '<button class="floor-card tone-' + esc(f.tone) + '" type="button" data-floor="' + esc(f.id) + '">' +
          '<span class="fc-no">' + esc(f.label) + '</span>' +
          '<span class="fc-body">' +
          '<span class="fc-name">' + esc(f.name) + '</span>' +
          '<span class="fc-who">' + esc(f.members) + '</span>' +
          '<span class="fc-tasks">' + esc(floorCardBrief(f)) + '</span>' +
          '</span>' +
          '<span class="fc-avas" aria-hidden="true">' + floorAgents(f).map(miniAva).join("") + '</span>' +
          '<span class="fc-enter" aria-hidden="true">›</span>' +
          '</button>';
      }).join("");
    } else {
      var f = floorById(state.floor);
      if (!f) return;
      if (hint) hint.textContent = f.label + " · " + (f.short || f.name);
      var ids = data.floors.map(function (x) { return x.id; });
      var idx = ids.indexOf(f.id);
      var up = idx > 0 ? data.floors[idx - 1] : null;
      var down = idx < ids.length - 1 ? data.floors[idx + 1] : null;
      var members = floorAgents(f).map(function (id) {
        var t = teamById(id);
        if (!t) return "";
        return '<button class="fc-member" type="button" data-say="' + esc(id) + '">' +
          '<span class="fm-ava" aria-hidden="true">' + spriteSvg(id) + '</span>' +
          '<span class="fm-main"><span class="fm-name">' + esc(t.name) + '<small>' + esc(t.role) + '</small></span>' +
          '<span class="fm-note">' + esc(t.note) + '</span></span>' +
          '<span class="fm-say">말 걸기 ›</span></button>';
      }).join("");
      box.innerHTML = '<div class="floor-card is-detail tone-' + esc(f.tone) + '">' +
        '<div class="fc-head">' +
        '<span class="fc-no">' + esc(f.label) + '</span>' +
        '<span class="fc-body">' +
        '<span class="fc-name">' + esc(f.name) + '</span>' +
        '<span class="fc-who">' + esc(f.members) + '</span>' +
        '</span>' +
        '<span class="fc-avas" aria-hidden="true">' + floorAgents(f).map(miniAva).join("") + '</span>' +
        '</div>' +
        '<p class="fc-line">' + esc(f.line || "") + '</p>' +
        '<p class="fc-sub">이 층의 업무 ' + (f.tasks || []).length + '</p>' +
        '<ul class="fc-list">' + (f.tasks || []).map(function (t) {
          return '<li>' + esc(t) + '</li>';
        }).join("") + '</ul>' +
        (members ? '<p class="fc-sub">이 층 멤버</p><div class="fc-members">' + members + '</div>' : '') +
        '<div class="fc-nav">' +
        '<button type="button"' + (up ? ' data-floor="' + esc(up.id) + '"' : ' disabled') + '>▲ ' + (up ? esc(up.label) : "옥상") + '</button>' +
        '<button class="fc-all" type="button" data-floor="all">전체 보기</button>' +
        '<button type="button"' + (down ? ' data-floor="' + esc(down.id) + '"' : ' disabled') + '>▼ ' + (down ? esc(down.label) : "로비") + '</button>' +
        '</div>' +
        '</div>';
    }
    box.classList.remove("is-in");
    void box.offsetWidth;
    box.classList.add("is-in");
  }

  function renderTeam() {
    var box = $("#teamGrid");
    if (!box) return;
    box.innerHTML = data.team.map(function (t) {
      var warm = t.status !== "가동 중";
      return '<div class="team-card" role="button" tabindex="0" data-profile="' + esc(t.id) + '" aria-label="' + esc(t.name + " 상세 프로필") + '">' +
        '<div class="team-avatar" aria-hidden="true">' + spriteSvg(t.id) + '</div>' +
        '<div class="team-main">' +
        '<div class="team-top"><span class="team-name">' + esc(t.name) + '</span>' +
        '<span class="team-role">' + esc(t.role) + '</span>' +
        (t.handle ? '<span class="team-handle">' + esc(t.handle) + '</span>' : '') + '</div>' +
        (floorById(t.floor) ? '<span class="team-floor">' + esc(floorById(t.floor).label + " · " + (floorById(t.floor).short || floorById(t.floor).name)) + '</span>' : '') +
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
      var ava = PALETTE[c.id] ? spriteSvg(c.id) : "👑";
      var html = '<div class="chain-node ' + esc(c.tone || "") + '">' +
        '<span class="cn-ava" aria-hidden="true">' + ava + '</span>' +
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

  function renderPacket() {
    var box = $("#packetList");
    if (!box) return;
    var p = data.credits && data.credits.handoffPacket;
    if (!p) { box.innerHTML = ""; return; }
    var guide = p.guide || [];
    box.innerHTML = '<div class="packet-flow" aria-hidden="true"><span>넘기는 피클</span><i></i><b>📦 7항목</b><i></i><span>받는 피클</span></div>' +
      '<ol class="packet-list">' + p.items.map(function (it, i) {
        var g = guide[i] || {};
        return '<li><div class="pk-main"><span class="pk-item">' + esc(it) + '</span>' +
          (g.who ? '<span class="pk-who">' + esc(g.who) + '</span>' : '') + '</div>' +
          (g.example ? '<span class="pk-ex">예) ' + esc(g.example) + '</span>' : '') + '</li>';
      }).join("") + '</ol><p class="eff-note">' + esc(p.note || "") + '</p>';
  }

  var WHO = { p0: "클부장", p1: "피사장", p2: "피사원", p3: "제미대리", p4: "지과장", captain: "회장님" };

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
    }).join("") + (data.reports.length > 5
      ? '<button class="btn-ghost block log-more" type="button" data-logmore aria-expanded="false">이전 보고 ' + (data.reports.length - 5) + '건 더 보기</button>'
      : "");
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
        sub: "조건 충족 " + s.deals.total + "건 중 미달 " + s.deals.under +
          "건 (0원 " + s.deals.zero + " · 저자부담 " + (s.deals.low || 0) + ")"
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
        barRow("신청 미달", d.under, d.total, (d.under / d.total) * 100, "green") +
        barRow("저자부담 0원", d.zero, d.total, (d.zero / d.total) * 100, "") +
        barRow("저자부담 1~3,000원", d.low || 0, d.total, ((d.low || 0) / d.total) * 100, "");
    }
    var note = $("#dealNote");
    if (note) {
      var def = data.deals.definition || {};
      note.textContent = "수집 " + (def.collected || 0).toLocaleString() + "건 → 조건 충족 " +
        (def.qualified || (data.stats.deals.total)) + "건 · 신청 미달 " + (def.under || 0) +
        "건(0원 " + (def.zero || 0) + " · 저자부담 " + (def.low || 0) + ") · 표시 " +
        (def.detailShown || data.deals.items.length) + "건";
    }
    var scoreNote = $("#dealScoreNote");
    if (scoreNote && data.deals.scoring) scoreNote.textContent = data.deals.scoring.basis + " · " + data.deals.scoring.note;
    var mini = $("#dealMini");
    if (mini) {
      mini.innerHTML = sortedDeals().slice(0, 3).map(function (it) {
        return '<div class="mini-row"><span class="mr-dot green"></span>' +
          '<div class="mr-main"><div class="mr-title">' + esc(it.name) + '</div>' +
          '<div class="mr-sub">' + esc((it.category || "미분류") + " · 실사용 " + (it.score == null ? "—" : it.score) + "점 · " +
            it.platform + " · 정원 " + it.slots + " / 신청 " + it.applied) + '</div></div>' +
          '<span class="mr-val">' + esc(it.pay) + '</span></div>';
      }).join("");
    }
    var coupons = $("#couponMini");
    if (coupons) {
      coupons.innerHTML = data.coupons.slice(0, 4).map(function (c) {
        return '<div class="mini-row"><span class="mr-dot ' + esc(c.tone) + '"></span>' +
          '<div class="mr-main"><div class="mr-title">' + esc(c.title) + '</div>' +
          '<div class="mr-sub">' + esc(c.prize) + '</div></div>' +
          '<span class="mr-val">' + esc(deadlineText(c)) + '</span></div>';
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
        '<div class="mr-sub">' + esc(next.alarm) + ' 08:30 · 피사장 등록</div></div>' +
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
    var slotNames = ["오전", "오후", "저녁"];
    var slotIcon = { "오전": "☀️", "오후": "🌤️", "저녁": "🌙" };
    var slotNote = data.routineSlots || {};
    var groups = {};
    data.routine.forEach(function (r) {
      var key = r.slot || "오전";
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    var order = slotNames.filter(function (n) { return groups[n]; });
    Object.keys(groups).forEach(function (n) { if (order.indexOf(n) < 0) order.push(n); });
    box.innerHTML = order.map(function (slot) {
      var head = '<div class="slot-head"><span>' + esc(slotIcon[slot] || "•") + ' ' + esc(slot) +
        '</span><small>' + esc(slotNote[slot] || "") + '</small></div>';
      return '<div class="slot-group">' + head + groups[slot].map(function (r) {
        var m = minutesOf(r.time);
        var isNow = Math.abs(nowMin - m) <= 20;
        var isPast = !isNow && m < nowMin;
        return '<div class="tl-item' + (isNow ? " now" : isPast ? " past" : "") + '">' +
          '<span class="tl-time">' + esc(r.time) + '</span>' +
          '<span class="tl-rail"><span class="tl-dot"></span></span>' +
          '<div class="tl-body"><div class="tl-title">' + esc(r.title) + '</div>' +
          '<div class="tl-note">' + esc(r.note) + '</div>' +
          '<span class="tl-owner">' + esc(r.owner) + '</span></div>' +
          '</div>';
      }).join("") + '</div>';
    }).join("");
  }

  function renderNextRoutine() {
    var box = $("#nextRoutine");
    if (!box || !data.routine || !data.routine.length) return;
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var list = data.routine.slice().sort(function (a, b) { return minutesOf(a.time) - minutesOf(b.time); });
    var next = list.filter(function (r) { return minutesOf(r.time) >= nowMin - 5; })[0];
    var tomorrow = false;
    if (!next) { next = list[0]; tomorrow = true; }
    var left = minutesOf(next.time) - nowMin + (tomorrow ? 1440 : 0);
    var leftText = left <= 0 ? "지금" : left < 60 ? left + "분 후" : Math.floor(left / 60) + "시간 " + (left % 60 ? (left % 60) + "분 " : "") + "후";
    box.innerHTML = '<span class="nr-ico" aria-hidden="true">⏰</span>' +
      '<div class="nr-main"><div class="nr-k">' + (tomorrow ? "내일 첫 루틴" : "다음 루틴") + ' · ' + esc(next.time) + '</div>' +
      '<div class="nr-title">' + esc(next.title) + '</div></div>' +
      '<span class="nr-left">' + esc(leftText) + '</span>';
    box.hidden = false;
  }

  function renderAwards() {
    var box = $("#awardList");
    if (!box) return;
    box.innerHTML = data.awards.map(function (a, i) {
      return '<details class="award-item"' + (i === 0 ? " open" : "") + '>' +
        '<summary><span class="award-date">' + esc(a.date) + ' (' + esc(dowOf(a.date)) + ')</span>' +
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
        '<span class="cc-state ' + (c.tone === "amber" ? "amber" : c.tone === "read" ? "read" : "") + '">' + esc(c.state) + '</span></div>' +
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
        { v: s.entries.todayClosed || 4, l: "오늘 마감 경품" },
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
        var due = isDueToday(e);
        var st = (e.result && e.result.status) || "발표예정";
        return '<div class="entry-item">' +
          '<span class="entry-no">' + pad(i + 1) + '</span>' +
          '<div class="entry-body">' +
          '<div class="entry-title">' +
          (e.url ? '<a href="' + esc(e.url) + '" target="_blank" rel="noopener noreferrer">' + esc(e.title) + ' ↗</a>' : esc(e.title)) +
          gradeBadge(e.verification) +
          '</div>' +
          '<div class="entry-host">' + esc(e.host) + '</div>' +
          '<div class="entry-meta">' +
          '<span class="prize">' + esc(e.prize) + '</span>' +
          '<span class="' + (due ? "due" : "") + '">마감 ' + esc(deadlineShort(e)) + '</span>' +
          '<span>발표 ' + esc(e.announce) + '</span>' +
          '<span class="status s-' + esc(statusKey(st)) + '">' + esc(st) + '</span>' +
          '</div></div></div>';
      }).join("");
    }

    var deals = $("#dealList");
    if (deals) {
      deals.innerHTML = sortedDeals().map(function (d) {
        var pct = d.slots ? (d.applied / d.slots) * 100 : 0;
        var hot = d.slots - d.applied >= Math.max(10, d.slots * 0.6);
        return '<div class="deal-item">' +
          '<div class="deal-top"><div class="deal-name">' +
          (d.url ? '<a href="' + esc(d.url) + '" target="_blank" rel="noopener noreferrer">' + esc(d.name) + ' ↗</a>' : esc(d.name)) +
          gradeBadge(d.verification) +
          '</div><span class="deal-pay">' + esc(d.pay) + '</span></div>' +
          '<div class="deal-meta">' +
          '<span class="dm cat">' + esc(d.category || "미분류") + '</span>' +
          '<span class="dm score">실사용 ' + esc(d.score == null ? "—" : d.score) + '점</span>' +
          '<span class="dm">' + esc(d.platform) + '</span>' +
          '<span class="dm">' + esc(d.market) + '</span>' +
          '<span class="dm' + (hot ? " hot" : "") + '">정원 ' + d.slots + ' / 신청 ' + d.applied + '</span>' +
          '<span class="dm">~' + esc(deadlineShort(d)) + '</span>' +
          '</div>' +
          '<div class="deal-slots" aria-hidden="true"><i style="width:' + Math.max(2, Math.min(100, pct)).toFixed(0) + '%"></i></div>' +
          '</div>';
      }).join("");
    }

    var coupons = $("#couponList");
    if (coupons) {
      coupons.innerHTML = data.coupons.map(function (c) {
        var done = couponIsDone(c);
        return '<div class="coupon-item' + (done ? " is-done" : "") + '">' +
          '<span class="coupon-ico" aria-hidden="true">🎫</span>' +
          '<div class="coupon-body">' +
          '<div class="coupon-title">' +
          (c.url ? '<a href="' + esc(c.url) + '" target="_blank" rel="noopener noreferrer">' + esc(c.title) + ' ↗</a>' : esc(c.title)) +
          '</div>' +
          '<div class="coupon-prize">' + esc(c.prize) + '</div>' +
          '<div class="coupon-note">' + esc(c.note) +
          (c.watchPath ? '<br>▸ ' + esc(c.watchPath) : '') +
          (c.verification ? ' ' + gradeBadge(c.verification) : '') +
          '</div>' +
          '</div>' +
          '<div class="coupon-side">' +
          '<span class="coupon-due ' + esc(c.tone) + '">' + esc(deadlineText(c)) + '</span>' +
          '<button class="coupon-done' + (done ? " is-done" : "") + '" type="button" ' +
          'data-cdone="' + esc(c.id) + '" aria-pressed="' + (done ? "true" : "false") + '" ' +
          'title="참여하면 눌러서 완료 표시">' +
          (done ? "✓ 참여 완료" : "미참여") + '</button>' +
          '</div>' +
          '</div>';
      }).join("");
    }
    var donePill = $("#couponDoneNote");
    if (donePill && data.coupons) {
      var doneCount = data.coupons.filter(couponIsDone).length;
      donePill.textContent = "참여 완료 " + doneCount + " / " + data.coupons.length +
        " · 배지를 누르면 이 기기에 기록됩니다.";
    }
    renderCouponEfficiency();
    renderTracking();
  }

  /* 체험단 정렬 — 점수 높은 순, 같으면 마감 빠른 순 */
  function sortedDeals() {
    return (data.deals.items || []).slice().sort(function (a, b) {
      var diff = (b.score || 0) - (a.score || 0);
      if (diff) return diff;
      return deadlineKey(a) - deadlineKey(b);
    });
  }

  /* 쿠폰 참여 완료 — data.json done이 기본값, 배지를 누르면 이 기기에만 기록됩니다. */
  function couponIsDone(c) {
    var o = state.couponDone || {};
    return Object.prototype.hasOwnProperty.call(o, c.id) ? !!o[c.id] : !!c.done;
  }

  function markCoupon(id) {
    var c = (data.coupons || []).filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    var next = !couponIsDone(c);
    state.couponDone[id] = next;
    saveJSON(KEY.couponDone, state.couponDone);
    renderEntries();
    toast(next ? "🎫 참여 완료로 표시했어요" : "미참여로 되돌렸어요");
  }

  function statusKey(status) {
    return { "발표예정": "wait", "발표확인": "check", "당첨": "win",
      "미당첨": "lose", "수령완료": "done", "개별 연락 대기": "wait", "수령 기한 초과": "late" }[status] || "wait";
  }

  /* 당첨·수령 추적 + 기대수익 카드 (대시보드·응모/당첨 공용) */
  function trackingHtml() {
    var t = (data.stats && data.stats.tracking) || {};
    var rate = t.winRate || 0;
    var checked = t.resultChecked || 0;
    var wins = t.wins || 0;
    var value = t.expectedValue || 0;
    var received = t.received || 0;
    var items = [
      { k: "누적 응모", v: t.entered || 0, u: "건", s: "발표 확인 " + checked + "건" },
      { k: "당첨", v: wins, u: "건", s: "당첨률 " + rate + "%" },
      { k: "기대수익", v: value.toLocaleString(), u: "원", s: wins ? "당첨분 합계" : "당첨 0건 기준" },
      { k: "수령 완료", v: received, u: "건", s: "수령 대기 " + Math.max(0, wins - received) + "건" }
    ];
    var counts = {};
    (data.entries || []).forEach(function (e) {
      var st = (e.result && e.result.status) || "발표예정";
      counts[st] = (counts[st] || 0) + 1;
    });
    var order = ["발표예정", "발표확인", "당첨", "미당첨", "수령완료"];
    var chips = order.map(function (st) {
      return '<span class="status s-' + esc(statusKey(st)) + '">' + esc(st) + ' ' + (counts[st] || 0) + '</span>';
    }).join("");
    return '<div class="trk-grid">' + items.map(function (x) {
      return '<div class="trk-item"><span class="tk-k">' + esc(x.k) + '</span>' +
        '<span class="tk-v">' + esc(x.v) + '<small>' + esc(x.u) + '</small></span>' +
        '<span class="tk-s">' + esc(x.s) + '</span></div>';
    }).join("") + '</div>' +
      '<div class="status-row">' + chips + '</div>' +
      '<p class="eff-note">' + esc(t.note || "") + '</p>';
  }

  function renderTracking() {
    var html = trackingHtml();
    ["#trackGrid", "#entryTrack"].forEach(function (sel) {
      var box = $(sel);
      if (box) box.innerHTML = html;
    });
  }

  /* 쿠폰 시간대별 예상/실제 적립 기록란 */
  function renderCouponEfficiency() {
    var box = $("#couponEff");
    if (!box) return;
    var rows = [];
    data.coupons.forEach(function (c) {
      if (!c.efficiency || !c.efficiency.length) return;
      rows.push('<div class="eff-head">' + esc(c.title) + '</div>');
      c.efficiency.forEach(function (f) {
        rows.push('<div class="eff-row">' +
          '<span class="eff-slot">' + esc(f.slot) + '</span>' +
          '<span class="eff-k">예상 <strong>' + (f.expected == null ? "—" : f.expected + "원") + '</strong></span>' +
          '<span class="eff-k">실제 <strong>' + (f.actual == null ? "—" : f.actual + "원") + '</strong></span>' +
          '<span class="eff-k">소요 <strong>' + (f.minutes == null ? "—" : f.minutes + "분") + '</strong></span>' +
          '<span class="eff-st">' + esc(f.status) + '</span>' +
          '</div>');
      });
      if (c.efficiencyNote) rows.push('<p class="eff-note">' + esc(c.efficiencyNote) + '</p>');
    });
    box.innerHTML = rows.join("");
  }

  function nextBirthday() {
    var today = todayKey();
    var list = data.birthdays.filter(function (b) { return b.solar >= today; })
      .sort(function (a, b) { return a.solar < b.solar ? -1 : 1; });
    return list[0] || data.birthdays[0];
  }

  /* ------------------------------------------------------------
     역할 디테일 · 진행률 · 상세 프로필
     ------------------------------------------------------------ */
  var ROLE_AVA = { captain: "👑" };

  function roleOf(id) {
    var list = (data.roleDetails && data.roleDetails.members) || [];
    return list.filter(function (m) { return m.id === id; })[0];
  }

  function avaHtml(id) {
    return PALETTE[id] ? spriteSvg(id) : '<span class="emoji-ava">' + (ROLE_AVA[id] || "🙂") + '</span>';
  }

  function progressOf(m) {
    var g = (m && m.goals) || [];
    var done = g.filter(function (x) { return x.done; }).length;
    return { done: done, total: g.length, pct: g.length ? Math.round(done / g.length * 100) : 0 };
  }

  /* 수익화 트랙에서 이 구성원이 맡은 일 */
  var WHO_KEYS = {
    captain: ["회장님"], p1: ["피사장", "피클(피사장·제미대리·피사원)"], p2: ["피사원", "피클(피사장·제미대리·피사원)"], p3: ["제미대리", "피클(피사장·제미대리·피사원)"],
    p0: ["클부장", "클부장 & 피클(피사장·제미대리·피사원)"], p4: ["지과장"]
  };
  function tracksFor(id) {
    var keys = WHO_KEYS[id] || [];
    var out = [];
    ((data.monetization && data.monetization.tracks) || []).forEach(function (t) {
      (t.roles || []).forEach(function (r) {
        if (keys.indexOf(r.who) >= 0) out.push({ track: t, task: r.task });
      });
    });
    return out;
  }

  function ringHtml(pct, big) {
    return '<span class="pring' + (big ? " big" : "") + '" style="--p:' + pct + '"><b>' + pct + '<small>%</small></b></span>';
  }

  function roleBodyHtml(id) {
    var m = roleOf(id);
    if (!m) return "";
    var t = teamById(id);
    var pr = progressOf(m);
    var f = floorById(m.floor);
    var tracks = tracksFor(id);
    return '<div class="rp-head">' +
      '<span class="rp-ava" aria-hidden="true">' + avaHtml(id) + '</span>' +
      '<div class="rp-main"><div class="rp-name">' + esc(t ? t.name : m.name) + ' <small>' + esc(m.role) + '</small></div>' +
      '<div class="rp-meta">' + esc([(f ? f.label + " " + f.name : ""), (t && t.handle) || "", (t && t.platform) || ""]
        .filter(function (x) { return !!x; }).join(" · ")) + '</div>' +
      '<div class="rp-mission">' + esc(m.mission) + '</div></div>' +
      ringHtml(pr.pct, true) + '</div>' +
      '<div class="rp-bar"><i style="width:' + pr.pct + '%"></i></div>' +
      '<p class="rp-bar-label">오늘 목표 ' + pr.done + ' / ' + pr.total + ' 완료</p>' +
      '<p class="rp-sub">🎯 오늘 목표</p>' +
      '<ul class="goal-list">' + m.goals.map(function (g) {
        return '<li class="' + (g.done ? "is-done" : "") + '"><span class="gl-box" aria-hidden="true">' + (g.done ? "✓" : "") + '</span>' + esc(g.text) + '</li>';
      }).join("") + '</ul>' +
      '<p class="rp-sub">🕘 일일 루틴</p>' +
      '<ol class="mini-tl">' + m.routine.map(function (r) {
        return '<li><span class="mt-time">' + esc(r.time) + '</span><span class="mt-task">' + esc(r.task) + '</span></li>';
      }).join("") + '</ol>' +
      '<div class="rp-roles">' +
      '<div class="rp-role"><span>🚦 게이트</span><p>' + esc(m.gate) + '</p></div>' +
      '<div class="rp-role"><span>⚡ 릴레이</span><p>' + esc(m.relay) + '</p></div>' +
      '</div>' +
      (t && t.duties ? '<div class="team-duties rp-duties">' + t.duties.map(function (d) { return '<span>' + esc(d) + '</span>'; }).join("") + '</div>' : '') +
      (tracks.length ? '<p class="rp-sub">💰 수익화 담당</p><div class="rp-tracks">' + tracks.map(function (x) {
        return '<button type="button" class="rp-track tone-' + esc(x.track.tone) + '" data-track="' + esc(x.track.id) + '">' +
          '<b>' + esc(x.track.no) + ' ' + esc(x.track.short) + '</b><span>' + esc(x.task) + '</span></button>';
      }).join("") + '</div>' : '');
  }

  function renderRoles() {
    var picker = $("#rolePicker");
    var panel = $("#rolePanel");
    if (!picker || !panel || !data.roleDetails) return;
    var members = data.roleDetails.members;
    if (!roleOf(state.role)) state.role = members[0].id;
    picker.innerHTML = members.map(function (m) {
      var on = m.id === state.role;
      var pr = progressOf(m);
      return '<button type="button" class="rp-chip' + (on ? " is-on" : "") + '" role="tab" aria-selected="' + on + '" data-role="' + esc(m.id) + '">' +
        '<span class="rc-ava" aria-hidden="true">' + avaHtml(m.id) + '</span>' +
        '<span class="rc-name">' + esc(m.name) + '</span>' +
        '<span class="rc-pct">' + pr.pct + '%</span></button>';
    }).join("");
    panel.innerHTML = roleBodyHtml(state.role);
    panel.classList.remove("is-in");
    void panel.offsetWidth;
    panel.classList.add("is-in");
  }

  function openProfile(id) {
    var m = roleOf(id);
    if (!m) return;
    var t = teamById(id);
    haptic(8);
    openSheet((t ? t.name : m.name) + " · 상세 프로필", '<div class="role-panel in-sheet">' + roleBodyHtml(id) + '</div>');
  }

  /* 3단 게이트 */
  function renderGates() {
    var box = $("#gateFlow");
    var g = data.gates;
    if (!box || !g) return;
    box.innerHTML = g.items.map(function (it, i) {
      return '<div class="gate g' + esc(it.no) + '">' +
        '<div class="gate-top"><span class="gate-no">' + esc(it.icon) + '</span>' +
        '<div><div class="gate-name">게이트 ' + esc(it.no) + ' · ' + esc(it.name) + '</div>' +
        '<div class="gate-owners">' + it.owners.map(esc).join(" · ") + '</div></div></div>' +
        '<ul class="gate-crit">' + it.criteria.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join("") + '</ul>' +
        '<div class="gate-out">산출물 · ' + esc(it.output) + '</div>' +
        '</div>' + (i < g.items.length - 1 ? '<div class="gate-arrow" aria-hidden="true">통과 ▼</div>' : '');
    }).join("");
    var note = $("#gateNote");
    if (note) note.textContent = g.note || "";
  }

  /* 층별 모니터 HUD */
  function floorHud(f) {
    var s = data.stats || {};
    var pend = pendingDecisions().length;
    var tiles = {
      "4": ['<span class="hud-tile">📣 08:00 브리핑 <b>✓</b></span>',
        '<span class="hud-tile warn">👑 결정 대기 <b>' + pend + '</b></span>',
        '<button type="button" class="hud-tile hud-btn" data-profile="captain">👑 회장석 ›</button>'],
      "3": ['<span class="hud-tile">🔍 게이트 ② 검증</span>',
        '<span class="hud-tile">🧭 체험단 <b>' + ((s.deals && s.deals.total) || 0) + '</b>건 점수화</span>'],
      "2": ['<span class="hud-tile code"><i></i><i></i><i></i></span>',
        '<span class="hud-tile">🔗 GitHub 동기화 <b>✓</b></span>'],
      "1": ['<span class="hud-tile">🎟️ 응모 <b>' + ((s.entries && s.entries.total) || 0) + '</b>건</span>',
        '<span class="hud-tile">🎫 0원 쿠폰 <b>' + ((s.coupons && s.coupons.zero) || 0) + '</b>종</span>']
    }[f.id] || [];
    return '<div class="floor-hud">' + tiles.join("") + '</div>';
  }

  /* ------------------------------------------------------------
     수익화 8대 트랙 · 정장 입은 동물 캐릭터
     ------------------------------------------------------------ */
  function won(n) {
    if (!n) return "0원";
    if (n >= 10000) return (n / 10000).toLocaleString() + "만원";
    return n.toLocaleString() + "원";
  }
  function shortRange(r) {
    if (!r) return "—";
    if (r.min === r.max) return won(r.max);
    if (r.min >= 10000 && r.max >= 10000) {
      return (r.min / 10000).toLocaleString() + "~" + (r.max / 10000).toLocaleString() + "만원";
    }
    return won(r.min) + "~" + won(r.max);
  }
  function rangeText(r) {
    if (!r) return "—";
    if (r.min === r.max) return won(r.max);
    return won(r.min) + " ~ " + won(r.max);
  }
  function checkDone(item) {
    var o = state.moneyCheck || {};
    return Object.prototype.hasOwnProperty.call(o, item.id) ? !!o[item.id] : !!item.done;
  }
  function allDecisions() {
    var out = [];
    ((data.monetization && data.monetization.tracks) || []).forEach(function (t) {
      (t.decisions || []).forEach(function (d) { out.push({ d: d, track: t }); });
    });
    return out;
  }
  function pendingDecisions() {
    if (!data.monetization) return [];
    return allDecisions().filter(function (x) { return !state.decisions[x.d.id]; });
  }
  var STAGES = ["리서치", "검증", "실행"];

  function trackHtml(t, open) {
    var items = t.checklist || [];
    var done = items.filter(checkDone).length;
    var pct = items.length ? Math.round(done / items.length * 100) : 0;
    var si = STAGES.indexOf(t.stage);
    var pend = (t.decisions || []).filter(function (d) { return !state.decisions[d.id]; }).length;
    return '<details class="track tone-' + esc(t.tone) + '" id="track-' + esc(t.id) + '"' + (open ? " open" : "") + '>' +
      '<summary>' +
      '<div class="tr-head"><span class="tr-ico" aria-hidden="true">' + esc(t.icon) + '</span>' +
      '<div class="tr-title"><span class="tr-no">트랙 ' + esc(t.no) + '</span><b>' + esc(t.name) + '</b></div>' +
      '<span class="tr-status s-' + esc(t.status === "가동 중" ? "run" : t.status === "신규" ? "new" : t.status === "승인 대기" ? "wait" : "prep") + '">' + esc(t.status) + '</span></div>' +
      '<p class="tr-sum">' + esc(t.summary) + '</p>' +
      '<div class="tr-metrics">' +
      '<div><span>예상 월 수익</span><b>' + esc(rangeText(t.monthly)) + '</b></div>' +
      '<div><span>초기 자본</span><b>' + esc(rangeText(t.capital)) + '</b></div>' +
      '<div><span>실적</span><b>' + esc(won(t.actual || 0)) + '</b></div>' +
      '</div>' +
      '<div class="tr-stage">' + STAGES.map(function (st, i) {
        return '<span class="' + (i < si ? "done" : i === si ? "now" : "") + '">' + esc(st) + '</span>';
      }).join('<i aria-hidden="true"></i>') + '</div>' +
      '<div class="tr-foot"><span class="tr-prog"><i style="width:' + pct + '%"></i></span>' +
      '<span class="tr-prog-t">주간 체크 ' + done + '/' + items.length + '</span>' +
      (pend ? '<span class="tr-pend">👑 결정 ' + pend + '</span>' : '') +
      '<span class="tr-more" aria-hidden="true"></span></div>' +
      '</summary>' +
      '<div class="tr-body">' +
      '<p class="tr-basis">📐 수익 근거 · ' + esc(t.monthly.basis) + '<br>💵 자본 근거 · ' + esc(t.capital.basis) + '</p>' +
      (t.pipeline ? '<p class="tr-sub">🔁 실행 파이프라인</p><ol class="tr-pipe">' + t.pipeline.map(function (p) {
        return '<li><span class="tp-no">' + esc(p.no) + '</span><div><b><span class="tp-who">' + esc(p.who) + '</span>' + esc(p.task) + '</b><small>→ ' + esc(p.out) + '</small></div></li>';
      }).join("") + '</ol>' : '') +
      '<p class="tr-sub">✅ 주간 실행 체크리스트</p>' +
      '<ul class="tr-check">' + items.map(function (c) {
        var d = checkDone(c);
        return '<li><button type="button" class="tc-btn' + (d ? " is-done" : "") + '" data-check="' + esc(c.id) + '" aria-pressed="' + d + '">' +
          '<span class="tc-box" aria-hidden="true">' + (d ? "✓" : "") + '</span><span>' + esc(c.text) + '</span></button></li>';
      }).join("") + '</ul>' +
      '<div class="tr-cols">' +
      '<div class="tr-risk"><p class="tr-sub">⚠️ 리스크</p><ul>' + t.risks.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join("") + '</ul></div>' +
      '<div class="tr-block"><p class="tr-sub">⛔ 차단 요인</p><ul>' + t.blockers.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join("") + '</ul></div>' +
      '</div>' +
      '<p class="tr-sub">👥 역할 매핑</p><div class="tr-roles">' + t.roles.map(function (r) {
        return '<div><b>' + esc(r.who) + '</b><span>' + esc(r.task) + '</span></div>';
      }).join("") + '</div>' +
      ((t.decisions || []).length ? '<p class="tr-sub">👑 회장님 결정 대기</p><div class="decide-list">' + t.decisions.map(decisionRow.bind(null, t)).join("") + '</div>' : '') +
      '</div></details>';
  }

  function decisionRow(t, d) {
    var v = state.decisions[d.id];
    return '<div class="decide-item' + (v ? " is-set" : "") + '">' +
      '<div class="di-main"><span class="di-track">' + esc(t.no + " " + t.short) + '</span><p>' + esc(d.text) + '</p></div>' +
      '<div class="di-btns">' +
      '<button type="button" class="di-btn ok' + (v === "승인" ? " is-on" : "") + '" data-decide="' + esc(d.id) + '" data-val="승인">승인</button>' +
      '<button type="button" class="di-btn hold' + (v === "보류" ? " is-on" : "") + '" data-decide="' + esc(d.id) + '" data-val="보류">보류</button>' +
      '</div></div>';
  }

  function renderMoney(keepOpen) {
    var m = data.monetization;
    var list = $("#trackList");
    if (!m || !list) return;
    var tracks = m.tracks;
    var sum = function (k, f) { return tracks.reduce(function (a, t) { return a + ((t[k] && t[k][f]) || 0); }, 0); };
    var checks = [], done = 0;
    tracks.forEach(function (t) { (t.checklist || []).forEach(function (c) { checks.push(c); if (checkDone(c)) done += 1; }); });
    var pend = pendingDecisions().length;
    var running = tracks.filter(function (t) { return t.status === "가동 중"; }).length;
    var summary = $("#moneySummary");
    if (summary) {
      summary.innerHTML =
        '<div class="ms-main"><span>' + tracks.length + '대 트랙 예상 월 수익 (추정)</span><b>' + esc(won(sum("monthly", "min")) + " ~ " + won(sum("monthly", "max"))) + '</b>' +
        '<small>실적 ' + esc(won(tracks.reduce(function (a, t) { return a + (t.actual || 0); }, 0))) + ' · 검증 전 범위</small></div>' +
        '<div class="ms-item"><span>초기 자본</span><b>' + esc(shortRange({ min: sum("capital", "min"), max: sum("capital", "max") })) + '</b></div>' +
        '<div class="ms-item"><span>가동 트랙</span><b>' + running + ' / ' + tracks.length + '</b></div>' +
        '<div class="ms-item"><span>주간 체크</span><b>' + done + ' / ' + checks.length + '</b></div>' +
        '<div class="ms-item warn"><span>결정 대기</span><b>' + pend + '건</b></div>';
    }
    var note = $("#moneyNote");
    if (note) note.textContent = m.note || "";
    var chips = $("#trackChips");
    if (chips) {
      chips.innerHTML = tracks.map(function (t) {
        return '<button type="button" class="tchip tone-' + esc(t.tone) + '" data-track="' + esc(t.id) + '">' + esc(t.no) + ' ' + esc(t.short) + '</button>';
      }).join("");
    }
    var openIds = keepOpen || [tracks[0].id];
    list.innerHTML = tracks.map(function (t) { return trackHtml(t, openIds.indexOf(t.id) >= 0); }).join("");
    var dl = $("#decisionList");
    if (dl) dl.innerHTML = allDecisions().map(function (x) { return decisionRow(x.track, x.d); }).join("");
    var dp = $("#decidePill");
    if (dp) dp.textContent = pend ? "대기 " + pend + "건" : "모두 처리";
    var rm = $("#roleMap");
    if (rm && data.roleDetails) {
      var rows = data.roleDetails.members.map(function (mm) {
        var tr = tracksFor(mm.id);
        return { id: mm.id, name: mm.name, ava: avaHtml(mm.id), items: tr.map(function (x) { return { no: x.track.no, tone: x.track.tone, task: x.task }; }) };
      });
      rm.innerHTML = rows.map(function (r) {
        return '<div class="rm-row"' + (r.id ? ' role="button" tabindex="0" data-profile="' + esc(r.id) + '"' : '') + '>' +
          '<span class="rm-ava" aria-hidden="true">' + r.ava + '</span>' +
          '<div class="rm-main"><b>' + esc(r.name) + '</b><div class="rm-items">' + (r.items.length ? r.items.map(function (x) {
            return '<span class="tone-' + esc(x.tone) + '"><em>' + esc(x.no) + '</em>' + esc(x.task) + '</span>';
          }).join("") : '<span class="none">수익화 트랙 담당 없음</span>') + '</div></div></div>';
      }).join("");
    }
    $$(".floor-hud .warn b").forEach(function (b) { b.textContent = pend; });
  }

  function openTrackIds() {
    return $$("#trackList details[open]").map(function (d) { return d.id.replace("track-", ""); });
  }

  function toggleCheck(id) {
    var item = null;
    data.monetization.tracks.forEach(function (t) { (t.checklist || []).forEach(function (c) { if (c.id === id) item = c; }); });
    if (!item) return;
    var next = !checkDone(item);
    state.moneyCheck[id] = next;
    saveJSON(KEY.money, state.moneyCheck);
    haptic(8);
    renderMoney(openTrackIds());
    toast(next ? "✅ 체크했어요" : "체크를 해제했어요");
  }

  function setDecision(id, val) {
    if (state.decisions[id] === val) delete state.decisions[id];
    else state.decisions[id] = val;
    saveJSON(KEY.decide, state.decisions);
    haptic(10);
    renderMoney(openTrackIds());
    toast(state.decisions[id] ? "👑 " + val + "으로 기록했어요" : "결정을 대기로 되돌렸어요");
  }

  function gotoTrack(id) {
    if (state.tab !== "money") { closeSheet(); setTab("money"); }
    var el = $("#track-" + id);
    if (!el) return;
    el.open = true;
    window.setTimeout(function () { el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
  }

  /* ------------------------------------------------------------
     탭
     ------------------------------------------------------------ */
  function setTab(name, silent) {
    var allowed = ["map", "meeting", "dash", "cal", "credits", "entries", "money"];
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
  /* 층별 좌표 — 각 층 안에서의 % */
  var FLOOR_SPOTS = {
    "4": [[46, 74], [57, 78], [66, 72], [52, 82]],
    "3": [[24, 76], [36, 80], [64, 74], [75, 78]],
    "2": [[38, 78], [50, 74], [60, 80], [45, 84]],
    "1": [[44, 78], [56, 74], [66, 80], [50, 84]]
  };
  var HOME = { captain: [66, 72], p1: [46, 74], p2: [44, 78], p4: [64, 74], p0: [45, 78], p3: [24, 76] };
  var LINES = {
    captain: ["👑 최종 의사결정 대기", "📣 08:00 브리핑 확인", "🏛️ 4층 지휘실 상주", "⚡ 릴레이 보고 수신"],
    p0: ["🛠️ 웹앱 4층 개편", "🔗 GitHub 동기화", "⚙️ 자동화 개발 중", "📋 고난도 실무 처리"],
    p1: ["📣 08:00 통합 브리핑", "🧭 최종 의사결정 대기", "⚡ 크레딧 릴레이 총괄", "🗂️ 04:00 상황공유"],
    p2: ["🔎 리서치 정리 중", "🎟️ 체험단 조사", "🧺 가족 일정 확인", "☕ 잠깐 충전 중"],
    p3: ["🎯 응모 124건 진행", "☕ 0원 쿠폰 줍줍", "✅ 사전 검증 게이트", "📊 시장 조사 중"],
    p4: ["🔍 교차 검증 완료", "💡 아이디어 제안", "💬 전략 조언", "📰 아침 뉴스 브리핑"]
  };
  var FLOOR_LINES = {
    "4": {
      captain: ["👑 최종 의사결정 대기", "📣 08:00 브리핑 확인", "🏛️ 지휘실 상주", "⚡ 릴레이 보고 수신"],
      p1: ["📣 08:00 통합 브리핑", "🗂️ 04:00 전체 상황공유", "🧭 최종 의사결정 대기", "⚡ 크레딧 릴레이 총괄"]
    },
    "3": {
      p2: ["🔎 리서치 정리 중", "🧺 가족 일정 확인", "🗓️ 일정표 업데이트", "🎟️ 체험단 조사"],
      p4: ["🔍 교차 검증 완료", "💬 전략 조언 3건", "📰 아침 뉴스 브리핑", "🩺 의료기기 브리핑"]
    },
    "2": { p0: ["🛠️ 웹앱 4층 개편", "🔗 GitHub 동기화", "⚙️ 자동화 개발 중", "📋 고난도 실무 처리"] },
    "1": { p3: ["🎯 응모 124건 진행", "☕ 0원 쿠폰 줍줍", "✅ 사전 검증 게이트", "📊 시장 조사 중"] }
  };

  function buildAgents() {
    agents = [];
    data.team.forEach(function (t) {
      var box = $('.floor-agents[data-floor-agents="' + t.floor + '"]');
      if (!box) return;
      var el = document.createElement("div");
      el.className = "agent " + t.id;
      el.setAttribute("data-agent", t.id);
      el.setAttribute("data-floor", t.floor);
      el.innerHTML = '<span class="bubble"></span>' +
        '<span class="sprite-wrap">' + spriteSvg(t.id) + '</span>' +
        '<span class="agent-tag">' + esc(t.name) + '</span>';
      box.appendChild(el);
      var p = HOME[t.id] || [50, 74];
      el.style.left = p[0] + "%";
      el.style.top = p[1] + "%";
      agents.push({ id: t.id, floor: t.floor, el: el, x: p[0], y: p[1], timer: null, waiting: null });
    });
  }

  function visible(a) { return state.floor === "all" || state.floor === a.floor; }

  function lineFor(a) {
    if (state.floor === "all") return pick(LINES[a.id] || ["💬"]);
    return pick((FLOOR_LINES[a.floor] || {})[a.id] || ["💬"]);
  }

  function setAgentPos(a, pt, dur) {
    a.el.style.transitionDuration = dur + "s";
    a.x = pt[0];
    a.y = pt[1];
    a.el.style.left = pt[0] + "%";
    a.el.style.top = pt[1] + "%";
  }

  function startMotion() {
    if (!state.motion || state.tab !== "map") return;
    agents.forEach(function (a) {
      window.clearTimeout(a.timer);
      window.clearTimeout(a.waiting);
      if (!visible(a)) return;
      a.timer = window.setTimeout(function () { moveAgent(a); }, 500 + Math.random() * 1600);
    });
    scheduleTalk();
  }

  function stopMotion() {
    window.clearTimeout(talkTimer);
    talkTimer = null;
    agents.forEach(function (a) {
      window.clearTimeout(a.timer);
      window.clearTimeout(a.waiting);
      window.clearTimeout(a.speakT1);
      window.clearTimeout(a.speakT2);
      a.el.classList.remove("walk", "talk", "typing");
    });
    window.clearTimeout(dialogTimer);
  }

  /* 말풍선: 점 세 개(입력 중) → 문구 → 사라짐 */
  function speak(a, text, dur, delay) {
    var bubble = a.el.querySelector(".bubble");
    if (!bubble) return;
    window.clearTimeout(a.speakT0);
    window.clearTimeout(a.speakT1);
    window.clearTimeout(a.speakT2);
    var go = function () {
      bubble.textContent = text || lineFor(a);
      a.el.classList.add("talk", "typing");
      a.speakT1 = window.setTimeout(function () { a.el.classList.remove("typing"); }, 420);
      a.speakT2 = window.setTimeout(function () { a.el.classList.remove("talk", "typing"); }, dur || 2800);
    };
    if (delay) a.speakT0 = window.setTimeout(go, delay);
    else go();
  }

  function pickSpot(a) {
    var all = (FLOOR_SPOTS[a.floor] || [[50, 74]]).slice();
    var spots = all.filter(function (p) {
      var dx = p[0] - a.x;
      var dy = p[1] - a.y;
      return Math.sqrt(dx * dx + dy * dy) >= 6;
    });
    if (!spots.length) spots = all;
    spots.sort(function () { return Math.random() - 0.5; });
    var best = spots[0];
    var bestGap = -1;
    spots.forEach(function (candidate) {
      var gap = 99;
      agents.forEach(function (other) {
        if (other === a || other.floor !== a.floor) return;
        var dx = other.x - candidate[0];
        var dy = other.y - candidate[1];
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < gap) gap = dist;
      });
      if (gap > bestGap) { bestGap = gap; best = candidate; }
    });
    return best;
  }

  function moveAgent(a, quick) {
    if (state.tab !== "map" || document.hidden) return;
    if (!visible(a)) return;
    if (!state.motion && !quick) return;
    var pt = pickSpot(a);
    var dx = pt[0] - a.x;
    var dy = pt[1] - a.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 3 && !quick) {
      a.waiting = window.setTimeout(function () { moveAgent(a); }, 600);
      return;
    }
    var dur = quick ? 1.0 : Math.max(1.8, Math.min(6, dist / 7));
    setAgentPos(a, pt, dur);
    a.el.classList.add("walk");
    if (dx < -0.8) a.el.classList.add("face-left");
    else if (dx > 0.8) a.el.classList.remove("face-left");
    var bubble = a.el.querySelector(".bubble");
    if (bubble && Math.random() < 0.5) bubble.textContent = lineFor(a);
    window.clearTimeout(a.timer);
    a.timer = window.setTimeout(function () {
      a.el.classList.remove("walk");
      if (bubble && Math.random() < 0.35 && !a.el.classList.contains("talk")) {
        speak(a, bubble.textContent || lineFor(a), 2400);
      }
      a.waiting = window.setTimeout(function () { moveAgent(a); }, 900 + Math.random() * 2600);
    }, dur * 1000 + 90);
  }

  function faceToward(a, b) {
    a.el.classList.toggle("face-left", b.x < a.x);
    b.el.classList.toggle("face-left", a.x < b.x);
  }

  /* 같은 층 두 명이 주고받는 대화 (3F 제미대리 ↔ 지과장) */
  function tryDialog(pool) {
    var byFloor = {};
    pool.forEach(function (a) { (byFloor[a.floor] = byFloor[a.floor] || []).push(a); });
    var pairs = Object.keys(byFloor).filter(function (k) { return byFloor[k].length >= 2; });
    if (!pairs.length) return false;
    var group = byFloor[pick(pairs)].slice().sort(function () { return Math.random() - 0.5; });
    var a = group[0], b = group[1];
    if (a.el.classList.contains("walk") || b.el.classList.contains("walk")) return false;
    faceToward(a, b);
    speak(a, lineFor(a), 2400);
    window.clearTimeout(dialogTimer);
    dialogTimer = window.setTimeout(function () {
      if (state.tab === "map" && visible(b)) speak(b, lineFor(b), 2600);
    }, 1500);
    return true;
  }

  function scheduleTalk() {
    window.clearTimeout(talkTimer);
    talkTimer = window.setTimeout(function () {
      if (state.motion && state.tab === "map" && !document.hidden) {
        var pool = agents.filter(visible);
        if (!(Math.random() < 0.3 && tryDialog(pool))) {
          var idle = pool.filter(function (x) { return !x.el.classList.contains("talk"); });
          var a = pick(idle.length ? idle : pool);
          if (a) speak(a, lineFor(a), 2800);
        }
      }
      scheduleTalk();
    }, 3400 + Math.random() * 3400);
  }

  function pokeFloorAgents(delay) {
    var shown = agents.filter(visible);
    var talker = state.floor === "all" ? pick(shown) : null;
    agents.forEach(function (a) {
      var on = visible(a);
      a.el.classList.toggle("is-hidden", !on);
      a.el.classList.remove("walk", "is-picked");
      if (!on) {
        window.clearTimeout(a.speakT0);
        a.el.classList.remove("talk", "typing");
        a.el.style.transitionDuration = "";
        return;
      }
      setAgentPos(a, pickSpot(a), 1.0);
      if (state.floor !== "all" || a === talker) {
        speak(a, lineFor(a), 3000, delay || 0);
        hopAgent(a, delay || 0);
      }
    });
  }

  function hopAgent(a, delay) {
    window.setTimeout(function () {
      a.el.classList.remove("hop");
      void a.el.offsetWidth;
      a.el.classList.add("hop");
      window.setTimeout(function () { a.el.classList.remove("hop"); }, 600);
    }, delay || 0);
  }

  /* 층 높이(flex-grow)와 같은 비율로 엘리베이터 카 위치 계산 */
  var FLOOR_IDS = ["4", "3", "2", "1"];
  function carTop(id) {
    if (id === "all") return "calc(50% - 15px)";
    var grows = FLOOR_IDS.map(function (x) { return x === id ? 3.2 : 0.62; });
    var total = grows.reduce(function (s, g) { return s + g; }, 0);
    var i = FLOOR_IDS.indexOf(id);
    var pre = grows.slice(0, i).reduce(function (s, g) { return s + g; }, 0);
    var frac = (pre + grows[i] / 2) / total;
    return "calc(" + (frac * 100).toFixed(2) + "% - 15px)";
  }

  function floorLabel(id) { return id === "all" ? "ALL" : id + "F"; }

  function applyFloorState() {
    $$(".floor").forEach(function (el) {
      var id = el.getAttribute("data-floor");
      var focused = state.floor !== "all" && id === state.floor;
      el.classList.toggle("is-focus", focused);
      el.classList.toggle("is-dim", state.floor !== "all" && !focused);
      el.setAttribute("aria-current", focused ? "true" : "false");
      if (!focused) {
        var prof = el.querySelector(".floor-profile");
        if (prof) prof.classList.remove("is-on");
      }
    });
    $$(".floor-btn").forEach(function (btn) {
      var on = btn.getAttribute("data-floor") === state.floor;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    var stage = $("#officeStage");
    if (stage) stage.setAttribute("data-focus", state.floor);
    var car = $("#shaftCar");
    if (car) {
      car.textContent = floorLabel(state.floor);
      car.style.top = carTop(state.floor);
    }
    var chip = $("#floorChip");
    if (chip) {
      var f = state.floor === "all" ? null : floorById(state.floor);
      chip.textContent = f ? "🏢 " + f.label + " " + (f.short || f.name) : "🏢 전체 4개 층";
    }
  }

  /* 엘리베이터 표시창 — 지나가는 층을 차례로 보여 주고 도착하면 딩 */
  function rideDisplay(from, to) {
    var panel = $(".elevator-panel");
    var floorEl = $("#epFloor");
    var arrow = $("#epArrow");
    var car = $("#shaftCar");
    if (!panel || !floorEl) return;
    var rank = { "1": 1, "2": 2, "3": 3, "4": 4, all: 2.5 };
    var up = rank[to] > rank[from];
    window.clearTimeout(rideTimer);
    panel.classList.remove("is-arrived");
    panel.classList.add("is-riding");
    if (car) car.classList.add("is-riding");
    if (arrow) arrow.textContent = up ? "▲" : "▼";
    var steps = [];
    if (from !== "all" && to !== "all") {
      var a = parseInt(from, 10), b = parseInt(to, 10);
      for (var n = a; n !== b; n += (b > a ? 1 : -1)) steps.push(String(n));
    }
    steps.push(to);
    var i = 0;
    var tick = function () {
      floorEl.textContent = floorLabel(steps[i]);
      i += 1;
      if (i < steps.length) {
        rideTimer = window.setTimeout(tick, Math.max(160, 760 / steps.length));
      } else {
        rideTimer = window.setTimeout(function () {
          panel.classList.remove("is-riding");
          if (car) car.classList.remove("is-riding");
          if (arrow) arrow.textContent = "●";
          void panel.offsetWidth;
          panel.classList.add("is-arrived");
        }, 260);
      }
    };
    tick();
  }

  function focusFloor(id, silent) {
    if (!id) return;
    var prev = state.floor;
    state.floor = (id !== "all" && id === state.floor) ? "all" : id;
    if (state.floor === prev && !silent) return;
    applyFloorState();
    renderFloorCards();
    rideDisplay(prev, state.floor);
    var chip = $("#floorChip");
    if (chip) {
      chip.classList.remove("is-pulse");
      void chip.offsetWidth;
      chip.classList.add("is-pulse");
    }
    var doorDelay = 0;
    if (state.floor !== "all") {
      var target = $('.floor[data-floor="' + state.floor + '"]');
      if (target) {
        target.classList.remove("door-cycle");
        void target.offsetWidth;
        target.classList.add("door-cycle");
        window.setTimeout(function () { target.classList.remove("door-cycle"); }, 1100);
        doorDelay = 380;
      }
    }
    if (state.motion) {
      stopMotion();
      startMotion();
    }
    pokeFloorAgents(doorDelay);
    if (!silent) {
      haptic(10);
      var f = state.floor === "all" ? null : floorById(state.floor);
      toast(f ? "🛗 " + f.label + " " + f.name + " 도착" : "🏢 4개 층 전체 보기");
    }
  }

  /* 확대된 층에서 캐릭터를 누르면: 폴짝 + 말풍선 + 프로필 카드 */
  function freezeAgent(a) {
    window.clearTimeout(a.timer);
    window.clearTimeout(a.waiting);
    var parent = a.el.parentNode;
    if (!parent) return;
    var pw = parent.clientWidth || 1;
    var ph = parent.clientHeight || 1;
    var cs = window.getComputedStyle(a.el);
    var x = parseFloat(cs.left) / pw * 100;
    var y = parseFloat(cs.top) / ph * 100;
    if (!isNaN(x) && !isNaN(y)) {
      a.el.style.transitionDuration = "0s";
      a.x = x; a.y = y;
      a.el.style.left = x + "%";
      a.el.style.top = y + "%";
      void a.el.offsetWidth;
      a.el.style.transitionDuration = "";
    }
    a.el.classList.remove("walk");
  }

  function showProfile(a) {
    var floorEl = a.el.closest(".floor");
    var box = floorEl ? floorEl.querySelector(".floor-profile") : null;
    var t = teamById(a.id);
    if (!box || !t) return;
    var rd = roleOf(a.id);
    var pr = progressOf(rd);
    box.innerHTML = '<span class="fp-ava" aria-hidden="true">' + spriteSvg(a.id) + '</span>' +
      '<div class="fp-body"><div class="fp-top"><span class="fp-name">' + esc(t.name) + '</span>' +
      '<span class="fp-role">' + esc(t.role) + '</span>' +
      '<span class="fp-state"><span class="live-dot" aria-hidden="true"></span>' + esc(t.status) + '</span></div>' +
      '<div class="fp-note">' + (rd ? '진행률 ' + pr.pct + '% · 오늘 목표 ' + pr.done + '/' + pr.total + ' · ' : '') + esc(t.note) + '</div>' +
      '<div class="fp-duties">' + (t.duties || []).map(function (d) { return '<span>' + esc(d) + '</span>'; }).join("") + '</div></div>' +
      '<button type="button" class="fp-more" data-profile="' + esc(a.id) + '">상세 ›</button>';
    box.classList.add("is-on");
    window.clearTimeout(profileTimer);
    profileTimer = window.setTimeout(function () {
      box.classList.remove("is-on");
      a.el.classList.remove("is-picked");
    }, 4200);
  }

  function pickAgent(id) {
    var a = agents.filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    if (state.floor !== a.floor) {
      focusFloor(a.floor, true);
    }
    haptic(12);
    agents.forEach(function (x) { if (x !== a) x.el.classList.remove("is-picked"); });
    freezeAgent(a);
    a.el.classList.add("is-picked");
    hopAgent(a, 0);
    speak(a, lineFor(a), 3200, 120);
    showProfile(a);
    if (state.motion) {
      a.waiting = window.setTimeout(function () { moveAgent(a); }, 4400);
    }
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
    $$(".seg-btn[data-style]").forEach(function (btn) {
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
    if (data) renderNextRoutine();
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
    var bell = $("#btnBell");
    if (bell) bell.classList.toggle("has-new", unread > 0);
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
    var sheet = $("#sheet");
    if (sheet) { sheet.style.transform = ""; sheet.classList.remove("is-settling", "is-dragging"); }
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
      office: data.captain ? data.captain.office : "바이코 AI 오피스",
      directives: state.directives,
      decisions: state.decisions,
      moneyChecklist: state.moneyCheck,
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
        if (btn.getAttribute("data-tab") !== state.tab) haptic(6);
        setTab(btn.getAttribute("data-tab"));
      });
    });

    $("#btnTheme").addEventListener("click", function () {
      applyTheme(state.theme === "dark" ? "light" : "dark");
    });
    $("#btnBell").addEventListener("click", openAlerts);
    $("#btnRelay").addEventListener("click", openRelay);

    $$(".seg-btn[data-style]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var style = btn.getAttribute("data-style");
        if (style !== state.mapStyle) applyMapStyle(style);
      });
    });
    $("#motionBtn").addEventListener("click", function () {
      applyMotion(!state.motion);
    });

    $$(".floor-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        focusFloor(btn.getAttribute("data-floor"));
      });
    });
    var floorStack = $("#floorStack");
    if (floorStack) {
      floorStack.addEventListener("click", function (ev) {
        var el = ev.target.closest ? ev.target.closest(".floor") : null;
        if (!el) return;
        if (el.classList.contains("is-focus")) {
          var ag = ev.target.closest(".agent");
          if (ag) { pickAgent(ag.getAttribute("data-agent")); return; }
          var prof = ev.target.closest("[data-profile]");
          if (prof) { openProfile(prof.getAttribute("data-profile")); return; }
          if (ev.target.closest(".floor-profile")) return;
        }
        focusFloor(el.getAttribute("data-floor"));
      });
      floorStack.addEventListener("keydown", function (ev) {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        var el = ev.target.closest ? ev.target.closest(".floor") : null;
        if (!el) return;
        ev.preventDefault();
        focusFloor(el.getAttribute("data-floor"));
      });
    }
    var floorCards = $("#floorCards");
    if (floorCards) {
      floorCards.addEventListener("click", function (ev) {
        var say = ev.target.closest ? ev.target.closest("[data-say]") : null;
        if (say) {
          pickAgent(say.getAttribute("data-say"));
          var stage = $("#officeStage");
          if (stage && stage.scrollIntoView) stage.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        var el = ev.target.closest ? ev.target.closest("[data-floor]") : null;
        if (el) focusFloor(el.getAttribute("data-floor"));
      });
    }

    document.addEventListener("click", function (ev) {
      if (!ev.target.closest) return;
      var goto = ev.target.closest("[data-goto]");
      if (goto) setTab(goto.getAttribute("data-goto"));
      var chk = ev.target.closest("[data-check]");
      if (chk) { ev.preventDefault(); toggleCheck(chk.getAttribute("data-check")); return; }
      var dec = ev.target.closest("[data-decide]");
      if (dec) { ev.preventDefault(); setDecision(dec.getAttribute("data-decide"), dec.getAttribute("data-val")); return; }
      var tr = ev.target.closest("[data-track]");
      if (tr) { gotoTrack(tr.getAttribute("data-track")); return; }
      var role = ev.target.closest("[data-role]");
      if (role) { state.role = role.getAttribute("data-role"); haptic(6); renderRoles(); return; }
      var prof = ev.target.closest("[data-profile]");
      if (prof && !ev.target.closest("#floorStack")) openProfile(prof.getAttribute("data-profile"));
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key !== "Enter" && ev.key !== " ") return;
      var prof = ev.target.closest ? ev.target.closest('[role="button"][data-profile]') : null;
      if (prof && !ev.target.closest("#floorStack")) { ev.preventDefault(); openProfile(prof.getAttribute("data-profile")); }
    });

    $("#logList").addEventListener("click", function (ev) {
      var btn = ev.target.closest ? ev.target.closest("[data-logmore]") : null;
      if (!btn) return;
      var list = $("#logList");
      var open = !list.classList.contains("is-expanded");
      list.classList.toggle("is-expanded", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "접기" : "이전 보고 " + (data.reports.length - 5) + "건 더 보기";
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

    var couponList = $("#couponList");
    if (couponList) {
      couponList.addEventListener("click", function (ev) {
        var btn = ev.target.closest ? ev.target.closest("[data-cdone]") : null;
        if (!btn) return;
        ev.preventDefault();
        markCoupon(btn.getAttribute("data-cdone"));
      });
    }

    $("#sheetClose").addEventListener("click", closeSheet);
    $("#sheetBackdrop").addEventListener("click", function (ev) {
      if (ev.target === $("#sheetBackdrop")) closeSheet();
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") closeSheet();
    });

    var topbar = $(".topbar");
    var onScroll = function () {
      if (topbar) topbar.classList.toggle("is-scrolled", window.scrollY > 6);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    bindSheetDrag();

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

  /* 시트를 아래로 끌어내려 닫기 */
  function bindSheetDrag() {
    var sheet = $("#sheet");
    if (!sheet || !window.PointerEvent) return;
    var startY = 0, dy = 0, dragging = false;
    var handles = [$(".sheet-grip"), $(".sheet-head")];
    handles.forEach(function (h) {
      if (!h) return;
      h.addEventListener("pointerdown", function (ev) {
        if (ev.target.closest && ev.target.closest("button")) return;
        dragging = true;
        startY = ev.clientY;
        dy = 0;
        sheet.classList.add("is-dragging");
        sheet.classList.remove("is-settling");
        try { h.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
      });
      h.addEventListener("pointermove", function (ev) {
        if (!dragging) return;
        dy = Math.max(0, ev.clientY - startY);
        sheet.style.transform = "translateY(" + dy + "px)";
      });
      var end = function () {
        if (!dragging) return;
        dragging = false;
        sheet.classList.remove("is-dragging");
        sheet.classList.add("is-settling");
        if (dy > 90) {
          sheet.style.transform = "translateY(100%)";
          window.setTimeout(closeSheet, 200);
        } else {
          sheet.style.transform = "";
        }
      };
      h.addEventListener("pointerup", end);
      h.addEventListener("pointercancel", end);
    });
  }

  function freezeAgentAll() {
    agents.forEach(function (a) {
      window.clearTimeout(a.timer);
      window.clearTimeout(a.waiting);
      a.el.classList.remove("walk");
      a.el.style.transitionDuration = "0s";
      a.el.style.left = a.x + "%";
      a.el.style.top = a.y + "%";
      void a.el.offsetWidth;
      a.el.style.transitionDuration = "";
    });
    if (state.motion) startMotion();
  }

  boot();
})();
