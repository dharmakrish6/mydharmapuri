import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Root HTML for every statically rendered web page (web only).
// headNodes/bodyNodes carry the app's JS bundles and styles — without them the page never
// starts in the browser. Per-page title/description tags are added by scripts/seo-postbuild.mjs.
export default function Root({ children }: PropsWithChildren) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();
  return (
    <html lang="en-IN" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#133a2b" />
        <meta name="geo.region" content="IN-TN" />
        <meta name="geo.placename" content="Dharmapuri" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'body{background-color:#f2f3ec}@media (prefers-color-scheme: dark){body{background-color:#0c1512}}' }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
