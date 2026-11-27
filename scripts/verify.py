#!/usr/bin/env python3
"""헤드리스 검증 — 390x844 모바일 화면, 클로드 부장·챗지피티 과장 포함 5명 캐릭터 렌더링,
탭 전환, 테마/배경 전환, 콘솔 에러 0건, preview.png 갱신."""
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
    "🛠️ 웹앱 4층 개편", "📣 08:00 통합 브리핑", "🔗 GitHub 동기화",
    "🔍 교차 검증 완료", "💡 아이디어 제안", "💬 전략 조언",
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
    legacy = ["부대장", "참모", "기획실장", "합류대기"]
    stale = [w for w in legacy if any(w in s for s in (appjs, indexhtml, readme))]
    check("no_legacy_titles", not stale, stale)

    # ---- data.json 정적 점검 (요일·통계·검증 필드) ----
    import datetime as _dt
    data = json.loads((ROOT / "data.json").read_text(encoding="utf-8"))
    raw_data = (ROOT / "data.json").read_text(encoding="utf-8")
    stale_data = [w for w in legacy if w in raw_data]
    check("no_legacy_titles_data", not stale_data, stale_data)
    check("roster_new", data["roster"] == "1호 총괄실장 · 2호 크리 부실장 · 챗지피티 과장 · 클로드 부장 · 3호 대리", data["roster"])
    check("chain_new_order", [c["id"] for c in data["chain"]] == ["captain", "p1", "p2", "p0", "p4", "p3"], [c["id"] for c in data["chain"]])
    check("chain_new_roles", [c["role"] for c in data["chain"]] == ["대표", "총괄실장", "부실장", "부장", "과장", "대리"], [c["role"] for c in data["chain"]])
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

        # ---- 5명 캐릭터 ----
        agent_ids = page.eval_on_selector_all(
            ".agent", "els => els.map(e => e.getAttribute('data-agent'))")
        results.append(("agent_ids", agent_ids))
        check("agents_5", len(agent_ids) == 5 and agent_ids.count("p0") == 1 and agent_ids.count("p4") == 1, agent_ids)

        tags = page.eval_on_selector_all(
            ".agent .agent-tag", "els => els.map(e => e.textContent.trim())")
        results.append(("agent_tags", tags))
        check("p0_tag", "클로드 부장" in tags, tags)
        check("p4_tag", "챗지피티 과장" in tags, tags)

        p0_box = page.eval_on_selector(
            '.agent[data-agent="p0"] svg.sprite',
            "el => { const r = el.getBoundingClientRect(); return {w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y)}; }")
        results.append(("p0_sprite_box", p0_box))
        check("p0_sprite_visible", p0_box["w"] > 20 and p0_box["h"] > 20, p0_box)

        p0_svg = page.eval_on_selector('.agent[data-agent="p0"] svg.sprite', "el => el.outerHTML") or ""
        check("p0_crown", "#F2C64E" in p0_svg, "왕관 금색")
        check("p0_badge", "#FBE08C" in p0_svg, "별 배지")
        check("p0_palette", "#E09272" in p0_svg, "코랄/테라코타 몸통")

        p4_box = page.eval_on_selector(
            '.agent[data-agent="p4"] svg.sprite',
            "el => { const r = el.getBoundingClientRect(); return {w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y)}; }")
        results.append(("p4_sprite_box", p4_box))
        check("p4_sprite_visible", p4_box["w"] > 20 and p4_box["h"] > 20, p4_box)

        p4_svg = page.eval_on_selector('.agent[data-agent="p4"] svg.sprite', "el => el.outerHTML") or ""
        check("p4_palette", "#10A37F" in p4_svg, "에메랄드 몸통")
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
        check("agents_in_stage", len(in_stage) == 5 and all(0 <= a["x"] <= 100 and 0 <= a["y"] <= 100 for a in in_stage), in_stage)

        # 인원 표기 5명 ON / 로스터
        on_count = page.inner_text("#onCount")
        roster = page.inner_text("#mapRoster")
        results.append(("on_count", on_count))
        results.append(("map_roster", roster))
        check("on_count_5", "5명 ON" in on_count, on_count)
        check("roster_claude", "클로드 부장" in roster, roster)
        check("roster_gpt", "챗지피티 과장" in roster, roster)
        check("roster_order", roster.replace(" ", "") == "1호총괄실장·2호크리부실장·챗지피티과장·클로드부장·3호대리", roster)
        check("no_4myeong", "4명 ON" not in page.inner_text("#view-map"), "")
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
        check("floor_assign", assign == {"p1": "4", "p2": "3", "p4": "3", "p0": "2", "p3": "1"}, assign)

        cards_all = page.eval_on_selector_all(
            "#floorCards .floor-card .fc-name", "els => els.map(e => e.textContent.trim())")
        results.append(("floor_cards_all", cards_all))
        check("floor_cards_all", len(cards_all) == 4 and "대표·총괄 지휘실" in cards_all, cards_all)

        # ---- 클로드 부장·챗지피티 과장 말풍선이 실제로 뜨는지 (최대 100초 관찰) ----
        seen = {"p0": "", "p4": ""}
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
        check("p0_talk", bool(seen["p0"]), seen["p0"] or "100초 안에 말풍선 못 봄")
        check("p4_talk", bool(seen["p4"]), seen["p4"] or "100초 안에 말풍선 못 봄")
        check("p4_line_set", seen["p4"] in ["💡 아이디어 제안", "🔍 교차 검증 완료", "💬 전략 조언", "📰 아침 뉴스 브리핑"], seen["p4"])
        page.screenshot(path=str(SHOTS / "01-map-basic.png"))
        for aid in ["p0", "p1", "p2", "p3", "p4"]:
            try:
                page.locator(f'.agent[data-agent="{aid}"]').screenshot(path=str(SHOTS / f"agent-{aid}.png"))
            except Exception:
                pass
        try:
            page.locator("#officeStage").screenshot(path=str(SHOTS / "01-stage.png"))
        except Exception:
            pass

        # 움직임 확인 (5명 중 최소 2명 위치 변화)
        before = page.eval_on_selector_all(
            ".agent", "els => els.map(e => e.style.left + '/' + e.style.top)")
        page.wait_for_timeout(7000)
        after = page.eval_on_selector_all(
            ".agent", "els => els.map(e => e.style.left + '/' + e.style.top)")
        moved = sum(1 for a, b in zip(before, after) if a != b)
        results.append(("agents_moved", moved))
        check("agents_move", moved >= 2, f"{moved}/5 이동")

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
        page.wait_for_timeout(750)
        focus_4 = page.evaluate("""() => {
          const f4 = document.querySelector('.floor[data-floor="4"]');
          const f3 = document.querySelector('.floor[data-floor="3"]');
          const p1 = document.querySelector('.agent[data-agent="p1"]');
          const vis = {};
          document.querySelectorAll('.agent').forEach(a => { vis[a.getAttribute('data-agent')] = !a.classList.contains('is-hidden'); });
          return {
            f4: f4.className, f3: f3.className,
            h4: Math.round(f4.getBoundingClientRect().height),
            h3: Math.round(f3.getBoundingClientRect().height),
            vis: vis,
            talk: p1.classList.contains('talk') ? p1.querySelector('.bubble').textContent.trim() : ''
          };
        }""")
        results.append(("focus_4", focus_4))
        check("floor_focus_4", "is-focus" in focus_4["f4"] and "is-dim" in focus_4["f3"] and focus_4["h4"] > focus_4["h3"] * 2, focus_4)
        check("floor_chip_4", "4F" in page.inner_text("#floorChip"), page.inner_text("#floorChip"))
        check("elevator_4", page.inner_text("#shaftCar") == "4F", page.get_attribute("#shaftCar", "style"))
        check("floor_visible_4", focus_4["vis"] == {"p1": True, "p2": False, "p4": False, "p0": False, "p3": False}, focus_4["vis"])
        check("floor4_bubble", focus_4["talk"] in ["📣 08:00 통합 브리핑", "🗂️ 04:00 전체 상황공유", "🧭 최종 의사결정 대기", "⚡ 크레딧 릴레이 총괄"], focus_4["talk"])
        cards_4 = page.inner_text("#floorCards")
        results.append(("floor_cards_4", cards_4[:220]))
        check("floor_card_4", all(k in cards_4 for k in ["대표·총괄 지휘실", "대장님 대표", "08:00 통합 브리핑", "크레딧 릴레이 총괄"]), cards_4[:140])
        page.screenshot(path=str(SHOTS / "03-floor-4.png"))

        # ---- 층 전환: 3F ----
        page.click('.floor-btn[data-floor="3"]')
        page.wait_for_timeout(750)
        focus_3 = page.evaluate("""() => {
          const f3 = document.querySelector('.floor[data-floor="3"]');
          const f4 = document.querySelector('.floor[data-floor="4"]');
          const vis = {};
          document.querySelectorAll('.agent').forEach(a => { vis[a.getAttribute('data-agent')] = !a.classList.contains('is-hidden'); });
          const p4 = document.querySelector('.agent[data-agent="p4"]');
          return {f3: f3.className, f4: f4.className, h3: Math.round(f3.getBoundingClientRect().height), h4: Math.round(f4.getBoundingClientRect().height), vis: vis,
                  talk: p4.classList.contains('talk') ? p4.querySelector('.bubble').textContent.trim() : ''};
        }""")
        results.append(("focus_3", focus_3))
        check("floor_focus_3", "is-focus" in focus_3["f3"] and "is-dim" in focus_3["f4"] and focus_3["h3"] > focus_3["h4"] * 2, focus_3)
        check("floor_visible_3", focus_3["vis"] == {"p1": False, "p2": True, "p4": True, "p0": False, "p3": False}, focus_3["vis"])
        check("floor3_bubble", focus_3["talk"] in ["🔍 교차 검증 완료", "💬 전략 조언 3건", "📰 아침 뉴스 브리핑", "🩺 의료기기 브리핑"], focus_3["talk"])
        cards_3 = page.inner_text("#floorCards")
        results.append(("floor_cards_3", cards_3[:220]))
        check("floor_card_3", all(k in cards_3 for k in ["전략·검수·기획실", "2호 크리 부실장", "챗지피티 과장", "교차 검증·전략 조언"]), cards_3[:140])
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
        check("floor_visible_1", vis_1 == {"p1": False, "p2": False, "p4": False, "p0": False, "p3": True}, vis_1)
        cards_1 = page.inner_text("#floorCards")
        results.append(("floor_cards_1", cards_1[:220]))
        check("floor_card_1", all(k in cards_1 for k in ["현장 실행·응모 라운지", "3호 대리", "무료 경품·퀴즈 응모 124건+", "0원 쿠폰 줍줍"]), cards_1[:140])
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
        check("floor_card_2", all(k in cards_2 for k in ["핵심 실무·개발실", "클로드 부장", "GitHub 동기화"]), cards_2[:140])
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
        check("chain_6", chain_names == ["대장님", "1호", "2호 크리", "클로드", "챗지피티", "3호"], chain_names)
        check("chain_roles", chain_roles == ["대표", "총괄실장", "부실장", "부장", "과장", "대리"], chain_roles)
        check("team_5", len(team_names) == 5 and "클로드 부장" in team_names and "챗지피티 과장" in team_names, team_names)
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
        check("credit_5", len(credit_names) == 5 and "클로드 부장" in credit_names and "챗지피티 과장" in credit_names, credit_names)
        p0_note = credit_notes[0] if credit_notes else ""
        check("credit_p0_note", "Claude Pro" in p0_note and "GitHub" in p0_note, p0_note)
        idx4 = credit_names.index("챗지피티 과장") if "챗지피티 과장" in credit_names else -1
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
        check("preview_5_agents", page.locator("#officeStage .agent").count() == 5, "")

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
