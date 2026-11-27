# 대장님 AI 오피스

대장님과 부대장 클로드·1호·2호 크리·3호가 함께 보는 모바일 퍼스트 웹앱입니다.
빌드 없이 `index.html` 하나로 열리고, 데이터는 `data.json`(온라인) / `seed.js`(파일 직접 열기)에서 읽습니다.

## 지휘 체계

```
대장님 > 부대장 클로드(총괄) > 1호 기획실장 > 2호 크리 부장 > 3호(합류대기)
```

## 화면

| 탭 | 내용 |
|---|---|
| 🗺️ 맵 | `🏢 기본` / `🧸 클레이` 오피스 배경 전환, `✨ 움직임 ON/OFF`, 3개 방(대회의실·지휘실·응모·핫딜 라운지) 클릭 패널, 부대장 클로드·1·2·3호 캐릭터 이동·말풍선(`📋 총괄 검토` / `⚡ 브리핑 조율` / `🔗 GitHub 동기화`) |
| 💬 회의실 | 지휘 체계, 팀 현황 카드 4명, 5번 3단 검증(리서치 → 검증 → 실행), 최근 보고 로그, 대장님 지시·메모(localStorage + JSON 내보내기) |
| 📊 대시보드 | 누적 응모 124건, 100% 페이백 44건(미달 26건), 0원 쿠폰·앱테크, 가족 집안일·생일 |
| 📅 캘린더 | 매일 루틴(04:00 / 07:20 / 07:45 / 07:50 부대장 검토 / 08:00 / 17:00), 다가오는 당첨 발표, 가족 생일 |
| ⚡ AI한도 | 부대장 클로드(Claude Pro) · 1호 · 2호 · 3호 상태, 크레딧 릴레이 무중단 가동 원칙 |
| 🎟️ 응모/당첨 | 오늘 응모 10건(11/27), 100% 페이백 미달 알짜, 오늘 0원 쿠폰 핵심 |

상단 `🔔 알림`은 오늘 마감·방문 수령·집안일·생일 알람, `⚡ 릴레이`는 크레딧 인계 순서, `☀️/🌙`은 라이트/나이트 테마입니다.

## 파일

```
index.html        화면 뼈대
styles.css        라이트/나이트 테마, 모바일 390px 기준
app.js            탭·맵 이동·말풍선·메모·시트
data.json         화면에 들어가는 모든 데이터 (원본)
seed.js           data.json을 그대로 담은 파일 (file:// 대비, 자동 생성)
office-basic.png  기본 오피스 배경 (1254×1254)
office-clay.png   클레이 오피스 배경 (1254×1254)
manifest.json     PWA 설정
icon-192/512.png  앱 아이콘
scripts/build-seed.py   data.json → seed.js
scripts/verify.py       헤드리스 브라우저 검증(390×844, 캐릭터 4명·탭·테마·콘솔)
```

## 데이터 고치기

1. `data.json`을 고친다.
2. `python3 scripts/build-seed.py`로 `seed.js`를 다시 만든다.
3. `python3 scripts/verify.py`로 화면·콘솔을 확인한다.

## 부대장 클로드 협업 규약 (Claude Pro)

부대장 클로드는 별도 서버나 계정 연동 없이 **GitHub 저장소 공유**로 이 오피스에 합류합니다.
Claude Pro 세션에서 아래 순서만 지키면 대장님 폰에 뜨는 화면이 그대로 갱신됩니다.

1. **읽기** — `https://raw.githubusercontent.com/byeco86-cmd/byeco86-cmd.github.io/main/data.json` 을 읽어 최신 현황(응모·쿠폰·루틴·AI한도)을 파악한다.
2. **고치기** — 저장소의 `data.json`만 수정한다. `index.html`·`app.js`·`styles.css`는 2호 크리 담당이므로 건드리지 않는다.
3. **동기화** — 수정 후 `python3 scripts/build-seed.py`(seed.js 갱신) → `python3 scripts/verify.py`(4명 렌더·콘솔 에러 0건) 를 실행한다.
4. **배포** — `git commit -m "..." && git push origin main`. GitHub Pages가 약 40초 뒤 자동 빌드한다.
5. **확인** — `https://byeco86-cmd.github.io/data.json` 의 `updatedAt`이 방금 시각인지 보고, `https://byeco86-cmd.github.io/` 화면에 반영됐는지 확인한다.
6. **지휘** — 결과는 1호에게 넘기고, 1호가 08:00 통합 브리핑으로 대장님께 보고한다. 대장님 확인 없는 삭제·구조 변경은 하지 않는다.

## 보안

전화번호, 상세 주소, 가족 실명은 이 폴더에 넣지 않습니다. 생일은 `장모님`·`처형` 같은 관계 표기만 씁니다.
메모는 대장님 기기의 localStorage에만 저장되고, `JSON 내보내기`로 직접 내려받을 때만 파일이 생깁니다.

## 열기 · 배포

- 로컬: `secretary-room/index.html`을 브라우저로 연다.
- 폰: 저장소 `byeco86-cmd/byeco86-cmd.github.io` 의 `main` 브랜치에 웹앱 파일을 올리면 `https://byeco86-cmd.github.io/` 에서 열린다. (push 후 40초 안에 빌드)
