from datetime import datetime, timezone, timedelta, date

from app.models.models import HanMadiQuestion

KST = timezone(timedelta(hours=9))


def get_question_for_date(questions: list, target_date: date) -> HanMadiQuestion:
    """주어진 날짜에 해당하는 한마디 질문을 순환 배정으로 찾는다."""
    if not questions:
        return None
    days_since_epoch = (target_date - date(2024, 1, 1)).days
    idx = days_since_epoch % len(questions)
    return questions[idx]


def get_today_question(db) -> HanMadiQuestion:
    """오늘(KST) 날짜에 해당하는 한마디 질문을 조회한다."""
    questions = db.query(HanMadiQuestion).filter(HanMadiQuestion.is_active == True).order_by(HanMadiQuestion.order_index).all()
    return get_question_for_date(questions, datetime.now(KST).date())
