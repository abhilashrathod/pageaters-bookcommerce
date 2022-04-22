import {useEffect, useState} from 'react';
import cookie from "js-cookie";
import {AUTH_COOKIE} from "../core/_variables";

const useAuth = () => {
  const [auth, setAuth] = useState(false);
  const isLoggedIn = cookie.get(AUTH_COOKIE);

  useEffect(() => {
    if (isLoggedIn) {
      setAuth(true)
    }
  }, [isLoggedIn]);

  return auth;
};

export default useAuth;
