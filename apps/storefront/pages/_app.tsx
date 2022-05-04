import React from "react";
import axios from "axios";
import {AppProps} from 'next/app'
import Router from "next/router";
import nProgress from "nprogress";
import {Middleware, SWRConfig, SWRHook} from 'swr'
import {MantineProvider} from "@mantine/core";
import {NotificationsProvider} from '@mantine/notifications';

import '../styles/main.scss'
import '../core/_service';

import AppHeader from "../components/partials/Header";
import AppFooter from "../components/partials/Footer";
import AppMobileMenu from "../components/partials/MobileMenu";
import Head from "next/head";

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
      </>
  )
}

export default MyApp;
