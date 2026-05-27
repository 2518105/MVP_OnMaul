-- ============================================================
-- 온마을 한마디 기능 Supabase 스키마
-- Supabase > SQL Editor 에서 순서대로 실행하세요.
-- ============================================================

-- 1. 오늘의 질문 목록
CREATE TABLE IF NOT EXISTS daily_questions (
    id          SERIAL PRIMARY KEY,
    text        TEXT    NOT NULL,
    answer_type TEXT    NOT NULL CHECK (answer_type IN ('text', 'media', 'both')),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 날짜별 질문 배정 (관리자가 직접 배정; 없으면 sort_order % 전체 수 로 자동 결정)
CREATE TABLE IF NOT EXISTS daily_question_schedule (
    id             SERIAL PRIMARY KEY,
    question_id    INTEGER NOT NULL REFERENCES daily_questions(id) ON DELETE CASCADE,
    scheduled_date DATE    NOT NULL UNIQUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 답변
CREATE TABLE IF NOT EXISTS daily_answers (
    id              BIGSERIAL PRIMARY KEY,
    question_id     INTEGER NOT NULL REFERENCES daily_questions(id) ON DELETE CASCADE,
    user_id         INTEGER NOT NULL,                        -- SQLite users.id 참조 (FK 없음)
    author_nickname TEXT    NOT NULL,                        -- 비정규화: 조인 없이 표시
    author_type     TEXT    NOT NULL CHECK (author_type IN ('이주민', '주민', '관리자')),
    content         TEXT,
    media_url       TEXT,
    help_count      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_answers_question_id ON daily_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_daily_answers_user_id     ON daily_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_answers_created_at  ON daily_answers(created_at DESC);

-- 4. 반응 (좋아요 + 댓글)
CREATE TABLE IF NOT EXISTS answer_reactions (
    id         BIGSERIAL PRIMARY KEY,
    answer_id  BIGINT NOT NULL REFERENCES daily_answers(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL,
    type       TEXT   NOT NULL CHECK (type IN ('like', 'comment')),
    content    TEXT,                                         -- 댓글 내용 (좋아요는 NULL)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_answer_reactions_answer_id ON answer_reactions(answer_id);
-- 같은 답변에 같은 유저가 좋아요 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS unique_answer_like
    ON answer_reactions(answer_id, user_id)
    WHERE type = 'like';

-- ============================================================
-- Row Level Security
-- 백엔드는 service_role 키를 사용하므로 RLS 자동 우회됨.
-- anon 키로 직접 조회하는 클라이언트를 위해 읽기 정책만 추가.
-- ============================================================
ALTER TABLE daily_questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_question_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_answers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_reactions        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "공개 읽기" ON daily_questions         FOR SELECT USING (true);
CREATE POLICY "공개 읽기" ON daily_question_schedule FOR SELECT USING (true);
CREATE POLICY "공개 읽기" ON daily_answers           FOR SELECT USING (true);
CREATE POLICY "공개 읽기" ON answer_reactions        FOR SELECT USING (true);

-- ============================================================
-- 초기 질문 데이터
-- ============================================================
INSERT INTO daily_questions (text, answer_type, sort_order) VALUES
-- text 전용 (0-14)
('오늘 청산면 날씨는 어때요?',                        'text',  0),
('청산면에서 가장 좋아하는 계절은?',                   'text',  1),
('청산면 살면서 제일 좋은 점은?',                      'text',  2),
('청산면에서 불편한 점이 있다면?',                     'text',  3),
('청산면에 새로 생겼으면 하는 시설은?',                'text',  4),
('청산면에 이사 온 지 얼마나 됐어요?',                 'text',  5),
('요즘 가장 자주 가는 곳은 어디예요?',                 'text',  6),
('청산면에서 새로 시작하고 싶은 일이 있나요?',         'text',  7),
('일하면서 가장 보람 있는 순간은?',                    'text',  8),
('청산면에 새로 이사 온 분께 한마디 해준다면?',        'text',  9),
('청산면을 방문한 관광객에게 꼭 추천하고 싶은 것은?',  'text', 10),
('오늘 이웃과 나눈 이야기가 있나요?',                  'text', 11),
('요즘 즐겨 듣는 노래는?',                            'text', 12),
('쉬는 날 청산면에서 뭐 하세요?',                     'text', 13),
('오늘 청산면 이웃에게 전하고 싶은 말은?',             'text', 14),
-- media 전용 (15-22)
('오늘 청산면에서 찍은 사진 한 장 올려주세요!',        'media', 15),
('요즘 청산면에서 제일 예쁜 곳 찍어주세요',            'media', 16),
('오늘 밥상 사진 올려주세요',                         'media', 17),
('내가 좋아하는 청산면 풍경은?',                      'media', 18),
('요즘 농사 현장 사진 올려주세요',                    'media', 19),
('청산면 숨은 명소 사진 올려주세요',                  'media', 20),
('오늘 수확한 것 자랑해주세요!',                      'media', 21),
('청산면 봄/여름/가을/겨울 사진 한 장',               'media', 22),
-- both 가능 (23-29)
('청산면에서 제일 맛있는 집은 어디예요?',              'both', 23),
('요즘 밥상에 자주 오르는 제철 재료는?',               'both', 24),
('직접 키우거나 만드는 음식이 있나요?',                'both', 25),
('청산면 하면 떠오르는 것은?',                        'both', 26),
('청산면에 생겼으면 하는 음식점은?',                   'both', 27),
('청산면에서 꼭 가봐야 할 곳은?',                     'both', 28),
('오늘 어떤 일을 하셨나요?',                          'both', 29)
ON CONFLICT DO NOTHING;
