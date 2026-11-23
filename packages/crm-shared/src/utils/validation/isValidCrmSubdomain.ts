import { SUBDOMAIN_PATTERN } from '@/constants/SubdomainPattern';

export const isValidCrmSubdomain = (subdomain: string): boolean => {
  return SUBDOMAIN_PATTERN.test(subdomain);
};
