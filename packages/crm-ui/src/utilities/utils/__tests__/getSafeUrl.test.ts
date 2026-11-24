import { getSafeUrl } from '../getSafeUrl';

describe('getSafeUrl', () => {
  it('returns safe absolute urls unchanged', () => {
    expect(getSafeUrl('https://example.com')).toBe('https://example.com');
    expect(getSafeUrl('http://example.com')).toBe('http://example.com');
    expect(getSafeUrl('mailto:hello@example.com')).toBe(
      'mailto:hello@example.com',
    );
    expect(getSafeUrl('tel:+33123456789')).toBe('tel:+33123456789');
  });

  it('keeps relative paths', () => {
    expect(getSafeUrl('/settings/profile')).toBe('/settings/profile');
  });

  it('prepends https to scheme-less urls', () => {
    expect(getSafeUrl('example.com')).toBe('https://example.com');
  });

  it('rejects scheme-relative urls that leave the current origin', () => {
    expect(getSafeUrl('//evil.com')).toBeUndefined();
    expect(getSafeUrl('/\\evil.com')).toBeUndefined();
    expect(getSafeUrl('/\\\\evil.com')).toBeUndefined();
    expect(getSafeUrl('/\\/evil.com')).toBeUndefined();
    expect(getSafeUrl('/\t\\evil.com')).toBeUndefined();
  });

  it('rejects dangerous schemes', () => {
    expect(getSafeUrl('javascript:alert(1)')).toBeUndefined();
    expect(getSafeUrl('JavaScript:alert(1)')).toBeUndefined();
    expect(
      getSafeUrl('data:text/html,<script>alert(1)</script>'),
    ).toBeUndefined();
    expect(getSafeUrl('vbscript:msgbox(1)')).toBeUndefined();
  });

  it('returns undefined for empty or nullish values', () => {
    expect(getSafeUrl('')).toBeUndefined();
    expect(getSafeUrl('   ')).toBeUndefined();
    expect(getSafeUrl(undefined)).toBeUndefined();
    expect(getSafeUrl(null)).toBeUndefined();
  });
});
