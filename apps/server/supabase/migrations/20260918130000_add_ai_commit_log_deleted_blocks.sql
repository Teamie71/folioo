-- AI 커밋의 블록 삭제를 되돌리기 위한 스냅샷 (삭제된 하위 트리 + 삭제 직전 형제 순서)
ALTER TABLE ai_commit_log ADD COLUMN deleted_blocks JSONB NULL;
