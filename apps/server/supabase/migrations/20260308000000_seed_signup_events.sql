INSERT INTO "event" (
    "code", "title", "description", "cta_text", "cta_link", 
    "reward_config", "goal_config", "ui_config", "ops_config", 
    "start_date", "end_date", "is_active", "max_participation", "display_order"
) VALUES 
(
    'SIGNUP_OBT_W1',
    'OBT 1주차 특별 웰컴 보상',
    'OBT 1주차에 가입하신 분들께 경험치 티켓 2장과 포트폴리오 첨삭 티켓 6장을 드립니다!',
    '보상 받기',
    NULL,
    '[{"type": "EXPERIENCE", "quantity": 2}, {"type": "PORTFOLIO_CORRECTION", "quantity": 6}]'::jsonb,
    NULL, NULL, NULL,
    '2026-03-08', '2026-03-15', true, 1, 1
),
(
    'SIGNUP_OBT_W2',
    'OBT 2주차 특별 웰컴 보상',
    'OBT 2주차에 가입하신 분들께 경험치 티켓 2장과 포트폴리오 첨삭 티켓 6장을 드립니다!',
    '보상 받기',
    NULL,
    '[{"type": "EXPERIENCE", "quantity": 2}, {"type": "PORTFOLIO_CORRECTION", "quantity": 6}]'::jsonb,
    NULL, NULL, NULL,
    '2026-03-16', '2026-03-22', true, 1, 2
),
(
    'SIGNUP_REGULAR',
    '신규 가입 웰컴 보상',
    '환영합니다! 가입 기념으로 경험치 티켓 1장과 포트폴리오 첨삭 티켓 1장을 드립니다.',
    '보상 받기',
    NULL,
    '[{"type": "EXPERIENCE", "quantity": 1}, {"type": "PORTFOLIO_CORRECTION", "quantity": 1}]'::jsonb,
    NULL, NULL, NULL,
    '2026-03-23', NULL, true, 1, 3
)
ON CONFLICT ("code") DO UPDATE SET 
    "title" = EXCLUDED."title",
    "description" = EXCLUDED."description",
    "reward_config" = EXCLUDED."reward_config",
    "start_date" = EXCLUDED."start_date",
    "end_date" = EXCLUDED."end_date",
    "is_active" = EXCLUDED."is_active";