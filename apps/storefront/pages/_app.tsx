import React, {useEffect} from "react";
import axios from "axios";
import {AppProps} from 'next/app'
import Router from "next/router";
import nProgress from "nprogress";
import cookie from 'js-cookie';
import {SWRConfig} from 'swr'
import {MantineProvider} from "@mantine/core";

import '../styles/main.scss'
import AppHeader from "../components/partials/Header";
import AppFooter from "../components/partials/Footer";
import AppMobileMenu from "../components/partials/MobileMenu";
// User Context
import {UserProvider} from "../contexts/user.context";
import {AUTH_COOKIE} from "../core/_variables";

Router.events.on("routeChangeStart", nProgress.start);
Router.events.on("routeChangeError", nProgress.done);
Router.events.on("routeChangeComplete", nProgress.done);

nProgress.configure({showSpinner: false});

axios.defaults.baseURL = process.env.NEXT_PUBLIC_BASE_PATH || 'http://localhost:5000';

/* SWR FETCHER GLOBAL FUNCTION */

const fetcher = (configuration: any) => {
  const {args, url} = configuration;

  return axios.get(url, {params: args})
      .then((res) => res.data);
};

/* ENG OF SWR GLOBAL FUNCTION */


/**
 * RESPONSE INTERCEPTOR
 */
axios.interceptors.response.use((response) => {
  // Do something with response data
  return response;
}, (error) => {
  if (error.response.status === 401) {
    cookie.remove(AUTH_COOKIE);
    Router.replace('/');
  }
  return error.response.data;
});


function MyApp({Component, pageProps}: AppProps) {
  return (
      <>
        <SWRConfig
            value={{
              fetcher,
            }}>
          <MantineProvider theme={{fontFamily: 'Metropolis Regular'}}>
            <UserProvider initialUser={pageProps?.user}>
              <AppHeader/>
              <Component {...pageProps} />
              <AppFooter/>
              <AppMobileMenu/>
            </UserProvider>
          </MantineProvider>
        </SWRConfig>
      </>
  )
}

export default MyApp;
