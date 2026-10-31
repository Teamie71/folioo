-- Seed default in-app feedback schema for the FEEDBACK event when feedback_form has no rows yet.
INSERT INTO feedback_form (created_at, updated_at, event_id, schema)
SELECT now(), now(), e.id, $json$
[
  {
    "id": "q1",
    "type": "CHOICE",
    "text": "Folioo를 어떻게 처음 알게 되셨나요?",
    "options": [
      { "id": "opt1", "label": "지인 추천/ 입소문" },
      { "id": "opt2", "label": "인스타그램" },
      { "id": "opt3", "label": "검색 (네이버, 구글 등)" },
      { "id": "opt4", "label": "커뮤니티 (에브리타임, 링크드인 등)" },
      { "id": "opt5", "label": "AI (ChatGPT, Gemini, Claude 등) 추천" }
    ],
    "hasOther": true,
    "otherPlaceholder": "기타 경로를 입력해주세요."
  },
  {
    "id": "q2",
    "type": "CHOICE",
    "text": "만약 오늘부터 Folioo를 더 이상 사용할 수 없게 된다면, 기분이 어떠시겠습니까?",
    "options": [
      { "id": "opt1", "label": "매우 아쉬울 것이다" },
      { "id": "opt2", "label": "조금 아쉬울 것이다" },
      { "id": "opt3", "label": "별로 아쉽지 않을 것이다" },
      { "id": "opt4", "label": "전혀 아쉽지 않을 것이다" }
    ],
    "hasOther": false
  },
  {
    "id": "q2-1",
    "type": "TEXT",
    "text": "그렇게 답변하신 주된 이유는 무엇인가요?",
    "placeholder": "이유를 자유롭게 적어주세요."
  },
  {
    "id": "q3",
    "type": "CHOICE",
    "text": "우리 서비스가 귀하에게 더 완벽해지기 위해, 가장 시급하게 해결해야 할 1순위는 무엇인가요?",
    "options": [
      { "id": "opt1", "label": "작동하지 않거나 멈추는 등 치명적인 오류 수정" },
      { "id": "opt2", "label": "서비스 이용 속도의 향상" },
      { "id": "opt3", "label": "꼭 필요하지만 현재 없는 기능 추가" },
      { "id": "opt4", "label": "UI/UX가 불편하거나 이용법이 어려움" },
      { "id": "opt5", "label": "요금제나 이용 조건의 조정" }
    ],
    "hasOther": true,
    "otherPlaceholder": "기타 의견을 입력해주세요."
  },
  {
    "id": "q3-1",
    "type": "TEXT",
    "text": "위에서 선택한 내용에 대해 조금만 더 자세히 설명해주세요.",
    "placeholder": "구체적인 의견은 서비스 발전에 큰 도움이 됩니다."
  }
]
$json$::jsonb
FROM event e
WHERE e.code = 'FEEDBACK'
  AND NOT EXISTS (SELECT 1 FROM feedback_form);
