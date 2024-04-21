import { createThemeAction } from 'remix-themes';

import { themeSessionResolver } from '~/controllers/session.server';

export const action = createThemeAction(themeSessionResolver);
