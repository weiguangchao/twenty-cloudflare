import { isValidCrmSubdomain } from '@/utils/validation/isValidCrmSubdomain';

describe('isValidCrmSubdomain', () => {
  describe('valid subdomains', () => {
    it('should accept standard alphanumeric subdomains', () => {
      expect(isValidCrmSubdomain('abc')).toBe(true);
      expect(isValidCrmSubdomain('test123')).toBe(true);
      expect(isValidCrmSubdomain('company1')).toBe(true);
      expect(isValidCrmSubdomain('workspace2024')).toBe(true);
    });

    it('should accept subdomains with hyphens in the middle', () => {
      expect(isValidCrmSubdomain('my-company')).toBe(true);
      expect(isValidCrmSubdomain('test-workspace')).toBe(true);
      expect(isValidCrmSubdomain('multi-word-subdomain')).toBe(true);
      expect(isValidCrmSubdomain('a-b-c-d-e')).toBe(true);
    });

    it('should accept minimum length subdomains (1 character)', () => {
      expect(isValidCrmSubdomain('a')).toBe(true);
      expect(isValidCrmSubdomain('1')).toBe(true);
      expect(isValidCrmSubdomain('ab')).toBe(true);
      expect(isValidCrmSubdomain('a-b')).toBe(true);
    });

    it('should accept maximum length subdomains (30 characters)', () => {
      const exactly30 = 'a' + 'b'.repeat(28) + 'c';

      expect(exactly30.length).toBe(30);
      expect(isValidCrmSubdomain(exactly30)).toBe(true);
    });

    it('should accept numeric-only subdomains', () => {
      expect(isValidCrmSubdomain('123')).toBe(true);
      expect(isValidCrmSubdomain('456789')).toBe(true);
      expect(isValidCrmSubdomain('1-2-3')).toBe(true);
    });
  });

  describe('invalid subdomains', () => {
    it('should reject empty strings', () => {
      expect(isValidCrmSubdomain('')).toBe(false);
    });

    it('should reject subdomains longer than 30 characters', () => {
      const tooLong = 'a'.repeat(31);

      expect(isValidCrmSubdomain(tooLong)).toBe(false);
    });

    it('should reject subdomains starting with a hyphen', () => {
      expect(isValidCrmSubdomain('-test')).toBe(false);
      expect(isValidCrmSubdomain('-abc')).toBe(false);
    });

    it('should reject subdomains ending with a hyphen', () => {
      expect(isValidCrmSubdomain('test-')).toBe(false);
      expect(isValidCrmSubdomain('abc-')).toBe(false);
    });

    it('should reject subdomains with uppercase letters', () => {
      expect(isValidCrmSubdomain('Test')).toBe(false);
      expect(isValidCrmSubdomain('MyCompany')).toBe(false);
      expect(isValidCrmSubdomain('WORKSPACE')).toBe(false);
    });

    it('should reject subdomains with special characters', () => {
      expect(isValidCrmSubdomain('test@company')).toBe(false);
      expect(isValidCrmSubdomain('my_workspace')).toBe(false);
      expect(isValidCrmSubdomain('test.company')).toBe(false);
      expect(isValidCrmSubdomain('workspace#1')).toBe(false);
    });

    it('should reject subdomains with spaces', () => {
      expect(isValidCrmSubdomain('test company')).toBe(false);
      expect(isValidCrmSubdomain(' test')).toBe(false);
      expect(isValidCrmSubdomain('test ')).toBe(false);
    });

    it('should reject subdomains starting with "api-"', () => {
      expect(isValidCrmSubdomain('api-test')).toBe(false);
      expect(isValidCrmSubdomain('api-company')).toBe(false);
      expect(isValidCrmSubdomain('api-123')).toBe(false);
    });

    it('should accept subdomains containing "api" not as prefix', () => {
      expect(isValidCrmSubdomain('myapi')).toBe(true);
      expect(isValidCrmSubdomain('rapid')).toBe(true);
    });

    it('should reject subdomains with only hyphens', () => {
      expect(isValidCrmSubdomain('---')).toBe(false);
      expect(isValidCrmSubdomain('----')).toBe(false);
    });

    it('should reject whitespace-only strings', () => {
      expect(isValidCrmSubdomain('   ')).toBe(false);
      expect(isValidCrmSubdomain('\t')).toBe(false);
      expect(isValidCrmSubdomain('\n')).toBe(false);
    });

    it('should reject unicode characters', () => {
      expect(isValidCrmSubdomain('café')).toBe(false);
      expect(isValidCrmSubdomain('tëst')).toBe(false);
    });
  });
});
