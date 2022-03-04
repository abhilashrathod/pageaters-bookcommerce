import React, {useState} from 'react';
import styled from "styled-components";
import {parseUrl, stringifyUrl} from 'query-string';
import {useForm} from '@mantine/hooks';
import axios from "axios";
import Link from "next/link";
import cookie from 'js-cookie';

import PageWrapper from "../../components/elements/PageWrapper";
import AppTextInput from "../../components/form-controls/AppTextInput";

import {ACCENT_COLOR, AUTH_COOKIE, LIGHTER_PRIMARY_COLOR, SECONDARY_COLOR} from "../../core/_variables";
import {useUser} from "../../contexts/user.context";
import {useRouter} from "next/router";

interface Props {
}

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

const LoginButton = styled.button`
  color: ${SECONDARY_COLOR};
  background: ${LIGHTER_PRIMARY_COLOR};
  font-size: 1.2rem;
  line-height: 20px;
  color: #fff;
  background: #222;
  padding: 14px 24px;
  border-radius: 0.5rem;
  margin-bottom: 1.2rem;
  box-shadow: 0 2px 10px 0 rgb(0 0 0 / 16%);
  width: 100%;
  display: block;
`;

const Login: React.FC<Props> = () => {
  const {user, setUser} = useUser();
  const router = useRouter();

  // @ts-ignore
  const {redirect, setRedirect} = useState(() => {
    const {query} = parseUrl(router.asPath);
    return query.redirect || ''
  });

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },

    validationRules: {
      email: (value) => value !== '',
      password: (value) => value !== '',
    },

    errorMessages: {
      email: 'Please enter valid email address',
      password: 'Please enter password',
    },
  });

  function handleSubmit(values: any) {
    axios.post(`/auth/login`, values, {withCredentials: true})
      .then((data) => {
        cookie.set(AUTH_COOKIE, `${+ new Date()}`);
        setUser(data.data.data);

        if (redirect) return (redirect);

        router.push('/');
      })
      .catch((err) => {
        console.log("err", err);
      })
  }


  return (
      <PageWrapper>
        <div className="custom-container">
          <div className="row">
            <div className="col-xxl-6 col-xl-6 col-lg-8 col-md-8 col-12" style={{margin: '0 auto'}}>
              <AuthPageHeading>
                <h2>Glad to have you back!</h2>
                <h5>Please enter your details to login</h5>
              </AuthPageHeading>
            </div>
            <div className="clearfix"></div>
            <div className="col-xxl-4 col-xl-4 col-lg-8 col-md-8 col-12" style={{margin: '0 auto'}}>
              <form onSubmit={form.onSubmit(handleSubmit)}>
                <AppTextInput id={'email'}
                              required={true}
                              label={'Email'}
                              name={'email'}
                              type={'email'}
                              {...form.getInputProps('email')}/>
                <AppTextInput id={'password'}
                              required={true}
                              label={'Password'}
                              name={'password'}
                              type={'password'}
                              {...form.getInputProps('password')}/>
                <p style={{marginBottom: '1.25rem'}}>
                  <Link href={`/auth/forgot-password`}><a>Forgot Password?</a></Link>
                </p>
                <LoginButton type="submit">Submit</LoginButton>
              </form>
              <hr/>
              <h5 style={{textAlign: 'center'}}>New to Pageaters?</h5>
              <LoginButton style={{backgroundColor: `${ACCENT_COLOR}`}} type="button">Create Account</LoginButton>
            </div>
          </div>
        </div>
      </PageWrapper>
  )
};

export default Login;
