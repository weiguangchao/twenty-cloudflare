import { isValidDomain } from '@/utils/url/isValidDomain';

describe('isValidDomain', () => {
  it.each([
    'example.com',
    'https://www.example.com/careers?x=1',
    'blog.example.com',
    'twenty.co.uk',
    'münchen.de',
    'example.com.',
    'example.com:8080',
  ])('should accept %s', (rawDomain) => {
    expect(isValidDomain(rawDomain)).toBe(true);
  });

  it.each([
    'not a domain',
    'twenty',
    'javascript:alert(1)',
    '<script>',
    'localhost',
    '192.168.1.1',
    '',
  ])('should reject %s', (rawDomain) => {
    expect(isValidDomain(rawDomain)).toBe(false);
  });

  it('should judge a backslash host the way a browser reads it', () => {
    expect(isValidDomain('example.com\\@evil.com')).toBe(true);
    expect(isValidDomain('example.com\\@not a domain')).toBe(true);
  });
});
