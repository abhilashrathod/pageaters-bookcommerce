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
  // console.log("config", config);
  
  return useSWRNext(key, fetcher, config)
};

const fetcher = (configuration: any) => {
  // console.log("configuration", configuration);
  
  const {withCredentials = false, args, url,} = configuration;

  return axios.get(url, {params: args, withCredentials})
      .then((res) => res.data);
};

/* ENG OF SWR GLOBAL FUNCTION */

function MyApp({Component, pageProps}: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // @ts-ignore
    const isProd = JSON.parse(process.env.NEXT_PUBLIC_PRODUCTION);
    if (!isProd) {
      // @ts-ignore
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

          <meta name="og:type" content="website"/>
          <meta name="og:site_name" content="pageaters.com"/>

          <meta name="fb:pages" content="Pageaters-101873422124838"/>

          <meta name="twitter:card" content="summary"/>
          <meta name="twitter:site" content="@pageaters"/>

          <meta property="twitter:card" content="summary_large_image"/>
        </Head>
        <SWRConfig value={{use: [swrMiddleware], fetcher}}>
          <MantineProvider theme={{fontFamily: 'Metropolis Regular' }}>
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
      </>
  )
}

export default MyApp;
