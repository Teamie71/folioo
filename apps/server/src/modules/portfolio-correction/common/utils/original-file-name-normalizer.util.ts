export function normalizeOriginalFileName(value: string): string {
    const decodeLatin1 = (input: string): string => Buffer.from(input, 'latin1').toString('utf8');
    const once = decodeLatin1(value);
    const twice = decodeLatin1(once);

    const hasHangul = (input: string): boolean =>
        /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(input);
    const score = (input: string): number => {
        const matched = input.match(/[ÃÂáâãð�\u0080-\u009F]/g);
        return matched ? matched.length : 0;
    };

    const candidates = [value, once, twice]
        .filter((candidate) => !candidate.includes('�'))
        .map((candidate) => candidate.normalize('NFC'));
    if (candidates.length === 0) {
        return value.normalize('NFC');
    }

    const uniqueCandidates = [...new Set(candidates)];
    const withHangul = uniqueCandidates.filter((candidate) => hasHangul(candidate));
    const pool = withHangul.length > 0 ? withHangul : uniqueCandidates;

    const selected = pool.reduce((best, current) =>
        score(current) < score(best) ? current : best
    );

    const normalized = selected.normalize('NFC');
    const baseName = normalized.split(/[\\/]/).pop() ?? normalized;
    const withoutControlChars = Array.from(baseName)
        .filter((char) => {
            const code = char.codePointAt(0) ?? 0;
            return !(code <= 0x1f || code === 0x7f);
        })
        .join('')
        .trim();

    if (!withoutControlChars) {
        return 'upload.pdf';
    }

    const MAX_FILE_NAME_LENGTH = 255;
    if (withoutControlChars.length <= MAX_FILE_NAME_LENGTH) {
        return withoutControlChars;
    }

    const extensionIndex = withoutControlChars.lastIndexOf('.');
    const hasExtension = extensionIndex > 0 && extensionIndex < withoutControlChars.length - 1;
    if (!hasExtension) {
        return withoutControlChars.slice(0, MAX_FILE_NAME_LENGTH);
    }

    const extension = withoutControlChars.slice(extensionIndex);
    const baseNameMaxLength = MAX_FILE_NAME_LENGTH - extension.length;
    if (baseNameMaxLength <= 0) {
        return withoutControlChars.slice(0, MAX_FILE_NAME_LENGTH);
    }

    return withoutControlChars.slice(0, extensionIndex).slice(0, baseNameMaxLength) + extension;
}
