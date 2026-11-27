#!/usr/bin/env python3
"""data.json → seed.js

file:// 로 index.html을 바로 열 때 fetch('data.json')이 막히므로,
같은 내용을 seed.js(window.SECRETARY_SEED)로 미리 넣어 둡니다.
data.json을 고친 뒤 이 스크립트를 실행하세요.

    python3 scripts/build-seed.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((ROOT / "data.json").read_text(encoding="utf-8"))
body = json.dumps(data, ensure_ascii=False, indent=2)
header = "/* 자동 생성 파일입니다. 원본은 data.json — scripts/build-seed.py 로 다시 만듭니다. */\n"
(ROOT / "seed.js").write_text(header + "window.SECRETARY_SEED = " + body + ";\n", encoding="utf-8")
print("seed.js 갱신 완료:", len(body), "bytes")
