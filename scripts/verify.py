#!/usr/bin/env python3
"""헤드리스 검증 — 390x844 모바일 화면, 부대장 클로드·참모 GPT 포함 5명 캐릭터 렌더링,
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
    "📋 총괄 검토", "⚡ 브리핑 조율", "🔗 GitHub 동기화",
    "💡 아이디어 제안", "🔍 교차 검증", "💬 전략 조언",
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

    # 소스에 부대장 말풍선 문구가 실제로 들어있는지 (정적)
    appjs = (ROOT / "app.js").read_text(encoding="utf-8")
    for line in REQUIRED_LINES:
        check(f"source_line:{line}", line in appjs, "app.js LINES")

    # ---- data.json 정적 점검 (요일·통계·검증 필드) ----
    import datetime as _dt
    data = json.loads((ROOT / "data.json").read_text(encoding="utf-8"))
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
        results.append(("zones", page.locator(".zone").count()))
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
        check("p0_tag", "부대장 클로드" in tags, tags)
        check("p4_tag", "참모 GPT" in tags, tags)

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
        check("roster_claude", "부대장 클로드" in roster, roster)
        check("roster_gpt", "참모 GPT" in roster, roster)
        check("roster_order", roster.replace(" ", "") == "부대장클로드·참모GPT·1호기획실장·2호크리부장·3호합류대기", roster)
        check("no_4myeong", "4명 ON" not in page.inner_text("#view-map"), "")
        results.append(("map_footnote", page.inner_text("#view-map .foot-note")))

        # ---- 부대장·참모 말풍선이 실제로 뜨는지 (최대 100초 관찰) ----
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
        check("p4_line_set", seen["p4"] in ["💡 아이디어 제안", "🔍 교차 검증", "💬 전략 조언"], seen["p4"])
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

        # 방 클릭
        page.click('.zone[data-room="command"]')
        page.wait_for_timeout(500)
        results.append(("room_panel_hidden", page.get_attribute("#roomPanel", "hidden")))
        results.append(("room_panel_name", page.inner_text("#rpName")))
        page.screenshot(path=str(SHOTS / "03-room-panel.png"))
        page.click("#rpEnter")
        page.wait_for_timeout(500)
        results.append(("rp_enter_tab", page.locator('.view[data-view="dash"]').is_visible()))
        page.click('.tab[data-tab="map"]')
        page.wait_for_timeout(300)

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
        team_names = page.eval_on_selector_all(
            "#teamGrid .team-name", "els => els.map(e => e.textContent.trim())")
        results.append(("chain_names", chain_names))
        results.append(("team_names", team_names))
        check("chain_6", chain_names == ["대장님", "부대장 클로드", "참모 GPT", "1호", "2호 크리", "3호"], chain_names)
        check("team_5", len(team_names) == 5 and "부대장 클로드" in team_names and "참모 GPT" in team_names, team_names)
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

        # AI한도: 부대장 카드
        page.click('.tab[data-tab="credits"]')
        page.wait_for_timeout(400)
        credit_names = page.eval_on_selector_all(
            "#creditList .cc-name", "els => els.map(e => e.textContent.trim())")
        credit_notes = page.eval_on_selector_all(
            "#creditList .cc-note", "els => els.map(e => e.textContent.trim())")
        results.append(("credit_names", credit_names))
        results.append(("credit_notes", credit_notes))
        check("credit_5", len(credit_names) == 5 and "부대장 클로드" in credit_names and "참모 GPT" in credit_names, credit_names)
        p0_note = credit_notes[0] if credit_notes else ""
        check("credit_p0_note", "Claude Pro" in p0_note and "GitHub" in p0_note, p0_note)
        idx4 = credit_names.index("참모 GPT") if "참모 GPT" in credit_names else -1
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

        # 초기 상태로 되돌리고 preview.png 촬영 (부대장 말풍선 우선)
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
