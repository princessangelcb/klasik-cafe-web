const URL_PATTERN = /(?:\b[a-z][a-z\d+.-]*:\S*|\bwww\.)|(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z]{2,}(?:[/:?#]\S*)?/i;

export function isValidPassword(value) {
    return typeof value === 'string'
        && value.length >= 8
        && !/\s/.test(value)
        && /[A-Za-z]/.test(value)
        && /\d/.test(value)
        && !URL_PATTERN.test(value);
}
