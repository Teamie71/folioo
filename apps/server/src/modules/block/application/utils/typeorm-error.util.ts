const UNIQUE_VIOLATION_CODE = '23505';

// idx_block_unique_section_per_parent 등 DB partial unique index 위반을 감지한다.
// SECTION_* 생성/이동은 BlockService/BlockCommitService 양쪽에서 각자 write하므로 공용 유틸로 둔다.
export function isUniqueViolation(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('driverError' in error)) {
        return false;
    }

    const driverError = (error as { driverError?: unknown }).driverError;
    if (typeof driverError !== 'object' || driverError === null || !('code' in driverError)) {
        return false;
    }

    return typeof driverError.code === 'string' && driverError.code === UNIQUE_VIOLATION_CODE;
}
