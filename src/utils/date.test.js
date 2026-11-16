import { formatDate, formatDateRange } from './date';

describe('formatDate', () => {
    test.each([
        ['2025-05', '05/2025'],
        ['2026-07-22', '07/2026'],
        ['2012', '2012'],
        [null, ''],
    ])('%s -> "%s"', (input, expected) => {
        expect(formatDate(input)).toBe(expected);
    });
});

describe('formatDateRange', () => {
    test('start and end', () => expect(formatDateRange('2019-04', '2022-03')).toBe('04/2019 - 03/2022'));
    test('open-ended shows "present"', () => expect(formatDateRange('2025-05', null)).toBe('05/2025 - present'));
    test('single completion date', () => expect(formatDateRange(null, '2012')).toBe('2012'));
});
