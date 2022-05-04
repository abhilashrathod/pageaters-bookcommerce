import React, {useEffect, useState} from 'react';
import Head from "next/head";
import {useNotifications} from "@mantine/notifications";
import {useRouter} from "next/router";
import {parseUrl} from "query-string";
import axios from "axios";

import PageWrapper from "../../components/elements/PageWrapper";
import AppButton, {ButtonSizes, ButtonVariants} from "../../components/form-controls/Button";

import useAuth from "../../hooks/useAuth";

interface Props {
}

const VerifyAccount: React.FC<Props> = () => {
  const notif = useNotifications();
  const router = useRouter();
  const auth = useAuth();

  const [success, setSuccess] = useState(true);

  const [email, setEmail] = useState(() => {
    const {query} = parseUrl(router.asPath);

    return query.email || '';
  });

  const [token, setToken] = useState(() => {
    const {query} = parseUrl(router.asPath);

    return query.token || '';
  });

  useEffect(() => {
    checkValid()
  }, []);

  function checkValid() {
    if (!token || !email) {
      transferUser();
    } else {
      doVerify()
    }
  }

  function transferUser() {
    if (auth) {
      router.replace('/account');
    } else {
      router.replace('/auth/login');
    }
  }

  async function doVerify() {
    try {
      await axios.post(`/auth/verify-email`, {email, token});
      notif.showNotification({
        message: 'Account Email Verification Success! Please proceed with login',
        color: 'green',
        autoClose: 5000
      });
      router.replace('/auth/login');
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
      setSuccess(false);
    }
  }

  async function handleResent() {
    try {
      await axios.post(`/auth/verify-email/resend`, {email});
      notif.showNotification({
        message: 'New email has been sent for verification.',
        color: 'green',
        autoClose: 5000
      });
      router.replace('/auth/login');
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
      setSuccess(false);
    }
  }

  return (
      <>
        <Head>
          <title>Account Email Verification | Pageaters</title>
        </Head>
        <PageWrapper>
          <div className="custom-container">
            <div className="row">
              <div className="col">
                <h1 className="display-1">Account Verification</h1>
                {
                  !success && (
                      <p>
                        <AppButton variant={ButtonVariants.Secondary} onClick={handleResent} size={ButtonSizes.Small}>Resend Email</AppButton>
                      </p>
                  )
                }
              </div>
            </div>
          </div>
        </PageWrapper>
      </>
  )
};

export default VerifyAccount;
