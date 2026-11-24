import { normalizeDomain } from '@/utils/url/normalizeDomain';

describe('normalizeDomain', () => {
  it.each([
    'example.com',
    'EXAMPLE.com',
    'www.example.com',
    'https://example.com',
    'https://www.example.com/',
    'http://www.Example.com/careers?utm=1#team',
    '  https://example.com  ',
    'example.com.',
    'example.com:8080',
    'https://user:secret@www.example.com',
    'ftp://example.com',
  ])('should reduce %s to the bare domain', (rawDomain) => {
    expect(normalizeDomain(rawDomain)).toBe('example.com');
  });

  it('should keep subdomains other than www', () => {
    expect(normalizeDomain('https://blog.example.com')).toBe(
      'blog.example.com',
    );
  });

  it('should fold an internationalized domain onto its punycode spelling', () => {
    expect(normalizeDomain('münchen.de')).toBe('xn--mnchen-3ya.de');
    expect(normalizeDomain('https://München.de')).toBe('xn--mnchen-3ya.de');
    expect(normalizeDomain('xn--mnchen-3ya.de')).toBe('xn--mnchen-3ya.de');
  });

  it('should read a backslash as a path separator, like a browser does', () => {
    expect(normalizeDomain('example.com\\@evil.com')).toBe('example.com');
    expect(normalizeDomain('https://example.com\\evil.com/x')).toBe(
      'example.com',
    );
  });

  it('should drop every user info segment', () => {
    expect(normalizeDomain('https://a@b@example.com')).toBe('example.com');
  });

  it('should strip every repeated www label and trailing dot in one pass', () => {
    expect(normalizeDomain('www.www.example.com')).toBe('example.com');
    expect(normalizeDomain('example.com..')).toBe('example.com');
  });

  it.each([
    'example.com',
    'https://www.example.com/careers?x=1',
    'www.www.example.com',
    'example.com..',
    'münchen.de',
    'not a domain',
    '',
  ])('should already be normalized after one pass for %s', (rawDomain) => {
    const normalized = normalizeDomain(rawDomain);

    expect(normalizeDomain(normalized)).toBe(normalized);
  });

  it('should return an empty string for an empty value', () => {
    expect(normalizeDomain('')).toBe('');
  });

  it('should hand back something unparseable rather than throwing', () => {
    expect(normalizeDomain('not a domain')).toBe('not a domain');
  });
});
