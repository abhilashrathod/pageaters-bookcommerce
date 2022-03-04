import axios from "axios";
import cookie from "js-cookie";
import {AUTH_COOKIE} from "./_variables";
import Router from "next/router";

axios.defaults.baseURL = process.env.NEXT_PUBLIC_BASE_PATH || 'http://localhost:5000';

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
  return Promise.reject(error.response.data)
});
