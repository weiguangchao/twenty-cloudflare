import { z } from 'zod';

import { CurrencyCode } from 'crm-shared/constants';

export const currencyCodeSchema = z.enum(CurrencyCode);
