import React, {useEffect, useState} from 'react';
import {useRouter} from "next/router";
import Link from "next/link";
import styled from 'styled-components';
import {parseUrl} from 'query-string';
import {useNotifications} from "@mantine/notifications";
import {useForm} from "@mantine/hooks";
import axios from "axios";

import AppTextInput from "../../components/form-controls/AppTextInput";
import PageWrapper from "../../components/elements/PageWrapper";

import {ACCENT_COLOR, LIGHTER_PRIMARY_COLOR, SECONDARY_COLOR} from "../../core/_variables";
import Head from "next/head";

interface Props {
}

const LoginButton = styled.button`
  color: ${SECONDARY_COLOR};
  background: ${ACCENT_COLOR};
  font-size: 1.2rem;
  line-height: 1.486rem;
  padding: 14px 24px;
  border-radius: 0.5rem;
  margin-bottom: 1.2rem;
  box-shadow: 0 2px 10px 0 rgb(0 0 0 / 16%);
  width: 100%;
  display: block;
`;

const AuthPageHeading = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  margin: 1rem 0 3rem 0;
  
  h2 {
    font-size: 3rem;
    letter-spacing: -1px;
  }
  
  h5 {
    color: ${LIGHTER_PRIMARY_COLOR};
    font-size: 1.5rem;
  }
`;

const ResetPassword: React.FC<Props> = () => {
  const notif = useNotifications();
  const router = useRouter();

  const [email, setEmail] = useState(() => {
    const {query} = parseUrl(router.asPath);

    return query.email || '';
  });

  const [token, setToken] = useState(() => {
    const {query} = parseUrl(router.asPath);

    return query.token || '';
  });

  useEffect(() => {
    if (!token || !email) {
      router.replace('/auth/login');
    }
  }, []);

  const form = useForm({
    initialValues: {
      newPassword: '',
      confirmPassword: '',
      token: token,
      email: email
    },

    validationRules: {
      newPassword: (value) => value !== '',
      confirmPassword: (value, values) => (value !== ''),
    },

    errorMessages: {
      newPassword: 'Please enter valid password',
      confirmPassword: 'Passwords did not match',
    },
  });

  async function handleSubmit(values: any) {
    const {newPassword, confirmPassword} = values;

    if (newPassword !== confirmPassword) {
      return notif.showNotification({message: 'Passwords do not match.', color: 'red', autoClose: 3000});
    }

    try {
      await axios.post(`/auth/reset-password`, values);
      notif.showNotification({
        message: 'Resetting password complete. Please proceed with login',
        color: 'green',
        autoClose: 5000
      });
      router.replace('/auth/login');
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  return (
      <>
      <Head>
        <title>Password Reset | Pageaters</title>
      </Head>
      <PageWrapper>
        <div className="custom-container">
          <div className="row">
            <div className="col-xxl-6 col-xl-6 col-lg-8 col-md-8 col-12" style={{margin: '0 auto'}}>
              <AuthPageHeading>
                <h2>Reset Your Password</h2>
                <h5>Enter your new credentials</h5>
              </AuthPageHeading>
            </div>
            <div className="clearfix"></div>
            <div className="col-xxl-4 col-xl-4 col-lg-8 col-md-8 col-12" style={{margin: '0 auto'}}>
              <form onSubmit={form.onSubmit(handleSubmit)}>
                <AppTextInput id={'newPassword'}
                              required={true}
                              label={'New Password'}
                              type={'password'}
                              {...form.getInputProps('newPassword')}/>
                <AppTextInput id={'confirmPassword'}
                              required={true}
                              label={'Confirm Password'}
                              type={'password'}
                              {...form.getInputProps('confirmPassword')}/>
                <LoginButton type="submit">Submit</LoginButton>
              </form>
            </div>
          </div>
        </div>
      </PageWrapper>
      </>
  )
};

export default ResetPassword;
