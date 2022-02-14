import React from "react";
import {AppProps} from 'next/app'
import '../styles/main.scss'

import AppHeader from "../components/partials/Header";
import AppFooter from "../components/partials/Footer";

function MyApp({Component, pageProps}: AppProps) {
  return (
      <>
      <AppHeader />
      <Component {...pageProps} />
      <AppFooter />
      </>
  )
}

export default MyApp;
