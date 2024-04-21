import {
  createContext, Dispatch, MutableRefObject, ReactNode, SetStateAction,
  useCallback, useContext, useEffect, useRef, useState,
} from 'react';

import { Theme } from '~/common/constants';

function withoutTransition(callback: () => void) {
  const css = document.createElement('style');

  css.appendChild(
    document.createTextNode(
      `* {
       -webkit-transition: none !important;
       -moz-transition: none !important;
       -o-transition: none !important;
       -ms-transition: none !important;
       transition: none !important;
    }`,
    ),
  );
  document.head.appendChild(css);

  callback();

  setTimeout(() => {
    // Calling getComputedStyle forces the browser to redraw
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = window.getComputedStyle(css).transition;
    document.head.removeChild(css);
  }, 0);
}

export function useCorrectCssTransition(
  { disableTransitions = false }: {disableTransitions?: boolean} = {},
) {
  return useCallback(
    (callback: () => void) => {
      if (disableTransitions) {
        withoutTransition(() => {
          callback();
        });
      } else {
        callback();
      }
    },
    [disableTransitions],
  );
}

export function useBroadcastChannel<T = string>(
  channelName: string,
  handleMessage?: (event: MessageEvent) => void,
  handleMessageError?: (event: MessageEvent) => void,
): (data: T) => void {
  const channelRef = useRef(
    typeof window !== 'undefined' && 'BroadcastChannel' in window
      ? new BroadcastChannel(channelName + '-channel')
      : null,
  );

  useChannelEventListener(channelRef, 'message', handleMessage);
  useChannelEventListener(channelRef, 'messageerror', handleMessageError);

  return useCallback(
    (data: T) => {
      channelRef?.current?.postMessage(data);
    },
    [channelRef],
  );
}

function useChannelEventListener<K extends keyof BroadcastChannelEventMap>(
  channelRef: MutableRefObject<BroadcastChannel | null>,
  event: K,
  handler: (e: BroadcastChannelEventMap[K]) => void = () => {},
) {
  useEffect(() => {
    const channel = channelRef.current;

    if (channel) {
      channel.addEventListener(event, handler);
      return () => channel.removeEventListener(event, handler);
    }
  }, [
    channelRef,
    event,
    handler,
  ]);
}

export const themes: Array<Theme> = Object.values(Theme);

type ThemeContextType = [Theme | null, Dispatch<SetStateAction<Theme | null>>]

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
ThemeContext.displayName = 'ThemeContext';

const prefersLightMQ = '(prefers-color-scheme: light)';

const getPreferredTheme = () =>
  window.matchMedia(prefersLightMQ).matches ? Theme.LIGHT : Theme.DARK;

export const mediaQuery =
  typeof window !== 'undefined' ? window.matchMedia(prefersLightMQ) : null;

export type ThemeProviderProps = {
  children: ReactNode
  specifiedTheme: Theme | null
  themeAction: string
  disableTransitionOnThemeChange?: boolean
}

export function ThemeProvider({
  children,
  specifiedTheme,
  themeAction,
  disableTransitionOnThemeChange = false,
}: ThemeProviderProps) {
  const ensureCorrectTransition = useCorrectCssTransition({
    disableTransitions: disableTransitionOnThemeChange,
  });

  const [theme, setTheme] = useState<Theme | null>(() => {
    // On the server, if we don't have a specified theme then we should
    // return null and the clientThemeCode will set the theme for us
    // before hydration. Then (during hydration), this code will get the same
    // value that clientThemeCode got so hydration is happy.
    if (specifiedTheme) {
      return themes.includes(specifiedTheme) ? specifiedTheme : null;
    }

    // there's no way for us to know what the theme should be in this context
    // the client will have to figure it out before hydration.
    if (typeof window !== 'object') return null;

    return getPreferredTheme();
  });

  const mountRun = useRef(false);

  const broadcastThemeChange = useBroadcastChannel('remix-themes', e => {
    ensureCorrectTransition(() => {
      setTheme(e.data);
    });
  });

  useEffect(() => {
    if (!mountRun.current) {
      mountRun.current = true;
      return;
    }
    if (!theme) return;

    fetch(`${themeAction}`, {
      method: 'POST',
      body: JSON.stringify({ theme }),
    });

    ensureCorrectTransition(() => {
      broadcastThemeChange(theme);
    });
  }, [
    broadcastThemeChange,
    theme,
    themeAction,
    ensureCorrectTransition,
  ]);

  useEffect(() => {
    const handleChange = (ev: MediaQueryListEvent) => {
      ensureCorrectTransition(() => {
        setTheme(ev.matches ? Theme.LIGHT : Theme.DARK);
      });
    };
    mediaQuery?.addEventListener('change', handleChange);
    return () => mediaQuery?.removeEventListener('change', handleChange);
  }, [ensureCorrectTransition]);

  return (
    <ThemeContext.Provider value={[theme, setTheme]}>
      {children}
    </ThemeContext.Provider>
  );
}

const clientThemeCode = `
(() => {
  const theme = window.matchMedia(${JSON.stringify(prefersLightMQ)}).matches
    ? 'light'
    : 'dark';
  
  const cl = document.documentElement.classList;
  const dataAttr = document.documentElement.dataset.theme;

  if (dataAttr != null) {
    const themeAlreadyApplied = dataAttr === 'light' || dataAttr === 'dark';
    if (!themeAlreadyApplied) {
      document.documentElement.dataset.theme = theme;
    }
  } else {
    const themeAlreadyApplied = cl.contains('light') || cl.contains('dark');
    if (!themeAlreadyApplied) {
      cl.add(theme);
    }
  }
  
  const meta = document.querySelector('meta[name=color-scheme]');
  if (meta) {
    if (theme === 'dark') {
      meta.content = 'dark light';
    } else if (theme === 'light') {
      meta.content = 'light dark';
    }
  }
})();
`;

type PreventFlashOnWrongThemeProps = {
  ssrTheme: boolean
  nonce?: string
}

export function PreventFlashOnWrongTheme({
  ssrTheme,
  nonce,
}: PreventFlashOnWrongThemeProps) {
  const [theme] = useTheme();

  return (
    <>
      {/*
        On the server, "theme" might be `null`, so clientThemeCode ensures that
        this is correct before hydration.
      */}
      <meta
        name="color-scheme"
        content={theme === 'light' ? 'light dark' : 'dark light'}
      />
      {/*
        If we know what the theme is from the server then we don't need
        to do fancy tricks prior to hydration to make things match.
      */}
      {ssrTheme ? null : (
        <script
          // NOTE: we cannot use type="module" because that automatically makes
          // the script "defer". That doesn't work for us because we need
          // this script to run synchronously before the rest of the document
          // is finished loading.
          dangerouslySetInnerHTML={{ __html: clientThemeCode }}
          nonce={nonce}
        />
      )}
    </>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && themes.includes(value as Theme);
}
