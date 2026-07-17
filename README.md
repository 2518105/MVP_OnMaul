# 온마을 (ON-Maul) MVP

옥천군 청산면 이주민을 위한 지역 커뮤니티 웹앱

## 폴더 구조

```
mvp/
├── backend/          # Python FastAPI 서버
│   ├── app/
│   │   ├── models/   # DB 모델 (SQLAlchemy)
│   │   ├── routers/  # API 라우터
│   │   ├── auth.py   # JWT 인증
│   │   ├── database.py
│   │   └── seed.py   # 초기 데이터
│   ├── data/
│   │   └── bus_schedules.json  # 버스 시간표
│   ├── main.py
│   └── requirements.txt
└── frontend/         # React + Vite + Tailwind
    └── src/
        ├── pages/
        │   ├── Board/   # 게시판
        │   ├── Bus/     # 버스 정보
        │   ├── Admin/   # 행정 캘린더
        │   └── Auth/    # 로그인·회원가입
        └── api/         # API 클라이언트
```

## 실행 방법

### 백엔드 (터미널 1)

```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

- API 문서: http://localhost:8000/docs
- 관리자 계정: `admin` / `onmaul2026!`

### 프론트엔드 (터미널 2)

```bash
cd frontend
npm install
npm run dev
```

- 앱 주소: http://localhost:5173

## API 엔드포인트

| 기능 | 메서드 | 경로 |
|------|--------|------|
| 회원가입 | POST | /api/auth/register |
| 로그인 | POST | /api/auth/login |
| 게시글 목록 | GET | /api/posts?category=농사정보 |
| 게시글 작성 | POST | /api/posts |
| 댓글 작성 | POST | /api/posts/{id}/comments |
| 좋아요 | POST | /api/posts/{id}/like |
| 정류장 목록 | GET | /api/bus/stops |
| 시간표+투표 | GET | /api/bus/stops/{id} |
| O/X 투표 | POST | /api/bus/schedules/{id}/vote |
| 노선 목록 | GET | /api/bus/routes |
| 공지사항 | GET | /api/admin/notices |
| 공지 작성 (관리자) | POST | /api/admin/notices |
| 캘린더 일정 | GET | /api/admin/calendar |
| 회의록 목록 | GET | /api/admin/meetings |
| 이벤트 로깅 | POST | /api/events |

## 사용자 유형

| 유형 | 설명 | 권한 |
|------|------|------|
| 이주민 | 귀농·귀촌 이주민 | 게시글 작성, 댓글, 좋아요 |
| 주민 | 청산면 기존 주민 | 동일 |
| 관리자 | 운영자 | 캘린더 일정 등록 추가 |

## MVP 검증 지표

UX Spec 기준 이벤트 로깅 20개 구현 (`/api/events`에 자동 기록)

- `post_created`, `post_viewed`, `comment_created`, `like_added`
- `bus_tab_open`, `stop_viewed`, `bus_vote_yes`, `bus_vote_no`
- `onboarding_bus_start`, `onboarding_bus_complete`, `onboarding_bus_skip`
- `schedule_clicked`, `council_tab_click`, `council_detail_open`
- `tab_view`, `app_open`

## 버스 데이터 추가 방법

`backend/data/bus_schedules.json` 파일에 정류장과 시간표를 추가하고
DB 파일(`onmaul.db`)을 삭제 후 서버를 재시작하면 새 데이터가 로드됩니다.
