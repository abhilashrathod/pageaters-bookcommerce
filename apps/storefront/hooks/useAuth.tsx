import { useState, useEffect } from 'react';
import cookie from "js-cookie";
import {AUTH_COOKIE} from "../core/_variables";
import {useUser} from "../contexts/user.context";

const useAuth = () => {
  const [auth, setAuth] = useState(false);
  const {user, setUser} = useUser();

  useEffect(() => {
    const isLoggedIn = cookie.get(AUTH_COOKIE);
    if (isLoggedIn) {
      setAuth(true)
    }
  }, []);

  useEffect(() => {
    const isLoggedIn = cookie.get(AUTH_COOKIE);
    if (!isLoggedIn && !user) {
      setAuth(false);
    }

    if (isLoggedIn && user) {
      setAuth(true);
    }
  }, [user, setUser]);

  return auth;
};

export default useAuth;
