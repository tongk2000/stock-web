<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 에이전트 안내

작업 규칙과 폴더로 찾아 들어가는 길은 [CLAUDE.md](CLAUDE.md)에 있다. 소스도 문서도 통째로 읽지 않는다: 폴더마다 `CLAUDE.md`(폴더 안내)가 있고, 기능·API·DB 테이블·설정값은 [docs/INDEX.md](docs/INDEX.md)를 grep한다. 작업을 마치면 [CLAUDE.md](CLAUDE.md)의 '문서에 남기기' 표대로 문서에 남기고, 커밋 전에 `sh tool/check.sh`를 돌린다.

전에 이 파일에 있던 내용(2026-11-22에 옮겼다):

| 있던 것 | 지금 있는 곳 |
| --- | --- |
| 아키텍처, 디렉토리 규약, 즐겨찾기 이중 저장소 | [src/CLAUDE.md](src/CLAUDE.md) |
| 인증 흐름, SEO, `params`는 Promise, 테마 플래시 | [src/app/CLAUDE.md](src/app/CLAUDE.md) |
| 토론방 실시간, 차트 흐름, 스타일링 규약 | [src/components/CLAUDE.md](src/components/CLAUDE.md) |
| 공통 상수, Supabase 클라이언트 선택 | [src/lib/CLAUDE.md](src/lib/CLAUDE.md) |
| 마이그레이션 | [supabase/CLAUDE.md](supabase/CLAUDE.md) |
| 토론 도배 방지 메모 | [docs/decisions.md](docs/decisions.md#토론-도배-방지) |
