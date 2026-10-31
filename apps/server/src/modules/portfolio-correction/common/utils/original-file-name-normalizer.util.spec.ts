import { normalizeOriginalFileName } from './original-file-name-normalizer.util';

describe('normalizeOriginalFileName', () => {
    it('strips directory segments and control characters', () => {
        expect(normalizeOriginalFileName('C:\\fakepath\\folioo\u0000-report.pdf')).toBe(
            'folioo-report.pdf'
        );
    });

    it('caps file name length to 255 while preserving extension when possible', () => {
        const longBase = 'a'.repeat(300);
        const result = normalizeOriginalFileName(`${longBase}.pdf`);

        expect(result.length).toBe(255);
        expect(result.endsWith('.pdf')).toBe(true);
    });
});
