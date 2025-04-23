//_app.js
import Head from 'next/head';
import '../styles/globals.css'; // Your global CSS

function MyApp({ Component, pageProps }) {
  return (
    <>
        <Head>
        {/* Standard for all browsers */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        {/* Modern browsers (recommended) */}
        <link rel="icon" href="/icon.png" type="image/png" />
        {/* Safari/iOS */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;