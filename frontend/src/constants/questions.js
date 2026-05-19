export const QUESTIONS = [
  // text 전용 (0-14)
  { text: "오늘 청산면 날씨는 어때요?",                        type: "text" },
  { text: "청산면에서 가장 좋아하는 계절은?",                   type: "text" },
  { text: "청산면 살면서 제일 좋은 점은?",                      type: "text" },
  { text: "청산면에서 불편한 점이 있다면?",                     type: "text" },
  { text: "청산면에 새로 생겼으면 하는 시설은?",                type: "text" },
  { text: "청산면에 이사 온 지 얼마나 됐어요?",                 type: "text" },
  { text: "요즘 가장 자주 가는 곳은 어디예요?",                 type: "text" },
  { text: "청산면에서 새로 시작하고 싶은 일이 있나요?",         type: "text" },
  { text: "일하면서 가장 보람 있는 순간은?",                    type: "text" },
  { text: "청산면에 새로 이사 온 분께 한마디 해준다면?",        type: "text" },
  { text: "청산면을 방문한 관광객에게 꼭 추천하고 싶은 것은?", type: "text" },
  { text: "오늘 이웃과 나눈 이야기가 있나요?",                  type: "text" },
  { text: "요즘 즐겨 듣는 노래는?",                            type: "text" },
  { text: "쉬는 날 청산면에서 뭐 하세요?",                     type: "text" },
  { text: "오늘 청산면 이웃에게 전하고 싶은 말은?",            type: "text" },
  // media 전용 (15-22)
  { text: "오늘 청산면에서 찍은 사진 한 장 올려주세요!",       type: "media" },
  { text: "요즘 청산면에서 제일 예쁜 곳 찍어주세요",           type: "media" },
  { text: "오늘 밥상 사진 올려주세요",                         type: "media" },
  { text: "내가 좋아하는 청산면 풍경은?",                      type: "media" },
  { text: "요즘 농사 현장 사진 올려주세요",                    type: "media" },
  { text: "청산면 숨은 명소 사진 올려주세요",                  type: "media" },
  { text: "오늘 수확한 것 자랑해주세요!",                      type: "media" },
  { text: "청산면 봄/여름/가을/겨울 사진 한 장",               type: "media" },
  // both 가능 (23-29)
  { text: "청산면에서 제일 맛있는 집은 어디예요?",             type: "both" },
  { text: "요즘 밥상에 자주 오르는 제철 재료는?",              type: "both" },
  { text: "직접 키우거나 만드는 음식이 있나요?",               type: "both" },
  { text: "청산면 하면 떠오르는 것은?",                        type: "both" },
  { text: "청산면에 생겼으면 하는 음식점은?",                  type: "both" },
  { text: "청산면에서 꼭 가봐야 할 곳은?",                     type: "both" },
  { text: "오늘 어떤 일을 하셨나요?",                          type: "both" },
];

export function getTodayQuestion() {
  const idx = Math.floor(Date.now() / 86400000) % 30;
  return { ...QUESTIONS[idx], index: idx };
}
