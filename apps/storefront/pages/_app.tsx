import React, {useEffect} from "react";
import axios from "axios";
import {AppProps} from 'next/app';
import Head from "next/head";
import Script from "next/script";
import Router, {useRouter} from "next/router";
import nProgress from "nprogress";
import {Middleware, SWRConfig, SWRHook} from 'swr'
import {MantineProvider} from "@mantine/core";
import {NotificationsProvider} from '@mantine/notifications';

import * as gtag from '../core/_analytics';

import '../styles/main.scss'
import '../core/_service';

import AppHeader from "../components/partials/Header";
import AppFooter from "../components/partials/Footer";
import AppMobileMenu from "../components/partials/MobileMenu";

Router.events.on("routeChangeStart", nProgress.start);
Router.events.on("routeChangeError", nProgress.done);
Router.events.on("routeChangeComplete", nProgress.done);

nProgress.configure({showSpinner: false});

/* SWR FETCHER GLOBAL FUNCTION */

const swrMiddleware: Middleware = (useSWRNext: SWRHook) => (key, fetcher, config) => {
  return useSWRNext(key, fetcher, config)
};

const fetcher = (configuration: any) => {
  const {withCredentials = false, args, url,} = configuration;

  return axios.get(url, {params: args, withCredentials})
      .then((res) => res.data);
};

/* ENG OF SWR GLOBAL FUNCTION */

function MyApp({Component, pageProps}: AppProps) {
  const router = useRouter();

  useEffect(() => {
    if (!!process.env.NEXT_PUBLIC_PRODUCTION) {
      // @ts-ignore // not tracking in development. Neat, hah!
      window[`ga-disable-${gtag.GA_TRACKING_ID}`] = true;
    }

    const handleRouteChange = (url: string) => {
      gtag.pageview(url)
    };
    router.events.on('routeChangeComplete', handleRouteChange);
    router.events.on('hashChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
      router.events.off('hashChangeComplete', handleRouteChange);
    };
  }, [router.events]);

  return (
      <>
        <Head>
          <meta charSet="UTF-8"/>
          <base href="/"/>
          <meta name="viewport" content="width=device-width, initial-scale=1"/>

          <link rel="icon" type="image/x-icon" href="https://res.cloudinary.com/pageaters/image/upload/v1651043823/Favicons/favicon_cccii1.ico"/>
          <link rel="apple-touch-icon" sizes="180x180" href="https://res.cloudinary.com/pageaters/image/upload/v1651043822/Favicons/apple-touch-icon_hsgmcm.png"/>
          <link rel="icon" type="image/png" sizes="32x32" href="https://res.cloudinary.com/pageaters/image/upload/v1651043822/Favicons/favicon-32x32_qaib2d.png"/>
          <link rel="icon" type="image/png" sizes="16x16" href="https://res.cloudinary.com/pageaters/image/upload/v1651043822/Favicons/favicon-16x16_gdsvtl.png"/>

          <meta name="og:type" content="website"/>
          <meta name="og:site_name" content="pageaters.com"/>

          <meta name="fb:pages" content="Pageaters-101873422124838"/>

          <meta name="twitter:card" content="summary"/>
          <meta name="twitter:site" content="@pageaters"/>

          <meta property="twitter:card" content="summary_large_image"/>
        </Head>
        <SWRConfig value={{use: [swrMiddleware], fetcher}}>
          <MantineProvider theme={{fontFamily: 'Metropolis Regular'}}>
            <NotificationsProvider position={'bottom-right'}>
              <AppHeader/>
              <Component {...pageProps} />
              <AppFooter/>
              <AppMobileMenu/>
            </NotificationsProvider>
          </MantineProvider>
        </SWRConfig>

        <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_TRACKING_ID}`}
        />
        <noscript><img height="1" width="1" style={{display: 'none'}} src="https://www.facebook.com/tr?id=243894680471127&ev=PageView&noscript=1"/></noscript>
        <Script
            id="gtag-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gtag.GA_TRACKING_ID}', {
              page_path: window.location.pathname
            });
          `,
          }}
        />
        <Script strategy={'afterInteractive'}
                id="fpixel-init"
                dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '243894680471127');
            fbq('track', 'PageView');
          `
        }}>
        </Script>
      </>
  )
}

export default MyApp;
