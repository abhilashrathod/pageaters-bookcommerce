import React from "react";
import axios from "axios";
import {AppProps} from 'next/app'
import Router from "next/router";
import nProgress from "nprogress";
import {SWRConfig} from 'swr'
import {MantineProvider} from "@mantine/core";
import {NotificationsProvider} from '@mantine/notifications';

import '../styles/main.scss'
import '../core/_service';

import AppHeader from "../components/partials/Header";
import AppFooter from "../components/partials/Footer";
import AppMobileMenu from "../components/partials/MobileMenu";
// User Context
import {UserProvider} from "../contexts/user.context";

Router.events.on("routeChangeStart", nProgress.start);
Router.events.on("routeChangeError", nProgress.done);
Router.events.on("routeChangeComplete", nProgress.done);

nProgress.configure({showSpinner: false});

/* SWR FETCHER GLOBAL FUNCTION */

const fetcher = (configuration: any) => {
  const {args, url} = configuration;

  return axios.get(url, {params: args})
      .then((res) => res.data);
};

/* ENG OF SWR GLOBAL FUNCTION */

function MyApp({Component, pageProps}: AppProps) {
  return (
      <>
        <SWRConfig value={{fetcher}}>
          <MantineProvider theme={{fontFamily: 'Metropolis Regular'}}>
            <NotificationsProvider position={'bottom-center'}>
              <UserProvider initialUser={pageProps?.user}>
                <AppHeader/>
                <Component {...pageProps} />
                <AppFooter/>
                <AppMobileMenu/>
              </UserProvider>
            </NotificationsProvider>
          </MantineProvider>
        </SWRConfig>
      </>
  )
}

export default MyApp;
