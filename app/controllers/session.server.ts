import { createCookieSessionStorage } from '@remix-run/cloudflare';
import { createThemeSessionResolver } from 'remix-themes';

const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set');
}

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__remix-themes',
    // domain: 'remix.run',
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secrets: [SESSION_SECRET],
    secure: process.env.NODE_ENV === 'production',
  },
});

export const themeSessionResolver = createThemeSessionResolver(sessionStorage);
