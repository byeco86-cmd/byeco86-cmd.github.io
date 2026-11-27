/* 자동 생성 파일입니다. 원본은 data.json — scripts/build-seed.py 로 다시 만듭니다. */
window.SECRETARY_SEED = {
  "version": 2,
  "updatedAt": "2026-11-27T12:44:00+09:00",
  "captain": {
    "name": "대장님",
    "badge": "대장님 전용",
    "office": "대장님 AI 오피스"
  },
  "roster": "부대장 클로드 · 참모 GPT · 1호 기획실장 · 2호 크리 부장 · 3호 합류대기",
  "chain": [
    {
      "id": "captain",
      "name": "대장님",
      "role": "지휘",
      "tone": "captain"
    },
    {
      "id": "p0",
      "name": "부대장 클로드",
      "role": "총괄",
      "tone": "coral"
    },
    {
      "id": "p4",
      "name": "참모 GPT",
      "role": "참모",
      "tone": "mint"
    },
    {
      "id": "p1",
      "name": "1호",
      "role": "기획실장",
      "tone": "clay"
    },
    {
      "id": "p2",
      "name": "2호 크리",
      "role": "부장",
      "tone": "blue"
    },
    {
      "id": "p3",
      "name": "3호",
      "role": "합류대기",
      "tone": "sage"
    }
  ],
  "rooms": [
    {
      "id": "grand",
      "icon": "🏛️",
      "name": "대회의실",
      "desc": "부대장 클로드가 브리핑을 총괄 검토하는 방",
      "tab": "meeting",
      "tabLabel": "회의실 입장",
      "line": "1호 · [08:00] 통합 브리핑 발송 완료",
      "activities": [
        "08:00 1호 → 대장님 통합 브리핑 발송",
        "08:10 부대장 클로드 총괄 검토 · 지시 3건 정리",
        "08:15 2호 아침 보고 도착 · 신규 응모 10건",
        "08:20 참모 GPT 교차 검증 의견 · data.json 대조",
        "오늘 의제 · 3호 검증 게이트 + 참모 GPT 검증 3건"
      ]
    },
    {
      "id": "command",
      "icon": "🩵",
      "name": "지휘실",
      "desc": "부대장 클로드가 1·2·3호에 지시를 나누는 방",
      "tab": "dash",
      "tabLabel": "대시보드 입장",
      "line": "부대장 클로드 · [09:20] 5명 체제 지시 배분 완료",
      "activities": [
        "지휘 체계 · 대장님 > 부대장 클로드 > 1호 > 2호 > 3호 · 참모 GPT 검증",
        "누적 응모 124건 · 11/26 114 + 11/27 10",
        "3단 검증 게이트 · 리서치 → 검증 → 실행",
        "크레딧 릴레이 · 1호 → 2호 → 3호 대기"
      ]
    },
    {
      "id": "lounge",
      "icon": "☕",
      "name": "응모·핫딜 라운지",
      "desc": "쿠폰·핫딜·체험단을 줍는 방",
      "tab": "entries",
      "tabLabel": "응모/당첨 입장",
      "line": "2호 · [07:36] 0원 쿠폰 6종 정리 완료",
      "activities": [
        "오늘 0원 쿠폰 · 금감원 설문 · 삼성증권 16시 라이브",
        "100% 페이백 미달 26건 · 자부담 0원 24건",
        "네이버페이 클릭 적립 최대 840원"
      ]
    }
  ],
  "team": [
    {
      "id": "p0",
      "name": "부대장 클로드",
      "handle": "Claude Pro",
      "role": "부대장",
      "status": "가동 중",
      "color": "coral",
      "note": "총괄 검토 · 브리핑 조율 · GitHub 동기화",
      "duties": [
        "총괄 검토",
        "브리핑 조율",
        "GitHub 동기화"
      ]
    },
    {
      "id": "p4",
      "name": "참모 GPT",
      "handle": "무료 ChatGPT",
      "role": "참모",
      "status": "가동 중",
      "color": "mint",
      "note": "읽기 전용 참모 · 교차 검증 · 추가 아이디어 · 전략 조언",
      "duties": [
        "교차 검증",
        "추가 아이디어",
        "전략 조언"
      ]
    },
    {
      "id": "p1",
      "name": "1호",
      "handle": "@jei90",
      "role": "기획실장",
      "status": "가동 중",
      "color": "clay",
      "note": "기획·총괄 · 08:00 통합 브리핑",
      "duties": [
        "통합 브리핑",
        "가족 생일 8건",
        "지시 정리"
      ]
    },
    {
      "id": "p2",
      "name": "2호 크리",
      "handle": "@jei848",
      "role": "부장",
      "status": "가동 중",
      "color": "blue",
      "note": "이 오피스 운영 · 새벽 응모·쿠폰",
      "duties": [
        "새벽 응모",
        "쿠폰·앱테크",
        "집안일 알람"
      ]
    },
    {
      "id": "p3",
      "name": "3호",
      "handle": "11/27 합류",
      "role": "검증·실행",
      "status": "합류",
      "color": "sage",
      "note": "3단 검증 게이트 담당",
      "duties": [
        "리서치 검증",
        "실행 승인",
        "결과 검수"
      ]
    }
  ],
  "pipeline": [
    {
      "step": "1",
      "title": "리서치",
      "owner": "2호",
      "state": "done",
      "note": "응모 후보·체험단·쿠폰 수집"
    },
    {
      "step": "2",
      "title": "검증",
      "owner": "3호",
      "state": "active",
      "note": "중복·부정참여·자부담 확인"
    },
    {
      "step": "3",
      "title": "실행",
      "owner": "1호 · 3호",
      "state": "wait",
      "note": "승인 후 응모·보고"
    }
  ],
  "reports": [
    {
      "at": "08:20",
      "from": "p4",
      "to": "p1",
      "tag": "교차 검증",
      "text": "data.json을 읽고 오늘 마감 2건과 체험단 미달 26건을 대조했습니다. 추가 아이디어는 1호 검토 뒤 반영해 주세요. 읽기 전용이라 실행은 하지 않습니다."
    },
    {
      "at": "08:15",
      "from": "p2",
      "to": "p1",
      "tag": "아침 보고",
      "text": "신규 무인증 응모 10건 · 당첨 발표 확인 0건 · 0원 쿠폰 6종 · 체험단 44건(미달 26건) 전달했습니다."
    },
    {
      "at": "08:10",
      "from": "p0",
      "to": "p1",
      "tag": "총괄 검토",
      "text": "브리핑 전 건수·지시 대조 마쳤습니다. 5명 체제(부대장 · 참모 GPT · 1호 · 2호 · 3호) 편성을 반영하고 3호 검증 게이트를 최우선으로 올렸습니다."
    },
    {
      "at": "08:00",
      "from": "p1",
      "to": "captain",
      "tag": "통합 브리핑",
      "text": "오늘 처리 10건과 체험단·쿠폰 요약을 하나로 묶어 보고. 3호 검증 게이트 세팅을 오늘 첫 과제로 올렸습니다."
    },
    {
      "at": "07:36",
      "from": "p2",
      "to": "p1",
      "tag": "쿠폰",
      "text": "선착순 0원 쿠폰·앱테크 정리 완료. 금감원 설문은 오늘 마감, 삼성증권 라이브는 16시입니다."
    },
    {
      "at": "04:08",
      "from": "p2",
      "to": "p1",
      "tag": "체험단",
      "text": "리뷰플레이스 90건 · 스타일씨 947건 확인. 자부담 0~3,000원 44건, 미달 26건 추렸습니다."
    },
    {
      "at": "04:03",
      "from": "p2",
      "to": "p1",
      "tag": "당첨",
      "text": "오늘 발표 도래 0건. 가장 이른 발표일은 11/30 4건, 12/1 9건입니다."
    }
  ],
  "stats": {
    "entries": {
      "total": 124,
      "prev": 114,
      "today": 10
    },
    "deals": {
      "total": 44,
      "under": 26,
      "zero": 24,
      "low": 2
    },
    "awards": {
      "today": 0,
      "nextDate": "11/30",
      "nextCount": 4
    },
    "coupons": {
      "zero": 6,
      "quiz": 10,
      "naverPoint": 840
    },
    "home": {
      "done": 0,
      "total": 8
    }
  },
  "entries": [
    {
      "id": "e-01",
      "host": "노사발전재단",
      "title": "2026 적극행정 우수사례 국민참여조사",
      "prize": "모바일 커피쿠폰 5,000원",
      "deadline": "11/27",
      "announce": "공지",
      "url": "https://form.naver.com/response/BwhYx2MCHfY"
    },
    {
      "id": "e-02",
      "host": "노사발전재단",
      "title": "2026 혁신 실행과제 국민참여조사",
      "prize": "모바일 커피쿠폰 5,000원",
      "deadline": "11/27",
      "announce": "공지",
      "url": "https://form.naver.com/response/B5kx1Zw4eZb"
    },
    {
      "id": "e-03",
      "host": "한국수목원정원관리원",
      "title": "SNS채널 만족도 조사 (24문항)",
      "prize": "커피 기프티콘 100명",
      "deadline": "11/27",
      "announce": "공지",
      "url": "https://form.naver.com/response/EAy2sPNruwB"
    },
    {
      "id": "e-04",
      "host": "미추홀구시설관리공단",
      "title": "가치체계 공유도 조사 (외부용)",
      "prize": "모바일 기프티콘 5,000원 10명",
      "deadline": "11/27",
      "announce": "12/4",
      "url": "https://form.naver.com/response/EWE8wZXhZZR"
    },
    {
      "id": "e-05",
      "host": "부산 영도구",
      "title": "SNS 만족도 설문조사",
      "prize": "배달의민족 2만원 20명",
      "deadline": "11/30",
      "announce": "12/4",
      "url": "https://docs.google.com/forms/d/e/1FAIpQLSet7I1zkhbNFEVvQ7IguMATvpcQOePqbcX6XsjjAFRcHe3Nzw/viewform"
    },
    {
      "id": "e-06",
      "host": "산림청",
      "title": "개청 60주년 기념 캐치프레이즈 공모",
      "prize": "3만원 상당 쿠폰 50명",
      "deadline": "11/30 18시",
      "announce": "12월 셋째 주",
      "url": "https://form.naver.com/response/14VjklO69Hq"
    },
    {
      "id": "e-07",
      "host": "전남도박문제예방치유센터",
      "title": "여수 개소 기념 퀴즈",
      "prize": "모바일 기프티콘 추첨",
      "deadline": "12/2 17시",
      "announce": "12/4 이후 개별",
      "url": "https://form.naver.com/response/IhgdAYMLMr5"
    },
    {
      "id": "e-08",
      "host": "충북청소년활동진흥센터",
      "title": "청소년 활동 퀴즈 이벤트",
      "prize": "편의점 5,000원 상품권",
      "deadline": "11/30 18시",
      "announce": "공지",
      "url": "https://form.naver.com/response/8semjCIivVV"
    },
    {
      "id": "e-09",
      "host": "금산군",
      "title": "공식 SNS 만족도 조사 (6페이지)",
      "prize": "삼동이 캘린더·스티커 200명",
      "deadline": "12/4",
      "announce": "12/10",
      "url": "https://form.naver.com/response/1sj76eYNSTI"
    },
    {
      "id": "e-10",
      "host": "서울시 동부권직장맘지원센터",
      "title": "서비스 욕구조사 및 홍보채널 만족도",
      "prize": "음료 쿠폰 300명",
      "deadline": "12/6 23시",
      "announce": "공지",
      "url": "https://form.naver.com/response/KQGTgvaVkib"
    }
  ],
  "deals": {
    "summary": "리뷰플레이스 90건 · 스타일씨 947건 확인 → 조건 충족 44건, 미달 26건",
    "items": [
      {
        "id": "d-01",
        "name": "페토세라 논슬립 포우크림 40ml",
        "platform": "리뷰플레이스",
        "market": "스마트스토어",
        "slots": 16,
        "applied": 0,
        "pay": "0원",
        "deadline": "12-02",
        "url": "https://www.reviewplace.co.kr/pr/?id=323690"
      },
      {
        "id": "d-02",
        "name": "SKY CLIMBER BOOST 액상비료 100ml",
        "platform": "리뷰플레이스",
        "market": "쿠팡",
        "slots": 35,
        "applied": 3,
        "pay": "0원",
        "deadline": "12-01",
        "url": "https://www.reviewplace.co.kr/pr/?id=323015"
      },
      {
        "id": "d-03",
        "name": "SUAN GROWSTALK PRIME 액상비료 500ml",
        "platform": "리뷰플레이스",
        "market": "쿠팡",
        "slots": 15,
        "applied": 3,
        "pay": "0원",
        "deadline": "12-01",
        "url": "https://www.reviewplace.co.kr/pr/?id=323012"
      },
      {
        "id": "d-04",
        "name": "SOMO 고체 탈취제 코지 340g",
        "platform": "리뷰플레이스",
        "market": "스마트스토어",
        "slots": 50,
        "applied": 4,
        "pay": "0원",
        "deadline": "12-07",
        "url": "https://www.reviewplace.co.kr/pr/?id=323796"
      },
      {
        "id": "d-05",
        "name": "티타늄 굽대접 (금빛 반상기)",
        "platform": "스타일씨",
        "market": "구매처 상세 안내",
        "slots": 40,
        "applied": 2,
        "pay": "0원",
        "deadline": "11-29",
        "url": "https://www.stylec.co.kr/trials/166856"
      },
      {
        "id": "d-06",
        "name": "중학 독파민 1단계 (비문학/문학/어휘 택1)",
        "platform": "리뷰플레이스",
        "market": "쿠팡",
        "slots": 24,
        "applied": 5,
        "pay": "0원",
        "deadline": "11-30",
        "url": "https://www.reviewplace.co.kr/pr/?id=323232"
      }
    ]
  },
  "coupons": [
    {
      "id": "c-01",
      "title": "금감원 홈페이지 설문",
      "prize": "1만원 상품권 500명",
      "note": "스벅·배민·네이버페이 택1 · 로그인 없음",
      "deadline": "오늘 11/27 종료",
      "tone": "red",
      "url": "https://kon.kric.com/project/2610028_A/INDEX.asp"
    },
    {
      "id": "c-02",
      "title": "삼성증권 채권투자 유튜브 라이브 OX",
      "prize": "투썸 아메리카노 1,000명",
      "note": "오늘 16:00 라이브 · 17:00 마감 · 폼은 라이브 중 공개",
      "deadline": "오늘 17:00",
      "tone": "red",
      "url": ""
    },
    {
      "id": "c-03",
      "title": "채널카페 AI 전화 체험",
      "prize": "아메리카노 기프티콘 100명",
      "note": "전화 체험 후 문자폼 · 1인 1회",
      "deadline": "~12/2",
      "tone": "green",
      "url": "https://event.channel.io/cafe2026/"
    },
    {
      "id": "c-04",
      "title": "LG U+ 양림동 설문",
      "prize": "메가MGC커피 100명",
      "note": "U+one 앱에서 참여",
      "deadline": "~11/30",
      "tone": "green",
      "url": "https://www.lguplus.com/benefit-event/ongoing/82623"
    },
    {
      "id": "c-05",
      "title": "권리지켜 가입 + 카톡채널",
      "prize": "스타벅스 음료 선착순 850명",
      "note": "소진 시까지 · 발표일까지 채널 유지 필수",
      "deadline": "선착순",
      "tone": "amber",
      "url": "https://allrights.kr/kakao-event/"
    },
    {
      "id": "c-06",
      "title": "네이버페이 클릭 적립",
      "prize": "최대 840원",
      "note": "10시 3건 180원씩 · 11시 180원 · 06시 120원",
      "deadline": "시간대별",
      "tone": "blue",
      "url": "https://point.pay.naver.com"
    }
  ],
  "routine": [
    {
      "time": "04:00",
      "title": "자동응모 · 체험단 · 당첨확인",
      "owner": "2호",
      "note": "오늘 10건 응모 · 체험단 44건 수집 · 발표 확인 0건"
    },
    {
      "time": "07:20",
      "title": "선착순 쿠폰 줍줍",
      "owner": "2호",
      "note": "오늘 07:30:48 시작 → 07:36:20 완료 · 11/28부터 07:20 조정 중"
    },
    {
      "time": "07:45",
      "title": "1호 보고",
      "owner": "2호 → 1호",
      "note": "완료 내역 · 누적 건수 · 스케줄 전달"
    },
    {
      "time": "07:50",
      "title": "부대장 총괄 검토",
      "owner": "부대장 → 1호",
      "note": "브리핑 전 건수·지시 대조 · Claude Pro"
    },
    {
      "time": "08:00",
      "title": "통합 브리핑",
      "owner": "1호 → 대장님",
      "note": "기존 08:30에서 08:00으로 앞당김"
    },
    {
      "time": "17:00",
      "title": "가족 집안일 알람",
      "owner": "2호",
      "note": "청소기 · 세탁 · 아이 책 정리 체크"
    }
  ],
  "awards": [
    {
      "date": "11/30",
      "dow": "일",
      "count": 4,
      "items": [
        "동학농민혁명기념재단 11월 퀴즈 · 네이버페이 1만/30명",
        "대구마을센터 웹진 달팽이 94호 퀴즈 · 커피/15명",
        "한국관광공사 관광두레 테마관 · 네이버페이 5천/200명",
        "전남광주 북구의회 정책퀴즈 · 5천원권/30명"
      ]
    },
    {
      "date": "12/1",
      "dow": "월",
      "count": 9,
      "items": [
        "AI 육아상담소 · AI 진실게임 11월 퀴즈 · 아메리카노 2,000명(문자 발송)",
        "과천시정신건강복지센터 마음톡톡 퀴즈 · 패딩목도리 250명(보건소 방문수령)",
        "괴산군장애인복지관 3차 퀴즈 · CU 80명",
        "식약처 직구 나라의 올바로 · 배민 50명",
        "식약처 수입식품정보마루 퀴즈 · 200명",
        "한국관광공사 DMZ 테마관 · 네이버페이 5천/200명",
        "포천시 영상퀴즈 · 올리브영 1만/100명",
        "농식품정보누리 만족도 · 40명 외"
      ]
    },
    {
      "date": "12/2",
      "dow": "화",
      "count": 4,
      "items": [
        "인천 영상미디어 시민 만족도 · 투썸/50명",
        "국가보훈부 보훈문화 퀴즈 · 100명",
        "한국여성인권진흥원 여성폭력방지 인지도 · 음료/50명",
        "국립축산과학원 축사로 퍼즐 · 투썸 세트/100명"
      ]
    },
    {
      "date": "12/3",
      "dow": "수",
      "count": 6,
      "items": [
        "한국콘텐츠진흥원 공공데이터 수요조사 · 배민 1만/200명",
        "속초시 10대뉴스 투표 · 편의점 3만/100명",
        "한국문화정보원 플랫폼 만족도 · 갤럭시버즈4 등 176명",
        "양산시 우수사례 투표 · 1만/200명",
        "산림청 산림보호 OX · 임산물 꾸러미/100명",
        "한국여성인권진흥원 중앙디지털성범죄피해자지원센터 만족도"
      ]
    },
    {
      "date": "12/4",
      "dow": "목",
      "count": 15,
      "items": [
        "SGIS 통계지도 퀴즈 · 1만/120명",
        "한국소비자원 장보기 퀴즈 · 온누리/200명",
        "문체부 대중문화박물관 수요조사 · 네이버페이 5천/100명",
        "비짓부산 AI 여행코스 · 온누리 1만/30명",
        "대구광역치매센터 퀴즈 · 1만/110명",
        "부산시립도서관 원북원부산 · 커피/200명 외 9건"
      ]
    }
  ],
  "birthdays": [
    {
      "id": "b-01",
      "name": "장모님",
      "kind": "음력",
      "origin": "11/23",
      "solar": "2026-12-31",
      "alarm": "2026-12-24"
    },
    {
      "id": "b-02",
      "name": "처형",
      "kind": "양력",
      "origin": "2/11",
      "solar": "2027-02-11",
      "alarm": "2027-02-04"
    },
    {
      "id": "b-03",
      "name": "아빠",
      "kind": "음력",
      "origin": "1/16",
      "solar": "2027-02-22",
      "alarm": "2027-02-15"
    },
    {
      "id": "b-04",
      "name": "장인어른",
      "kind": "양력",
      "origin": "5/6",
      "solar": "2027-05-06",
      "alarm": "2027-04-29"
    },
    {
      "id": "b-05",
      "name": "가족 A",
      "kind": "양력",
      "origin": "10/6",
      "solar": "2027-10-06",
      "alarm": "2027-09-29"
    },
    {
      "id": "b-06",
      "name": "가족 B",
      "kind": "양력",
      "origin": "10/13",
      "solar": "2027-10-13",
      "alarm": "2027-10-06"
    },
    {
      "id": "b-07",
      "name": "형님",
      "kind": "양력",
      "origin": "10/17",
      "solar": "2027-10-17",
      "alarm": "2027-10-10"
    },
    {
      "id": "b-08",
      "name": "엄마",
      "kind": "음력",
      "origin": "9/28",
      "solar": "2027-10-27",
      "alarm": "2027-10-20"
    }
  ],
  "chores": [
    {
      "id": "d-01",
      "text": "아침·저녁 스킨십 (허그 · 뽀뽀)"
    },
    {
      "id": "d-02",
      "text": "대화 시간 늘리기"
    },
    {
      "id": "d-03",
      "text": "청소기 (거실 · 방 전체)"
    },
    {
      "id": "d-04",
      "text": "아이 책 · 장난감 정리"
    },
    {
      "id": "d-05",
      "text": "식세기 · 싱크대 정리"
    },
    {
      "id": "d-06",
      "text": "세탁기 · 건조 · 빨래개기"
    },
    {
      "id": "d-07",
      "text": "아이 혼자 노는 시간 만들기"
    },
    {
      "id": "d-08",
      "text": "아이 교육 (한글 · 시계 · 영어)"
    }
  ],
  "credits": {
    "agents": [
      {
        "id": "p0",
        "state": "정상 가동",
        "tone": "green",
        "note": "Claude Pro · GitHub 저장소 공유 연동 · 08:10 총괄 검토 완료",
        "today": "4건"
      },
      {
        "id": "p4",
        "state": "읽기 전용 · 무료 웹",
        "tone": "read",
        "note": "data.json 링크 열람 · 교차 검증 · 추가 아이디어 · 전략 조언",
        "today": "—"
      },
      {
        "id": "p1",
        "state": "정상 가동",
        "tone": "green",
        "note": "08:00 통합 브리핑 완료 · 다음은 지시 정리",
        "today": "3건"
      },
      {
        "id": "p2",
        "state": "정상 가동",
        "tone": "green",
        "note": "04:00 응모·체험단 + 07:30 쿠폰 루틴 완료",
        "today": "12건"
      },
      {
        "id": "p3",
        "state": "합류 · 세팅",
        "tone": "amber",
        "note": "검증 게이트 세팅 중 · 실행 승인 전",
        "today": "0건"
      }
    ],
    "rule": "한쪽 크레딧이 소진돼 작업이 멈추면, 남은 작업과 기준선을 다음 피클에게 바로 인계합니다.",
    "rules": [
      "인계 기준선 · 작업 목록 · 판단 기준 · 진행률을 한 번에 넘긴다",
      "순서 · 1호 → 2호 → 3호, 3호 소진 시 다시 1호",
      "인계 시점 판단은 부대장 클로드가 총괄 검토로 확정한다",
      "인계 즉시 이 오피스의 AI한도 판에 상태를 바꾼다",
      "멈춘 일은 다음 실행에서 이어받아 처음부터 다시 하지 않는다"
    ]
  },
  "alerts": [
    {
      "id": "a-01",
      "tone": "red",
      "title": "오늘 마감 2건",
      "body": "금감원 설문(1만원·500명) 오늘 종료 · 삼성증권 라이브 17:00 마감",
      "when": "11/27"
    },
    {
      "id": "a-02",
      "tone": "amber",
      "title": "12/1 과천 패딩목도리",
      "body": "당첨 시 과천시보건소 방문 수령 · 12/1 발표 9건 중 하나",
      "when": "12/1"
    },
    {
      "id": "a-03",
      "tone": "green",
      "title": "17:00 가족 집안일 알람",
      "body": "청소기 · 세탁 · 아이 책 정리 체크",
      "when": "매일"
    },
    {
      "id": "a-04",
      "tone": "muted",
      "title": "12/24 장모님 생일 알람",
      "body": "음력 11/23 · 생신 12/31 · 08:30 알람 등록됨",
      "when": "12/24"
    }
  ]
};
