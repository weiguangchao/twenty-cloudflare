import { TAG_COLORS } from 'crm-shared/constants';
import { MAIN_COLOR_NAMES } from 'crm-ui/theme';

describe('select option theme colors', () => {
  it('offers the same colors in the picker as the backend accepts', () => {
    expect(new Set(MAIN_COLOR_NAMES)).toEqual(new Set(TAG_COLORS));
  });
});
