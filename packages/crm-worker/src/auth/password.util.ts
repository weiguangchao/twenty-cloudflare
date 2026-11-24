import { compare, hash } from 'bcryptjs';

import { apiError } from '@/shared/errors/api-error.util';

export const hashPassword = async (password: string) => {
  if (password.length < 8 || password.length > 50) {
    throw apiError('Password must be between 8 and 50 characters');
  }

  return hash(password, 10);
};

export const verifyPassword = compare;
