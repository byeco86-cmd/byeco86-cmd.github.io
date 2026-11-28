#!/usr/bin/env python3
"""헤드리스 검증 — 390x844 모바일 화면, 정장 입은 동물 캐릭터 9명(피인턴 포함) 렌더링,
9명 지휘 체계·2F↔3F 교체·층 이름·직급별 책상/의자, 탭 전환, 테마/배경 전환, 수익화 8대 트랙, 콘솔 에러 0건, preview.png 갱신."""
import http.server
import json
import pathlib
import re
import socketserver
import threading

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PORT = 8791
SHOTS = ROOT / ".verify"
SHOTS.mkdir(exist_ok=True)

REQUIRED_LINES = [
    "🛠️ 웹앱 3F 개편", "📣 08:00 통합 브리핑", "🔗 GitHub 동기화",
    "🔍 교차 검증 완료", "💡 아이디어 제안", "💬 전략 조언",
    "🛠️ 코드 리뷰 2건", "📈 X 실시간 트렌드", "👋 연동 대기 중",
]


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        pass


def main():
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("127.0.0.1", PORT), Handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()

    errors = []
    warnings = []
    results = []
    checks = []

    def check(name, ok, detail=""):
        checks.append({"name": name, "ok": bool(ok), "detail": str(detail)[:200]})

    # 소스에 새 직급 명칭이 실제로 들어있는지 / 옛 직급이 남아있지 않은지 (정적)
    appjs = (ROOT / "app.js").read_text(encoding="utf-8")
    indexhtml = (ROOT / "index.html").read_text(encoding="utf-8")
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    for line in REQUIRED_LINES:
        check(f"source_line:{line}", line in appjs, "app.js LINES")
    legacy = ["부대장", "참모", "기획실장", "합류대기",
              "대장", "1호", "2호", "3호", "클로드", "챗지피티", "부실장", "총괄실장", "키사원", "제미사원", "피대리"]
    # README의 v5 개편 표는 옛 직급을 '이전 이름'으로 인용하므로 검사에서 제외합니다.
    readme_ui = re.sub(r"<!-- legacy-titles:start -->.*?<!-- legacy-titles:end -->", "", readme, flags=re.S)
    stale = [w for w in legacy if any(w in s for s in (appjs, indexhtml, readme_ui))]
    check("no_legacy_titles", not stale, stale)

    # ---- data.json 정적 점검 (요일·통계·검증 필드) ----
    import datetime as _dt
    data = json.loads((ROOT / "data.json").read_text(encoding="utf-8"))
    raw_data = (ROOT / "data.json").read_text(encoding="utf-8")
    stale_data = [w for w in legacy if w in raw_data]
    check("no_legacy_titles_data", not stale_data, stale_data)
    check("roster_v9", data["roster"] == "회장님 · 피사장 · 클부장 · 그록 차장 · 지과장 · 제미대리 · 피주임 · 피사원 · 피인턴", data["roster"])
    check("captain_v5", data["captain"] == {"name": "회장님", "badge": "회장님 전용", "office": "바이코 AI 오피스"}, data["captain"])
    V8_IDS = ["captain", "p1", "p0", "p5", "p4", "p3", "p6", "p2", "p7"]
    V8_NAMES = ["회장님", "피사장", "클부장", "그록 차장", "지과장", "제미대리", "피주임", "피사원", "피인턴"]
    V8_ROLES = ["회장", "사장", "부장", "차장", "과장", "대리", "주임", "사원", "인턴"]
    check("chain_v8_order", [c["id"] for c in data["chain"]] == V8_IDS, [c["id"] for c in data["chain"]])
    check("chain_v8_names", [c["name"] for c in data["chain"]] == V8_NAMES, [c["name"] for c in data["chain"]])
    check("chain_v8_roles", [c["role"] for c in data["chain"]] == V8_ROLES, [c["role"] for c in data["chain"]])
    check("team_v8_order", [t["id"] for t in data["team"]] == V8_IDS, [t["id"] for t in data["team"]])
    check("role_members_v8_order", [m["id"] for m in data["roleDetails"]["members"]] == V8_IDS,
          [m["id"] for m in data["roleDetails"]["members"]])
    v5_names = V8_NAMES
    check("gate_owners_v5", all(any(n in o for n in v5_names) for it in data["gates"]["items"] for o in it["owners"]),
          [o for it in data["gates"]["items"] for o in it["owners"]])
    check("track_who_v5", all(any(n in r["who"] for n in v5_names) for t in data["monetization"]["tracks"] for r in t["roles"]),
          [r["who"] for t in data["monetization"]["tracks"] for r in t["roles"]][:8])
    ki = [t for t in data["team"] if t["id"] == "p3"][0]
    check("gemini_daeri", ki["name"] == "제미대리" and ki["role"] == "대리" and ki["floor"] == "2", ki)
    check("gemini_platform", ki.get("handle") == "Gemini" and "gemini.google.com" in ki.get("platform", ""), ki)
    check("gemini_duties", ki.get("duties") == ["리서치·수집", "사전·사후검수", "전략·일정 정리"], ki.get("duties"))
    ki_credit = [a for a in data["credits"]["agents"] if a["id"] == "p3"][0]
    check("gemini_credit", "Gemini" in ki_credit["state"] and "gemini.google.com" in ki_credit["note"], ki_credit)
    pik = [t for t in data["team"] if t["id"] == "p2"][0]
    check("pisa_won", pik["name"] == "피사원" and pik["role"] == "사원" and pik["floor"] == "1"
          and pik["handle"] == "@jei848", pik)
    check("pipeline_v5", [s["owner"] for s in data["pipeline"]] == ["제미대리", "제미대리", "피사원", "제미대리", "클부장"],
          [s["title"] for s in data["pipeline"]])
    captain_team = [t for t in data["team"] if t["id"] == "captain"][0]
    check("captain_character", captain_team["floor"] == "4" and captain_team["role"] == "회장", captain_team)
    check("floor4_agents", [f["agents"] for f in data["floors"] if f["id"] == "4"][0] == ["captain", "p1"],
          [f["agents"] for f in data["floors"] if f["id"] == "4"])
    # ---- 층 이름·배치 (8명 체제 · 2F↔3F 교체) ----
    fl = {f["id"]: f for f in data["floors"]}
    check("floor4_name", fl["4"]["name"] == "회장·사장 기획실" and fl["4"]["short"] == "기획실", fl["4"]["name"])
    check("floor3_name", fl["3"]["name"] == "핵심 실무·개발실" and fl["3"]["short"] == "개발실", fl["3"]["name"])
    check("floor2_name", fl["2"]["name"] == "전략 검수실" and fl["2"]["short"] == "검수실", fl["2"]["name"])
    check("floor1_name", fl["1"]["name"] == "현장 실행·응모 라운지", fl["1"]["name"])
    check("floor3_dev_agents", fl["3"]["agents"] == ["p0", "p5"] and fl["3"]["members"] == "클부장 · 그록 차장", fl["3"])
    check("floor2_check_agents", fl["2"]["agents"] == ["p4", "p3"] and fl["2"]["members"] == "지과장 · 제미대리", fl["2"])
    check("floor1_agents", fl["1"]["agents"] == ["p6", "p2", "p7"] and fl["1"]["members"] == "피주임 · 피사원 · 피인턴", fl["1"])
    check("floor_tones_swap", fl["3"]["tone"] == "blue" and fl["2"]["tone"] == "mint", (fl["3"]["tone"], fl["2"]["tone"]))
    grok = [t for t in data["team"] if t["id"] == "p5"][0]
    check("grok_team", grok["name"] == "그록 차장" and grok["role"] == "차장" and grok["floor"] == "3"
          and grok["handle"] == "Grok", grok)
    intern = [t for t in data["team"] if t["id"] == "p7"][0]
    check("intern_team", intern["name"] == "피인턴" and intern["role"] == "인턴" and intern["floor"] == "1"
          and intern["status"] == "연동 대기", intern)
    check("intern_credit", any(a["id"] == "p7" and a["state"] == "연동 대기" for a in data["credits"]["agents"]),
          [a["id"] for a in data["credits"]["agents"]])
    check("intern_role_detail", any(m["id"] == "p7" and len(m.get("goals", [])) >= 3
                                    for m in data["roleDetails"]["members"]), "피인턴 역할 상세")
    check("floor1_tasks_intern", any("인턴" in t for t in [f for f in data["floors"] if f["id"] == "1"][0]["tasks"]),
          [f for f in data["floors"] if f["id"] == "1"][0]["tasks"])
    juim = [t for t in data["team"] if t["id"] == "p6"][0]
    check("juim_team", juim["name"] == "피주임" and juim["role"] == "주임" and juim["floor"] == "1"
          and juim["status"] == "연동 대기", juim)
    check("grok_credit", any(a["id"] == "p5" and "Grok" in a["note"] for a in data["credits"]["agents"]),
          [a["id"] for a in data["credits"]["agents"]])
    check("juim_credit", any(a["id"] == "p6" and a["state"] == "연동 대기" for a in data["credits"]["agents"]),
          [a["id"] for a in data["credits"]["agents"]])
    check("credits_order_v8", [a["id"] for a in data["credits"]["agents"]] == ["p1", "p0", "p5", "p4", "p3", "p6", "p2", "p7"],
          [a["id"] for a in data["credits"]["agents"]])
    check("bld_sign_v5", "바이코 AI 오피스" in indexhtml, "건물 간판·타이틀")
    check("foot_v9", "바이코 AI 오피스 v9" in indexhtml and "피인턴" in indexhtml, "푸터 9명")
    check("title_v5", "<title>바이코 AI 오피스</title>" in indexhtml, "")
    dow_ko = ["월", "화", "수", "목", "금", "토", "일"]
    for a in data.get("awards", []):
        m, dd = [int(x) for x in a["date"].split("/")]
        real = dow_ko[_dt.date(2026, m, dd).weekday()]
        check(f"award_dow:{a['date']}", a.get("dow") == real, f"{a.get('dow')} vs {real}")
    check("award_dow_auto_in_app", "dowOf(" in appjs, "요일 자동계산 함수")
    trk = data["stats"]["tracking"]
    check("tracking_honest_zero", trk["wins"] == 0 and trk["winRate"] == 0 and trk["expectedValue"] == 0, trk)
    check("pipeline_5", len(data["pipeline"]) == 5, [x["title"] for x in data["pipeline"]])
    packet = data["credits"]["handoffPacket"]["items"]
    check("packet_7", len(packet) == 7, packet)
    dedupe = ([e["dedupeKey"] for e in data["entries"]] +
              [c["dedupeKey"] for c in data["coupons"]] +
              [i["dedupeKey"] for i in data["deals"]["items"]])
    check("dedupe_unique", len(dedupe) == len(set(dedupe)), dedupe)
    bad_ver = [x.get("id") for x in data["entries"] + data["coupons"]
               if not x.get("verification") or x["verification"].get("sourceGrade") not in list("ABCD")]
    check("verification_all", not bad_ver, bad_ver)
    bad_score = [i["id"] for i in data["deals"]["items"]
                 if not isinstance(i.get("score"), int) or not i.get("category")]
    check("deal_score_category", not bad_score, bad_score)
    check("deal_numbers", data["deals"]["definition"]["zero"] + data["deals"]["definition"]["low"]
          == data["deals"]["definition"]["under"], data["deals"]["definition"])
    check("coupon_samsung_path", any(c.get("watchPath") for c in data["coupons"]), "삼성증권 시청 경로")
    check("coupon_efficiency", any(c.get("efficiency") for c in data["coupons"]), "쿠폰 효율 기록란")
    check("routine_slots", len({r.get("slot") for r in data["routine"]}) >= 3, [r.get("slot") for r in data["routine"]])

    # ---- 수익화 8대 트랙 (⑤까지 5개 + ⑥⑦⑧ 신규) ----
    mon = data["monetization"]
    tracks = mon["tracks"]
    check("monetization_8", len(tracks) == 8, [t["no"] + t["short"] for t in tracks])
    check("monetization_title", mon["title"] == "수익화 8대 트랙", mon["title"])
    check("money_label_index", "수익화 8대 트랙" in indexhtml, "index.html 제목")
    check("money_label_app", 'tracks.length + \'대 트랙 예상 월 수익' in appjs, "app.js 합계 라벨")
    check("track_shape", all(
        t.get("monthly", {}).get("basis") and t.get("capital", {}).get("basis")
        and len(t.get("checklist", [])) >= 5 and len(t.get("risks", [])) >= 3
        and t.get("blockers") and t.get("roles") and t.get("decisions")
        for t in tracks), [t["id"] for t in tracks if not t.get("checklist")])
    new_ids = [t["id"] for t in tracks[5:]]
    check("track_new_ids", new_ids == ["t6", "t7", "t8"], new_ids)
    check("track_tones", all(t.get("tone") for t in tracks), [t.get("tone") for t in tracks])
    check("decisions_unique", len({d["id"] for t in tracks for d in t["decisions"]}) ==
          sum(len(t["decisions"]) for t in tracks), "결정 id 중복")

    # ---- ⑤ 멀티 제휴 큐레이터 파이프라인 ----
    t5 = [t for t in tracks if t["id"] == "t5"][0]
    check("t5_title", t5["name"].startswith("멀티 제휴 큐레이터 파이프라인") and "쿠팡" in t5["name"], t5["name"])
    t5_blob = json.dumps(t5, ensure_ascii=False)
    t5_platforms = ["쿠팡 파트너스", "카카오 선물하기", "올리브영 쇼핑 큐레이터", "토스 쉐어링크",
                    "네이버 쇼핑 커넥트", "오늘의집", "워드로브픽", "마이리얼트립"]
    check("t5_platforms", all(p in t5_blob for p in t5_platforms),
          [p for p in t5_platforms if p not in t5_blob])
    check("t5_rates", all(k in t5["monthly"]["basis"] for k in ["9%", "7%", "3%", "5%"]), t5["monthly"]["basis"][:80])
    check("t5_checklist9", len(t5["checklist"]) == 9, len(t5["checklist"]))
    check("t5_priority_decision", "d16" in [x["id"] for x in t5["decisions"]], [x["id"] for x in t5["decisions"]])
    check("t5_readme", all(p in readme for p in ["멀티 제휴 큐레이터", "카카오 선물하기", "토스 쉐어링크", "마이리얼트립"]), "README ⑤ 설명")

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
        )
        # 외부 폰트 CDN(jsdelivr)이 막힌 환경(샌드박스·오프라인)에서도 콘솔 에러 없이 검증되도록,
        # 받아올 수 있으면 그대로 쓰고 실패하면 빈 CSS로 대체합니다.
        def _cdn(route):
            try:
                route.fulfill(response=route.fetch(timeout=8000))
            except Exception:
                route.fulfill(status=200, content_type="text/css", body="/* font cdn offline */")
        page.route("https://cdn.jsdelivr.net/**", _cdn)
        page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}")
                if m.type == "error" else warnings.append(f"{m.type}: {m.text}") if m.type == "warning" else None)
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))

        page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")
        page.wait_for_timeout(1000)

        results.append(("title", page.title()))
        results.append(("h1", page.inner_text("h1")))
        results.append(("tabs", page.locator(".tab").count()))
        results.append(("views", page.locator(".view").count()))
        results.append(("agents", page.locator(".agent").count()))
        results.append(("floors", page.locator(".floor").count()))
        results.append(("clock", page.inner_text("#clockChip")))
        results.append(("body_scroll_w", page.evaluate("document.documentElement.scrollWidth")))
        results.append(("body_client_w", page.evaluate("document.documentElement.clientWidth")))

        # ---- 8명 캐릭터 ----
        agent_ids = page.eval_on_selector_all(
            ".agent", "els => els.map(e => e.getAttribute('data-agent'))")
        results.append(("agent_ids", agent_ids))
        check("agents_9", len(agent_ids) == 9 and sorted(agent_ids) == ["captain", "p0", "p1", "p2", "p3", "p4", "p5", "p6", "p7"], agent_ids)

        tags = page.eval_on_selector_all(
            ".agent .agent-tag", "els => els.map(e => e.textContent.trim())")
        results.append(("agent_tags", tags))
        check("captain_tag", "회장님" in tags, tags)
        check("p0_tag", "클부장" in tags, tags)
        check("p4_tag", "지과장" in tags, tags)
        check("p5_tag", "그록 차장" in tags, tags)
        check("p6_tag", "피주임" in tags, tags)
        tag_style = page.eval_on_selector_all(
            ".agent .agent-tag",
            "els => els.map(e => { const c = getComputedStyle(e); return {id: e.closest('.agent').getAttribute('data-agent'), bg: c.backgroundColor, fg: c.color}; })")
        results.append(("agent_tag_styles", tag_style))
        check("agent_tag_uniform", len({(t["bg"], t["fg"]) for t in tag_style}) == 1,
              [(t["id"], t["bg"], t["fg"]) for t in tag_style])
        check("agent_tag_white", all(t["bg"].startswith("rgba(255, 255, 255") for t in tag_style),
              [t["bg"] for t in tag_style])

        p0_box = page.eval_on_selector(
            '.agent[data-agent="p0"] svg.sprite',
            "el => { const r = el.getBoundingClientRect(); return {w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y)}; }")
        results.append(("p0_sprite_box", p0_box))
        check("p0_sprite_visible", p0_box["w"] > 20 and p0_box["h"] > 20, p0_box)

        p0_svg = page.eval_on_selector('.agent[data-agent="p0"] svg.sprite', "el => el.outerHTML") or ""
        check("p0_crown", "#F2C64E" in p0_svg, "왕관 금색")
        check("p0_badge", "#FBE08C" in p0_svg, "별 배지")
        check("p0_suit", "#2E2C33" in p0_svg, "차콜 정장")
        check("p0_palette", "#C68A5A" in p0_svg, "곰 갈색 털")

        cap_box = page.eval_on_selector(
            '.agent[data-agent="captain"] svg.sprite',
            "el => { const r = el.getBoundingClientRect(); return {w: Math.round(r.width), h: Math.round(r.height)}; }")
        results.append(("captain_sprite_box", cap_box))
        check("captain_sprite_visible", cap_box["w"] > 20 and cap_box["h"] > 20, cap_box)
        cap_svg = page.eval_on_selector('.agent[data-agent="captain"] svg.sprite', "el => el.outerHTML") or ""
        for mark, why in [("#1C1B20", "블랙 쓰리피스"), ("#D4A94A", "골드 넥타이"),
                          ("#F2C64E", "금메달 회장 배지"), ("#8C1B1B", "배지 리본"),
                          ("#E8933F", "호랑이 털"), ("#2E2620", "호랑이 줄무늬"),
                          ("#231A12", "날카로운 눈썹 능선"), ("#FFFDF7", "송곳니"),
                          ("M28 15.6v4", "굵은 이마 줄무늬")]:
            check("captain_mark:" + mark, mark in cap_svg, why)

        # 회장님 +15% · 몸 테두리 황금 아우라 (계산된 스타일로 확인)
        cap_style = page.evaluate("""() => {
          const a = document.querySelector('.agent[data-agent="captain"]');
          const ref = document.querySelector('.agent[data-agent="p1"]');
          const sprite = getComputedStyle(a.querySelector('svg.sprite'));
          const bodyEl = a.querySelector('svg.sprite .sb');
          const body = getComputedStyle(bodyEl);
          const before = getComputedStyle(a, '::before');
          const after = getComputedStyle(a, '::after');
          return {
            w: a.getBoundingClientRect().width, refW: ref.getBoundingClientRect().width,
            h: a.getBoundingClientRect().height, refH: ref.getBoundingClientRect().height,
            filter: body.filter, spriteFilter: sprite.filter,
            shadows: (body.filter.match(/drop-shadow/g) || []).length,
            bodyNodes: bodyEl ? bodyEl.children.length : 0,
            shadowInBody: !!a.querySelector('svg.sprite .sb ellipse.ground-shadow'),
            beforeBg: before.backgroundImage, afterContent: after.content, afterBorderW: after.borderTopWidth,
            bodyAnim: body.animationName
          };
        }""")
        results.append(("captain_style", cap_style))
        check("captain_scale_115", abs(cap_style["w"] / cap_style["refW"] - 1.155) < 0.012
              and abs(cap_style["h"] / cap_style["refH"] - 1.155) < 0.012,
              (round(cap_style["w"] / cap_style["refW"], 4), round(cap_style["h"] / cap_style["refH"], 4)))
        check("captain_aura_body_glow", cap_style["shadows"] >= 4 and "255, 214, 92" in cap_style["filter"]
              and "255, 170, 40" in cap_style["filter"], cap_style["filter"])
        check("captain_aura_rim", "255, 236, 168" in cap_style["filter"], cap_style["filter"])
        check("captain_aura_pulse", cap_style["bodyAnim"] == "captainBodyAura", cap_style["bodyAnim"])
        check("captain_aura_no_ring", cap_style["beforeBg"] == "none" and cap_style["afterContent"] == "none"
              and cap_style["afterBorderW"] == "0px",
              (cap_style["beforeBg"], cap_style["afterContent"], cap_style["afterBorderW"]))
        check("captain_aura_body_only", not cap_style["shadowInBody"] and cap_style["bodyNodes"] > 10,
              (cap_style["shadowInBody"], cap_style["bodyNodes"]))
        check("captain_ground_shadow_keep", "drop-shadow" in cap_style["spriteFilter"], cap_style["spriteFilter"])

        # 다른 캐릭터는 기존 순한 얼굴 그대로 (회장님만 변경)
        p2_svg = page.eval_on_selector('.agent[data-agent="p2"] svg.sprite', "el => el.outerHTML") or ""
        check("p2_face_unchanged", 'rx="2.85" ry="3.1"' in p2_svg and "#231A12" not in p2_svg, "피사원 눈")

        for aid, mark, why in [("p1", "#26344E", "네이비 정장"), ("p1", "#EFBB77", "시바 털"),
                               ("p2", "#2E6FA8", "블루 정장"), ("p2", "#D8E5F2", "토끼 털"),
                               ("p3", "#4FBB9D", "민트 정장"),
                               ("p5", "#1B2330", "딥슬레이트 정장"), ("p5", "#4C525C", "검은 늑대 털"),
                               ("p5", "#38BDF8", "아이스블루 넥타이"), ("p5", "#DCE6F2", "코드 리뷰 안경"),
                               ("p5", "M32.9 47.8l-1.5 1.7", "터미널 </> 배지"),
                               ("p6", "#22364F", "턱시도 네이비 정장"), ("p6", "#2B313A", "펭귄 검은 털"),
                               ("p6", "#F7FAFC", "펭귄 흰 앞면"), ("p6", "#F5A623", "주황 부리·발"),
                               ("p6", "#7FD1F0", "신입 사원증 배지")]:
            svg = page.eval_on_selector(f'.agent[data-agent="{aid}"] svg.sprite', "el => el.outerHTML") or ""
            check(f"{aid}_mark:{mark}", mark in svg, why)

        for aid in ["p5", "p6"]:
            box = page.eval_on_selector(
                f'.agent[data-agent="{aid}"] svg.sprite',
                "el => { const r = el.getBoundingClientRect(); return {w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y)}; }")
            results.append((f"{aid}_sprite_box", box))
            check(f"{aid}_sprite_visible", box["w"] > 20 and box["h"] > 20, box)

        p7_svg = page.eval_on_selector('.agent[data-agent="p7"] svg.sprite', "el => el.outerHTML") or ""
        for mark, why in [("#E9C79A", "햄스터 털"), ("#6C7A8E", "신입 그레이 정장"),
                          ("#3F6EA8", "사원증 목걸이"), ("#F7FAFD", "신입 사원증"),
                          ("#F2B8B4", "햄스터 볼주머니"), ('r="3.8"', "동그란 귀")]:
            check("p7_mark:" + mark, mark in p7_svg, why)
        p7_box = page.eval_on_selector(
            '.agent[data-agent="p7"] svg.sprite',
            "el => { const r = el.getBoundingClientRect(); return {w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y)}; }")
        results.append(("p7_sprite_box", p7_box))
        check("p7_sprite_visible", p7_box["w"] > 20 and p7_box["h"] > 20, p7_box)
        check("p7_tag", "피인턴" in tags, tags)

        # ---- 정장 업그레이드 (호랑이 제외 8명) : 라펠·조끼·커프스 ----
        for aid, mark, why in [("p1", "#40587C", "피크 라펠(사장)"), ("p2", "#4F92CC", "노치 라펠(사원)"),
                               ("p0", "#4A4754", "더블브레스트 라펠(부장)"), ("p5", "#38455A", "슬레이트 라펠(차장)"),
                               ("p4", "#22C79B", "에메랄드 라펠(과장)"), ("p3", "#7ADCC2", "민트 라펠(대리)"),
                               ("p6", "#3B5B80", "숄 라펠 턱시도(주임)"), ("p7", "#9BA9BC", "그레이 라펠(인턴)")]:
            svg = page.eval_on_selector(f'.agent[data-agent="{aid}"] svg.sprite', "el => el.outerHTML") or ""
            check(f"suit_lapel:{aid}", mark in svg, why)
        p1_svg = page.eval_on_selector('.agent[data-agent="p1"] svg.sprite', "el => el.outerHTML") or ""
        check("suit_p1_details", all(k in p1_svg for k in ["#F8F1DE", "#E9C46A", "M26.0 47.2 30.0 47.6"]),
              "포켓스퀘어·금 핀·타이핀")
        p0_svg = page.eval_on_selector('.agent[data-agent="p0"] svg.sprite', "el => el.outerHTML") or ""
        check("suit_p0_double", p0_svg.count('r=".72"') >= 6, "더블브레스트 금단추 6개")
        p5_svg = page.eval_on_selector('.agent[data-agent="p5"] svg.sprite', "el => el.outerHTML") or ""
        check("suit_p5_silver", "#D2DCE6" in p5_svg and "M25.7 46.8 30.3 47.2" in p5_svg, "실버 타이바·핀")

        # ---- 3D 배경 통합 책상 (플랫 SVG 책상 제거 확인 + 배경 이미지 확인) ----
        check("no_flat_desk_units", page.locator(".desk-unit").count() == 0, page.locator(".desk-unit").count())
        desk_css = page.evaluate("() => { const out = {}; document.querySelectorAll('.floor').forEach(f => { const bg = getComputedStyle(f.querySelector('.floor-scene')).backgroundImage; out[f.getAttribute('data-floor')] = bg; }); return out; }")
        results.append(("floor_bg", desk_css))
        check("floor_bg_images", all("floor-" in v for v in desk_css.values()), desk_css)
        import os as _os
        for fn in ["floor-4f.webp", "floor-3f.webp", "floor-2f.webp", "floor-1f.webp",
                   "clay-4f.webp", "clay-3f.webp", "clay-2f.webp", "clay-1f.webp"]:
            fp = ROOT / fn
            check(f"img_size:{fn}", fp.exists() and fp.stat().st_size > 60000, fp.stat().st_size if fp.exists() else "missing")
        # 1F 세 자리 좌우 간격 (겹치지 않게)
        pos1 = page.evaluate("""() => {
          const o = {};
          document.querySelectorAll('.floor[data-floor="1"] .agent').forEach(a => {
            const f = a.closest('.floor').getBoundingClientRect(); const r = a.getBoundingClientRect();
            o[a.getAttribute('data-agent')] = { x: Math.round((r.left + r.width/2 - f.left) / f.width * 100), w: Math.round(r.width) };
          });
          return o;
        }""")
        results.append(("floor1_spacing", pos1))
        xs = sorted([v["x"] for v in pos1.values()])
        check("floor1_wide_spacing", len(xs) == 3 and (xs[1] - xs[0]) >= 15 and (xs[2] - xs[1]) >= 12, xs)
        p4_box = page.eval_on_selector(
            '.agent[data-agent="p4"] svg.sprite',
            "el => { const r = el.getBoundingClientRect(); return {w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y)}; }")
        results.append(("p4_sprite_box", p4_box))
        check("p4_sprite_visible", p4_box["w"] > 20 and p4_box["h"] > 20, p4_box)

        p4_svg = page.eval_on_selector('.agent[data-agent="p4"] svg.sprite', "el => el.outerHTML") or ""
        check("p4_palette", "#10A37F" in p4_svg, "에메랄드 정장")
        check("p4_fur", "#E79451" in p4_svg, "여우 주황 털")
        check("p4_bulb", "#FFE07A" in p4_svg, "전구 배지")
        check("p4_monocle", "#0B3B2E" in p4_svg, "모노클")
        check("p4_note", "#EAFBF4" in p4_svg, "노트 배지")

        # 각 캐릭터가 맵 안(0~100%)에 있는지
        in_stage = page.evaluate("""() => {
          const stage = document.querySelector('#officeStage').getBoundingClientRect();
          return Array.from(document.querySelectorAll('.agent')).map(el => {
            const r = el.getBoundingClientRect();
            const cx = (r.left + r.width / 2 - stage.left) / stage.width * 100;
            const cy = (r.top + r.height - stage.top) / stage.height * 100;
            return { id: el.getAttribute('data-agent'), x: Math.round(cx), y: Math.round(cy) };
          });
        }""")
        results.append(("agent_positions", in_stage))
        check("agents_in_stage", len(in_stage) == 9 and all(0 <= a["x"] <= 100 and 0 <= a["y"] <= 100 for a in in_stage), in_stage)

        # 인원 표기 8명 ON / 로스터
        on_count = page.inner_text("#onCount")
        roster = page.inner_text("#mapRoster")
        results.append(("on_count", on_count))
        results.append(("map_roster", roster))
        check("on_count_9", "9명 ON" in on_count, on_count)
        check("roster_president", "피사장" in roster, roster)
        check("roster_lead", "클부장" in roster, roster)
        check("roster_order", roster.replace(" ", "") == "회장님·피사장·클부장·그록차장·지과장·제미대리·피주임·피사원·피인턴", roster)
        check("no_6myeong", "6명 ON" not in page.inner_text("#view-map") and "8명 ON" not in page.inner_text("#view-map"), "")
        results.append(("map_footnote", page.inner_text("#view-map .foot-note")))

        # ---- 4층 건물 구조 ----
        floor_btns = page.eval_on_selector_all(
            ".floor-btn", "els => els.map(e => ({f: e.getAttribute('data-floor'), t: e.textContent.trim()}))")
        results.append(("floor_buttons", floor_btns))
        check("floor_buttons_5", [b["f"] for b in floor_btns] == ["all", "4", "3", "2", "1"], floor_btns)

        floors = page.eval_on_selector_all(
            ".floor", "els => els.map(e => e.getAttribute('data-floor'))")
        results.append(("floor_order", floors))
        check("floors_4", floors == ["4", "3", "2", "1"], floors)

        assign = page.evaluate("""() => {
          const out = {};
          document.querySelectorAll('.agent').forEach(a => {
            const fl = a.closest('.floor');
            out[a.getAttribute('data-agent')] = fl ? fl.getAttribute('data-floor') : null;
          });
          return out;
        }""")
        results.append(("agent_floors", assign))
        check("floor_assign", assign == {"captain": "4", "p1": "4", "p0": "3", "p5": "3", "p4": "2", "p3": "2", "p6": "1", "p2": "1", "p7": "1"}, assign)

        cards_all = page.eval_on_selector_all(
            "#floorCards .floor-card .fc-name", "els => els.map(e => e.textContent.trim())")
        results.append(("floor_cards_all", cards_all))
        check("floor_cards_all", cards_all == ["회장·사장 기획실", "핵심 실무·개발실", "전략 검수실", "현장 실행·응모 라운지"], cards_all)

        # ---- 클부장·그록 차장·지과장 말풍선이 실제로 뜨는지 (최대 100초 관찰) ----
        seen = {"p0": "", "p4": "", "p5": "", "p6": ""}
        for _ in range(200):
            snap = page.evaluate("""() => {
              const out = {};
              document.querySelectorAll('.agent.talk .bubble').forEach(b => {
                const id = b.closest('.agent').getAttribute('data-agent');
                out[id] = b.textContent.trim();
              });
              return out;
            }""")
            for k in seen:
                if not seen[k] and snap.get(k):
                    seen[k] = snap[k]
            if all(seen.values()):
                break
            page.wait_for_timeout(500)
        results.append(("p0_bubble_seen", seen["p0"]))
        results.append(("p4_bubble_seen", seen["p4"]))
        results.append(("p5_bubble_seen", seen["p5"]))
        results.append(("p6_bubble_seen", seen["p6"]))
        check("p0_talk", bool(seen["p0"]), seen["p0"] or "100초 안에 말풍선 못 봄")
        check("p4_talk", bool(seen["p4"]), seen["p4"] or "100초 안에 말풍선 못 봄")
        check("p5_talk", bool(seen["p5"]), seen["p5"] or "100초 안에 말풍선 못 봄")
        check("p6_talk", bool(seen["p6"]), seen["p6"] or "100초 안에 말풍선 못 봄")
        check("p5_line_set", seen["p5"] in ["🛠️ 코드 리뷰 2건", "📈 X 실시간 트렌드", "🧪 데이터 정합성 확인", "🗂️ 클부장 백업 대기"], seen["p5"])
        check("p4_line_set", seen["p4"] in ["💡 아이디어 제안", "🔍 교차 검증 완료", "💬 전략 조언", "📰 아침 뉴스 브리핑"], seen["p4"])
        page.screenshot(path=str(SHOTS / "01-map-basic.png"))
        for aid in ["captain", "p0", "p1", "p2", "p3", "p4", "p5", "p6", "p7"]:
            try:
                page.locator(f'.agent[data-agent="{aid}"]').screenshot(path=str(SHOTS / f"agent-{aid}.png"))
            except Exception:
                pass
        try:
            page.locator("#officeStage").screenshot(path=str(SHOTS / "01-stage.png"))
        except Exception:
            pass

        # 움직임 확인 (5명 중 최소 2명 위치 변화)
        snap = lambda: page.eval_on_selector_all(
            ".agent", "els => els.map(e => e.style.left + '/' + e.style.top)")
        before = snap()
        page.wait_for_timeout(3000)
        mid = snap()
        page.wait_for_timeout(4000)
        after = snap()
        moved = max(sum(1 for a, b in zip(before, mid) if a != b),
                    sum(1 for a, b in zip(mid, after) if a != b),
                    sum(1 for a, b in zip(before, after) if a != b))
        results.append(("agents_moved", moved))
        check("agents_move", moved >= 2, f"{moved}/8 이동")

        # 클레이 배경
        page.click('.seg-btn[data-style="clay"]')
        page.wait_for_timeout(600)
        results.append(("clay_class", page.get_attribute("#officeStage", "class")))
        check("clay_style", "style-clay" in (page.get_attribute("#officeStage", "class") or ""), "")
        page.screenshot(path=str(SHOTS / "02-map-clay.png"))
        page.click('.seg-btn[data-style="basic"]')
        page.wait_for_timeout(400)

        # 움직임 끄기 → 켜기
        page.click("#motionBtn")
        page.wait_for_timeout(300)
        results.append(("motion_off_label", page.inner_text("#motionLabel")))
        page.click("#motionBtn")
        page.wait_for_timeout(300)
        results.append(("motion_on_label", page.inner_text("#motionLabel")))

        # ---- 층 전환: 4F ----
        page.click('.floor-btn[data-floor="4"]')
        # sceneZoom(1.1s)와 width 전환이 끝난 뒤에 재야 회장님 확대 배율이 정확합니다.
        try:
            page.wait_for_function(
                "() => Math.abs(document.querySelector('.agent[data-agent=\"p1\"]').getBoundingClientRect().width - 66) < 0.6"
                " && Math.abs(document.querySelector('.agent[data-agent=\"captain\"]').getBoundingClientRect().width - 76.2) < 0.6",
                timeout=8000)
        except Exception:
            pass
        page.wait_for_timeout(200)
        focus_4 = page.evaluate("""() => {
          const f4 = document.querySelector('.floor[data-floor="4"]');
          const f3 = document.querySelector('.floor[data-floor="3"]');
          const p1 = document.querySelector('.agent[data-agent="p1"]');
          const cap = document.querySelector('.agent[data-agent="captain"]');
          const capB = document.querySelector('.agent[data-agent="captain"] svg.sprite .sb');
          const vis = {};
          document.querySelectorAll('.agent').forEach(a => { vis[a.getAttribute('data-agent')] = !a.classList.contains('is-hidden'); });
          return {
            f4: f4.className, f3: f3.className,
            h4: Math.round(f4.getBoundingClientRect().height),
            h3: Math.round(f3.getBoundingClientRect().height),
            capW: cap.getBoundingClientRect().width, p1W: p1.getBoundingClientRect().width,
            capAura: getComputedStyle(capB).filter,
            vis: vis,
            talk: p1.classList.contains('talk') ? p1.querySelector('.bubble').textContent.trim() : ''
          };
        }""")
        results.append(("focus_4", focus_4))
        check("floor_focus_4", "is-focus" in focus_4["f4"] and "is-dim" in focus_4["f3"] and focus_4["h4"] > focus_4["h3"] * 2, focus_4)
        check("floor_chip_4", "4F" in page.inner_text("#floorChip"), page.inner_text("#floorChip"))
        check("captain_focus_scale_115", abs(focus_4["capW"] / focus_4["p1W"] - 1.155) < 0.012
              and abs(focus_4["capW"] - 76.2) < 1.5,
              (round(focus_4["capW"], 2), round(focus_4["p1W"], 2)))
        check("captain_focus_aura", "drop-shadow" in focus_4["capAura"] and "255, 170, 40" in focus_4["capAura"],
              focus_4["capAura"])
        check("elevator_4", page.inner_text("#shaftCar") == "4F", page.get_attribute("#shaftCar", "style"))
        check("floor_visible_4", focus_4["vis"] == {"captain": True, "p1": True, "p2": False, "p4": False, "p0": False, "p3": False, "p5": False, "p6": False, "p7": False}, focus_4["vis"])
        check("floor4_bubble", focus_4["talk"] in ["📣 08:00 통합 브리핑", "🗂️ 04:00 전체 상황공유", "🧭 최종 의사결정 대기", "⚡ 크레딧 릴레이 총괄"], focus_4["talk"])
        cards_4 = page.inner_text("#floorCards")
        results.append(("floor_cards_4", cards_4[:220]))
        check("floor_card_4", all(k in cards_4 for k in ["회장·사장 기획실", "기획실", "회장님 · 피사장", "08:00 통합 브리핑", "크레딧 릴레이 총괄"]), cards_4[:140])
        page.screenshot(path=str(SHOTS / "03-floor-4.png"))

        # ---- 회장님 캐릭터 클릭 → 말풍선 + 프로필 ----
        page.click('.floor-btn[data-floor="4"]')
        page.wait_for_timeout(700)
        cap_talk = {"talk": "", "profile": ""}
        for _try in range(3):
            # 다른 캐릭터에 가려지지 않은 회장님 픽셀을 찾아 그 지점을 누릅니다.
            cap_pt = page.evaluate("""() => {
              const a = document.querySelector('.agent[data-agent="captain"]');
              const r = a.getBoundingClientRect();
              for (let fx = 0.2; fx <= 0.8; fx += 0.1) {
                for (let fy = 0.15; fy <= 0.6; fy += 0.1) {
                  const px = r.x + r.width * fx, py = r.y + r.height * fy;
                  const el = document.elementFromPoint(px, py);
                  if (el && el.closest('.agent') === a) return {x: px, y: py};
                }
              }
              return {x: r.x + r.width / 2, y: r.y + r.height / 2};
            }""")
            page.mouse.click(cap_pt["x"], cap_pt["y"])
            page.wait_for_timeout(650)
            cap_talk = page.evaluate("""() => {
              const a = document.querySelector('.agent[data-agent="captain"]');
              const b = a.querySelector('.bubble');
              const prof = document.querySelector('.floor[data-floor="4"] .floor-profile');
              return {talk: a.classList.contains('talk') ? (b ? b.textContent.trim() : '') : '',
                      profile: prof ? prof.textContent.trim().slice(0, 60) : ''};
            }""")
            if cap_talk["talk"] and "회장" in cap_talk["profile"]:
                break
        if not ("회장" in cap_talk["profile"]):
            # 캐릭터가 다른 캐릭터에 가려진 순간이면 층 카드의 '말 걸기'로 같은 동작을 확인합니다.
            page.click('#floorCards [data-say="captain"]')
            page.wait_for_timeout(800)
            cap_talk = page.evaluate("""() => {
              const a = document.querySelector('.agent[data-agent="captain"]');
              const b = a.querySelector('.bubble');
              const prof = document.querySelector('.floor[data-floor="4"] .floor-profile');
              return {talk: a.classList.contains('talk') ? (b ? b.textContent.trim() : '') : '',
                      profile: prof ? prof.textContent.trim().slice(0, 60) : ''};
            }""")
        results.append(("captain_click", cap_talk))
        check("captain_bubble", bool(cap_talk["talk"]), cap_talk["talk"])
        check("captain_profile", "회장" in cap_talk["profile"], cap_talk["profile"])

        # ---- 층 전환: 3F (핵심 실무·개발실 — 클부장 · 그록 차장) ----
        page.click('.floor-btn[data-floor="3"]')
        page.wait_for_timeout(750)
        focus_3 = page.evaluate("""() => {
          const f3 = document.querySelector('.floor[data-floor="3"]');
          const f4 = document.querySelector('.floor[data-floor="4"]');
          const vis = {};
          document.querySelectorAll('.agent').forEach(a => { vis[a.getAttribute('data-agent')] = !a.classList.contains('is-hidden'); });
          const p5 = document.querySelector('.agent[data-agent="p5"]');
          return {f3: f3.className, f4: f4.className, h3: Math.round(f3.getBoundingClientRect().height), h4: Math.round(f4.getBoundingClientRect().height), vis: vis,
                  talk: p5.classList.contains('talk') ? p5.querySelector('.bubble').textContent.trim() : ''};
        }""")
        results.append(("focus_3", focus_3))
        check("floor_focus_3", "is-focus" in focus_3["f3"] and "is-dim" in focus_3["f4"] and focus_3["h3"] > focus_3["h4"] * 2, focus_3)
        check("floor_visible_3", focus_3["vis"] == {"captain": False, "p1": False, "p2": False, "p4": False, "p0": True, "p3": False, "p5": True, "p6": False, "p7": False}, focus_3["vis"])
        check("floor3_bubble", focus_3["talk"] in ["🛠️ 코드 리뷰 2건", "📈 X 실시간 트렌드", "🧪 데이터 정합성 확인", "🗂️ 클부장 백업 대기"], focus_3["talk"])
        cards_3 = page.inner_text("#floorCards")
        results.append(("floor_cards_3", cards_3[:220]))
        check("floor_card_3", all(k in cards_3 for k in ["핵심 실무·개발실", "클부장", "그록 차장", "GitHub 동기화", "코드 리뷰"]), cards_3[:140])
        page.screenshot(path=str(SHOTS / "03-floor-3.png"))

        # ---- 층 전환: 1F ----
        page.click('.floor-btn[data-floor="1"]')
        page.wait_for_timeout(750)
        vis_1 = page.evaluate("""() => {
          const o = {};
          document.querySelectorAll('.agent').forEach(a => { o[a.getAttribute('data-agent')] = !a.classList.contains('is-hidden'); });
          return o;
        }""")
        results.append(("visible_1", vis_1))
        check("floor_visible_1", vis_1 == {"captain": False, "p1": False, "p2": True, "p4": False, "p0": False, "p3": False, "p5": False, "p6": True, "p7": True}, vis_1)
        cards_1 = page.inner_text("#floorCards")
        results.append(("floor_cards_1", cards_1[:220]))
        check("floor_card_1", all(k in cards_1 for k in ["현장 실행·응모 라운지", "피주임", "피사원", "무료 경품·퀴즈 응모 124건+", "0원 쿠폰 줍줍"]), cards_1[:140])
        check("floor_card_1_juim_status", "연동 대기" in cards_1, cards_1[:200])
        page.screenshot(path=str(SHOTS / "03-floor-1.png"))

        # ---- 층 카드에서 2F, 다시 전체 ----
        page.click('#floorCards [data-floor="all"]')
        page.wait_for_timeout(650)
        check("floor_back_all_chip", "전체" in page.inner_text("#floorChip"), page.inner_text("#floorChip"))
        page.click('.floor[data-floor="2"] .floor-scene')
        page.wait_for_timeout(750)
        check("floor_click_2", "is-focus" in (page.get_attribute('.floor[data-floor="2"]', "class") or ""), page.get_attribute('.floor[data-floor="2"]', "class"))
        check("floor_chip_2", "2F" in page.inner_text("#floorChip"), page.inner_text("#floorChip"))
        cards_2 = page.inner_text("#floorCards")
        check("floor_card_2", all(k in cards_2 for k in ["전략 검수실", "지과장", "제미대리", "교차 검증·전략 조언"]), cards_2[:140])
        page.click('.floor-btn[data-floor="all"]')
        page.wait_for_timeout(750)
        all_state = page.evaluate("""() => {
          const dim = document.querySelectorAll('.floor.is-dim').length;
          const focus = document.querySelectorAll('.floor.is-focus').length;
          const vis = {};
          document.querySelectorAll('.agent').forEach(a => { vis[a.getAttribute('data-agent')] = !a.classList.contains('is-hidden'); });
          return {dim: dim, focus: focus, vis: vis};
        }""")
        results.append(("floor_all_state", all_state))
        check("floor_all_reset", all_state["dim"] == 0 and all_state["focus"] == 0 and all(v for v in all_state["vis"].values()), all_state)
        cards_all2 = page.eval_on_selector_all("#floorCards .floor-card .fc-name", "els => els.map(e => e.textContent.trim())")
        check("floor_cards_back", len(cards_all2) == 4, cards_all2)
        check("map_no_hscroll", page.evaluate("document.documentElement.scrollWidth") <= 390, page.evaluate("document.documentElement.scrollWidth"))
        page.screenshot(path=str(SHOTS / "04-map-all.png"))
        page.wait_for_timeout(400)

        # 알림 시트
        page.click("#btnBell")
        page.wait_for_timeout(400)
        results.append(("alerts", page.locator(".alert-item").count()))
        page.screenshot(path=str(SHOTS / "04-alerts.png"))
        page.click("#sheetClose")
        page.wait_for_timeout(300)
        results.append(("badge_hidden", page.get_attribute("#notifBadge", "hidden")))

        # 릴레이 시트
        page.click("#btnRelay")
        page.wait_for_timeout(400)
        results.append(("relay_nodes", page.locator("#sheetBody .relay-node").count()))
        relay_txt = page.inner_text("#sheetBody .relay-chain")
        results.append(("relay_text", relay_txt.replace("\n", " ")))
        check("relay_4_nodes", page.locator("#sheetBody .relay-node").count() == 4, relay_txt)
        check("relay_order_v8", all(k in relay_txt for k in ["피사장", "제미대리", "피사원", "피주임"])
              and "연동 대기" in relay_txt and "합류 대기" not in relay_txt, relay_txt.replace("\n", " "))
        page.click("#sheetClose")

        # 회의실: 지휘 체계 + 팀 카드 5명
        page.click('.tab[data-tab="meeting"]')
        page.wait_for_timeout(500)
        chain_names = page.eval_on_selector_all(
            "#chainStrip .chain-node .cn-name", "els => els.map(e => e.textContent.trim())")
        chain_roles = page.eval_on_selector_all(
            "#chainStrip .chain-node small", "els => els.map(e => e.textContent.trim())")
        team_names = page.eval_on_selector_all(
            "#teamGrid .team-name", "els => els.map(e => e.textContent.trim())")
        results.append(("chain_names", chain_names))
        results.append(("chain_roles", chain_roles))
        results.append(("team_names", team_names))
        check("chain_9", chain_names == ["회장님", "피사장", "클부장", "그록 차장", "지과장", "제미대리", "피주임", "피사원", "피인턴"], chain_names)
        check("chain_roles", chain_roles == ["회장", "사장", "부장", "차장", "과장", "대리", "주임", "사원", "인턴"], chain_roles)
        check("team_9", len(team_names) == 9 and "회장님" in team_names and "클부장" in team_names and "그록 차장" in team_names and "피주임" in team_names and "피인턴" in team_names, team_names)
        check("team_order", team_names == ["회장님", "피사장", "클부장", "그록 차장", "지과장", "제미대리", "피주임", "피사원", "피인턴"], team_names)
        team_txt = page.inner_text("#teamGrid")
        check("team_gemini_rendered", "Gemini" in team_txt, team_txt[:120])
        check("team_grok_rendered", "Grok" in team_txt, team_txt[:120])
        check("team_juim_waiting", "연동 대기" in team_txt, team_txt[:120])
        picker = page.eval_on_selector_all("#rolePicker button", "els => els.map(e => e.textContent.trim())")
        results.append(("role_picker", picker))
        check("role_picker_9", len(picker) == 9, picker)
        results.append(("team_scroll_w", page.evaluate("document.documentElement.scrollWidth")))
        check("meeting_no_hscroll", page.evaluate("document.documentElement.scrollWidth") <= 390, "")
        page.screenshot(path=str(SHOTS / "05-meeting.png"))

        # 탭별
        for tab in ["dash", "cal", "credits", "entries"]:
            page.click(f'.tab[data-tab="{tab}"]')
            page.wait_for_timeout(450)
            visible = page.locator(f'.view[data-view="{tab}"]').is_visible()
            results.append((f"tab_{tab}", visible))
            check(f"tab_{tab}", visible, "")
            page.screenshot(path=str(SHOTS / f"05-{tab}.png"), full_page=False)

        # ---- 추가 기능 검증 (요일 자동계산·점수 정렬·출처 등급·추적·시간대·인계 패킷) ----
        page.click('.tab[data-tab="cal"]')
        page.wait_for_timeout(450)
        award_dates = page.eval_on_selector_all(
            "#awardList .award-date", "els => els.map(e => e.textContent.trim())")
        results.append(("award_dates", award_dates))
        check("award_dates_2026", award_dates[:5] == ["11/30 (월)", "12/1 (화)", "12/2 (수)",
                                                     "12/3 (목)", "12/4 (금)"], award_dates)
        slot_heads = page.eval_on_selector_all(
            "#timeline .slot-head span", "els => els.map(e => e.textContent.trim())")
        results.append(("slot_heads", slot_heads))
        check("routine_slots_rendered", sum(1 for s in slot_heads if any(k in s for k in ["오전", "오후", "저녁"])) >= 3, slot_heads)

        page.click('.tab[data-tab="dash"]')
        page.wait_for_timeout(450)
        track_txt = page.inner_text("#trackGrid")
        results.append(("track_text", track_txt))
        check("track_card", "당첨률 0%" in track_txt and "기대수익" in track_txt, track_txt[:90])
        bar_labels = page.eval_on_selector_all(
            "#dealBars .bar-top span:first-child", "els => els.map(e => e.textContent.trim())")
        results.append(("deal_bar_labels", bar_labels))
        check("deal_bars_3", bar_labels == ["신청 미달", "저자부담 0원", "저자부담 1~3,000원"], bar_labels)
        deal_note = page.inner_text("#dealNote")
        results.append(("deal_note", deal_note))
        check("deal_note_numbers", all(k in deal_note for k in ["44", "26", "24"]), deal_note)
        eff_rows = page.locator("#couponEff .eff-row").count()
        results.append(("coupon_eff_rows", eff_rows))
        check("coupon_eff_rendered", eff_rows == 3, eff_rows)

        page.click('.tab[data-tab="entries"]')
        page.wait_for_timeout(450)
        score_txt = page.eval_on_selector_all(
            "#dealList .dm.score", "els => els.map(e => e.textContent.trim())")
        nums = [int(re.search(r"(\d+)", s).group(1)) for s in score_txt if re.search(r"(\d+)", s)]
        results.append(("deal_scores", score_txt))
        check("deal_sorted_by_score", nums == sorted(nums, reverse=True), score_txt)
        grade_count = page.locator("#view-entries .grade").count()
        results.append(("grade_badges", grade_count))
        check("grade_badges", grade_count >= 10, grade_count)
        statuses = page.eval_on_selector_all(
            "#entryList .status", "els => els.map(e => e.textContent.trim())")
        results.append(("entry_status", statuses[:3]))
        check("entry_status", len(statuses) == 10 and "발표예정" in statuses, statuses[:3])
        page.screenshot(path=str(SHOTS / "05-entries-extra.png"))

        # ---- 수익화 8대 트랙 렌더링 ----
        page.click('.tab[data-tab="money"]')
        page.wait_for_timeout(600)
        chip_n = page.locator("#trackChips .tchip").count()
        track_n = page.locator("#trackList details.track").count()
        results.append(("money_chips", chip_n))
        results.append(("money_tracks", track_n))
        check("money_chips_8", chip_n == 8, chip_n)
        check("money_tracks_8", track_n == 8, track_n)
        money_sum = page.inner_text("#moneySummary")
        results.append(("money_summary", money_sum[:120]))
        check("money_sum_8", "8대 트랙" in money_sum, money_sum[:80])
        money_txt = page.inner_text("#trackList")
        check("money_new_names", all(k in money_txt for k in ["디지털 템플릿", "트렌드 블로그", "위탁판매"]),
              money_txt[:80])
        check("money_t5_curator", all(k in money_txt for k in ["멀티 제휴 큐레이터 파이프라인", "카카오 선물하기", "올리브영",
                                                              "토스 쉐어링크", "마이리얼트립"]), money_txt[:80])
        money_w = page.evaluate("document.documentElement.scrollWidth")
        results.append(("money_scroll_w", money_w))
        check("money_no_hscroll", money_w <= 390, money_w)
        page.screenshot(path=str(SHOTS / "09-money.png"))

        page.click('.tab[data-tab="credits"]')
        page.wait_for_timeout(450)
        packets = page.locator("#packetList .packet-list li").count()
        results.append(("packet_items", packets))
        check("packet_rendered", packets == 7, packets)

        # AI한도: 클로드 부장 카드
        page.click('.tab[data-tab="credits"]')
        page.wait_for_timeout(400)
        credit_names = page.eval_on_selector_all(
            "#creditList .cc-name", "els => els.map(e => e.textContent.trim())")
        credit_notes = page.eval_on_selector_all(
            "#creditList .cc-note", "els => els.map(e => e.textContent.trim())")
        results.append(("credit_names", credit_names))
        results.append(("credit_notes", credit_notes))
        check("credit_8", len(credit_names) == 8 and "클부장" in credit_names and "그록 차장" in credit_names and "피주임" in credit_names and "피인턴" in credit_names, credit_names)
        check("credit_order", credit_names == ["피사장", "클부장", "그록 차장", "지과장", "제미대리", "피주임", "피사원", "피인턴"], credit_names)
        idx0 = credit_names.index("클부장") if "클부장" in credit_names else -1
        p0_note = credit_notes[idx0] if idx0 >= 0 and idx0 < len(credit_notes) else ""
        check("credit_p0_note", "Claude Pro" in p0_note and "GitHub" in p0_note, p0_note)
        idx4 = credit_names.index("지과장") if "지과장" in credit_names else -1
        p4_note = credit_notes[idx4] if idx4 >= 0 and idx4 < len(credit_notes) else ""
        p4_state = page.eval_on_selector_all("#creditList .cc-state", "els => els.map(e => e.textContent.trim())")
        results.append(("credit_states", p4_state))
        check("credit_p4_note", "data.json" in p4_note and "교차 검증" in p4_note, p4_note)
        check("credit_p4_state", "읽기 전용" in (p4_state[idx4] if idx4 >= 0 and idx4 < len(p4_state) else ""), p4_state)
        results.append(("credits_scroll_w", page.evaluate("document.documentElement.scrollWidth")))
        check("credits_no_hscroll", page.evaluate("document.documentElement.scrollWidth") <= 390, "")

        # 메모 저장
        page.click('.tab[data-tab="meeting"]')
        page.wait_for_timeout(300)
        page.fill("#memoInput", "검증용 메모입니다")
        page.click("#btnMemoSave")
        page.wait_for_timeout(300)
        results.append(("memo_saved", page.locator(".memo-item").count()))
        stored = page.evaluate("localStorage.getItem('office.directives')")
        results.append(("memo_ls", bool(stored and "검증용" in stored)))
        page.click(".memo-item .mi-del")
        page.wait_for_timeout(200)
        results.append(("memo_deleted", page.locator(".memo-item").count()))

        # JSON 내보내기
        try:
            with page.expect_download(timeout=5000) as dl:
                page.click("#btnExport")
            download = dl.value
            results.append(("export_name", download.suggested_filename))
            download.save_as(str(SHOTS / "export.json"))
        except Exception as exc:
            results.append(("export_error", str(exc)[:120]))

        # 나이트 테마
        page.click("#btnTheme")
        page.wait_for_timeout(500)
        results.append(("theme", page.get_attribute("html", "data-theme")))
        page.screenshot(path=str(SHOTS / "06-dark.png"))
        page.click("#btnTheme")
        page.wait_for_timeout(300)
        results.append(("theme_back", page.get_attribute("html", "data-theme")))

        # 맵으로 복귀 + 최종 미리보기
        page.click('.tab[data-tab="map"]')
        page.wait_for_timeout(900)
        page.screenshot(path=str(SHOTS / "07-map-final.png"))

        # 테마·배경 저장 확인
        page.click("#btnTheme")
        page.click('.seg-btn[data-style="clay"]')
        page.wait_for_timeout(400)
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(700)
        results.append(("persist_theme", page.get_attribute("html", "data-theme")))
        results.append(("persist_style", page.get_attribute("#officeStage", "class")))

        # 초기 상태로 되돌리고 preview.png 촬영 (클로드 부장 말풍선 우선)
        page.click("#btnTheme")
        page.click('.seg-btn[data-style="basic"]')
        page.wait_for_timeout(1800)
        page.evaluate("window.scrollTo(0,0)")
        try:
            page.wait_for_selector(".agent.talk", timeout=9000)
        except Exception:
            pass
        page.wait_for_timeout(200)
        page.screenshot(path=str(ROOT / "preview.png"))
        results.append(("preview_agents", page.locator("#officeStage .agent").count()))
        check("preview_9_agents", page.locator("#officeStage .agent").count() == 9, "")

        # 데스크톱 폭 확인
        page.set_viewport_size({"width": 1280, "height": 900})
        page.wait_for_timeout(500)
        results.append(("desktop_scroll_w", page.evaluate("document.documentElement.scrollWidth")))
        results.append(("desktop_client_w", page.evaluate("document.documentElement.clientWidth")))
        page.screenshot(path=str(SHOTS / "08-desktop.png"))

        browser.close()

    httpd.shutdown()

    failed = [c for c in checks if not c["ok"]]
    print(json.dumps({
        "results": results,
        "checks": checks,
        "checks_failed": failed,
        "console_errors": errors,
        "console_warnings": warnings[:5],
    }, ensure_ascii=False, indent=2))
    print("CHECKS:", len(checks) - len(failed), "/", len(checks), "passed")
    print("ERRORS:", len(errors))
    if failed:
        print("FAILED:", [c["name"] for c in failed])


if __name__ == "__main__":
    main()
