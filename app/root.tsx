import { LinksFunction, LoaderFunctionArgs } from '@remix-run/cloudflare';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from '@remix-run/react';
import { PreventFlashOnWrongTheme, ThemeProvider, useTheme } from 'remix-themes';
import { resolveAcceptLanguage } from 'resolve-accept-language';

import { themeSessionResolver } from '~/controllers/session.server';
import globalStyles from '~/styles/global.css?url';
import resetStyles from '~/styles/reset.css?url';
import themeStyles from '~/styles/theme.css?url';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const lang = resolveAcceptLanguage(
    request.headers.get('accept-language')!,
    ['en-US', 'ko-KR'] as const,
    'ko-KR',
  );
  const { getTheme } = await themeSessionResolver(request);

  return {
    lang: lang.split('-')[0],
    ssrTheme: getTheme(),
  };
};

export const links: LinksFunction = () => {
  return [
    { rel: 'stylesheet', href: resetStyles },
    { rel: 'stylesheet', href: globalStyles },
    { rel: 'stylesheet', href: themeStyles },
  ];
};

export const App = () => {
  const { lang, ssrTheme } = useLoaderData<typeof loader>();
  const [theme] = useTheme();

  return (
    <html
      lang={lang}
      data-theme={theme ?? ''}
    >
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        />
        <Meta />
        <PreventFlashOnWrongTheme ssrTheme={Boolean(ssrTheme)} />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
};

export default function AppWithProviders() {
  const { ssrTheme } = useLoaderData<typeof loader>();

  return (
    <ThemeProvider
      specifiedTheme={ssrTheme}
      themeAction="/api/theme"
    >
      <App />
    </ThemeProvider>
  );
}
