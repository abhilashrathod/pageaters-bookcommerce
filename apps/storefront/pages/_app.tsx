import React from "react";
import axios from "axios";
import {AppProps} from 'next/app'
import {SWRConfig} from 'swr'

import '../styles/main.scss'

axios.defaults.baseURL = process.env.NEXT_PUBLIC_BASE_PATH || 'http://localhost:5000';

/* SWR FETCHER GLOBAL FUNCTION */

const fetcher = (configuration: any) => {
  const {args, url} = configuration;

  return axios.get(url, {params: args})
      .then((res) => res.data);
};

/* ENG OF SWR GLOBAL FUNCTION */

import AppHeader from "../components/partials/Header";
import AppFooter from "../components/partials/Footer";
import {MantineProvider} from "@mantine/core";


function MyApp({Component, pageProps}: AppProps) {
  return (
      <>
        <SWRConfig
            value={{
              fetcher,
            }}>
          <MantineProvider theme={{ fontFamily: 'Metropolis Regular' }}>
            <AppHeader/>
            <Component {...pageProps} />
            <AppFooter/>
          </MantineProvider>
        </SWRConfig>
      </>
  )
}

export default MyApp;
