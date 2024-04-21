import { createCookieSessionStorage } from '@remix-run/cloudflare';
import { createThemeSessionResolver } from 'remix-themes';

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__remix-themes',
    // domain: 'remix.run',
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secrets: ['theme'],
    secure: process?.env.NODE_ENV !== 'development',
  },
});

export const themeSessionResolver = createThemeSessionResolver(sessionStorage);
