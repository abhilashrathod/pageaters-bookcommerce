import React, {useState} from 'react';
import Head from "next/head";
import {useRouter} from "next/router";
import {mutate} from "swr";
import styled from "styled-components";
import {parseUrl} from 'query-string';
import {Divider} from "@mantine/core";
import {Icon} from "@iconify/react";
import {useForm} from '@mantine/hooks';
import {useNotifications} from '@mantine/notifications';
import axios from "axios";
import Link from "next/link";
import cookie from 'js-cookie';

import AppTextInput from "../../components/form-controls/AppTextInput";
import AppButton, {ButtonSizes, ButtonVariants} from "../../components/form-controls/Button";

import {ACCENT_COLOR, AUTH_COOKIE, LG, LIGHTER_PRIMARY_COLOR, MD, SECONDARY_COLOR, SM} from "../../core/_variables";

import {getAssetImage} from "../../core/_imageRendererHelper";
import {signIn} from "../../core/_analytics";

interface Props {
}


const RegisterPage = styled.div`
  min-height: 100vh;
  height: auto;
  
  @media screen and (max-width: ${LG - 1}px) and (min-width: ${MD - 1}px) {
    min-height: auto;
  }
  
  @media screen and (max-width: ${MD - 1}px) {
    min-height: 100vh;
  }
`;

const ContentSpace = styled.div`
  padding: 7.5rem 5rem 7.5rem 5.714rem;
  display: flex;
  height: 100vh;
  flex-direction: column;
  justify-content: center;
  
  @media screen and (max-width: ${LG - 1}px) and (min-width: ${MD - 1}px) {
    padding: 2.5rem;
    height: 70vh;
  }
  
  @media screen and (max-width: ${MD - 1}px) {
    padding: 2.5rem;
    height: auto;
  }
  
  @media screen and (max-width: ${SM - 1}px) {
    padding: 1rem;
    height: auto;
  }
`;

const HeroSpace = styled.div`
  display: flex;
  min-height: 100%;
  align-items: stretch;
  
  @media screen and (max-width: ${MD - 1}px) {
    display: none;
  }
`;

const GradientSpace = styled.div`  
  min-height: 100%;

  background: hsla(0, 0%, 0%, 1);
  background: linear-gradient(135deg, hsla(0, 0%, 0%, 1) 0%, hsla(0, 0%, 28%, 1) 65%, hsla(0, 0%, 29%, 1) 100%);
  background: -moz-linear-gradient(135deg, hsla(0, 0%, 0%, 1) 0%, hsla(0, 0%, 28%, 1) 65%, hsla(0, 0%, 29%, 1) 100%);
  background: -webkit-linear-gradient(135deg, hsla(0, 0%, 0%, 1) 0%, hsla(0, 0%, 28%, 1) 65%, hsla(0, 0%, 29%, 1) 100%);
  filter: progid: DXImageTransform.Microsoft.gradient( startColorstr="#000000", endColorstr="#474747", GradientType=1 );
  
  height: 25vh;
  display:none; 
  
  @media screen and (max-width: ${MD - 1}px) {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 1rem 2.5rem;    
  }
  
  @media screen and (max-width: ${SM - 1}px) {    
    padding: 1rem;
  }
`;

const HeroImage = styled.img`
  height: 100vh;
  object-fit: cover;
  width: 100%;
  object-position: center center;
  
  @media screen and (max-width: ${LG - 1}px) and (min-width: ${MD - 1}px) {
   height: 70vh;
  }
  
  @media screen and (max-width: ${MD - 1}px) {
    height: 40vh;
  }
`;

const ContentTitles = styled.div`
  margin-bottom: 2rem;
  
  @media screen and (max-width: ${MD - 1}px) {
    display:none;
  }
`;

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

const Login: React.FC<Props> = () => {
  const router = useRouter();
  const notif = useNotifications();

  const [redirect, setRedirect] = useState(() => {
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

  function renderImageSize(i: string, w: number, h: number) {
    return getAssetImage(i, {height: h, width: w, fit: 'cover'});
  }

  function handleSubmit(values: any) {
    axios.post(`/auth/login`, values, {withCredentials: true})
        .then(({data}) => {
          notif.showNotification({message: 'Login Successfully!', color: 'green', autoClose: 3000});

          cookie.set(AUTH_COOKIE, `${+new Date()}`);
          mutate({url: `/auth/me`, withCredentials: true});
          mutate({url: `/cart/retrieve`, withCredentials: true});

          setTimeout(() => {
            if (redirect) return router.replace(`${redirect}`);
            router.push('/');
          }, 500);

          signIn(); // for analytics
        })
        .catch((err) => {
          notif.showNotification({message: err.message, color: 'red', autoClose: 3000});
        })
  }


  return (
      <>
        <Head>
          <title>Sign In | Pageaters</title>
        </Head>
        <RegisterPage>
          <div className="container-fluid g-0">
            <div className="row g-0">
              <div className="order-last order-lg-first order-xl-first order-xxl-first col-12 col-lg-6 col-xl-5 col-xxl-5">
                <ContentSpace>
                  <ContentTitles>
                    <h1 className="display-1">Glad to have you back!</h1>
                    <h6 style={{color: LIGHTER_PRIMARY_COLOR}}>Login to access account and shopping.</h6>
                  </ContentTitles>

                  <form onSubmit={form.onSubmit(handleSubmit)}>
                    <AppTextInput id={'email'}
                                  required={true}
                                  label={'Email'}
                                  type={'email'}
                                  {...form.getInputProps('email')}/>
                    <AppTextInput id={'password'}
                                  required={true}
                                  label={'Password'}
                                  type={'password'}
                                  {...form.getInputProps('password')}/>
                    <LoginButton type="submit">Login</LoginButton>
                    <p style={{marginBottom: '1.25rem'}}>
                      <Link href={`/auth/forgot`}><a style={{
                        display: 'flex',
                        alignItems: 'center'
                      }}>Forgot Password? <Icon icon={'bx:bx-chevron-right'} width={16} height={16}/></a></Link>
                    </p>
                  </form>
                  <Divider my="xs" label="OR" labelPosition="center"/>
                  <h6 style={{textAlign: 'center'}}>New to Pageaters?</h6>
                  <AppButton styles={{width: '33%', margin: '0 auto'}} variant={ButtonVariants.Secondary}
                             size={ButtonSizes.Small} onClick={() => router.push(`/auth/register`)} type="button">Create
                    Account</AppButton>
                </ContentSpace>
              </div>
              <div
                  className="order-first order-lg-last order-xl-last order-xxl-last col-12 col-lg-6 col-xl-7 col-xxl-7">
                <HeroSpace>
                  <picture style={{width: '100%'}}>
                    <source media={`(max-width: ${SM - 1}px)`} type="image/jpeg"
                            srcSet={renderImageSize('happy-reader-with-stack-of-books.jpg', 375, 450)} height={450}
                            width={375}/>
                    <source media={`(max-width: ${MD - 1}px)`} type="image/jpeg"
                            srcSet={renderImageSize('happy-reader-with-stack-of-books.jpg', 768, 600)} height={768}
                            width={600}/>
                    <source media={`(max-width: ${LG - 1}px)`} type="image/jpeg"
                            srcSet={renderImageSize('happy-reader-with-stack-of-books.jpg', 1024, 800)} height={800}
                            width={1024}/>
                    <HeroImage src={renderImageSize('happy-reader-with-stack-of-books.jpg', 1920, 1280)}
                               alt="login-banner"/>
                  </picture>
                </HeroSpace>
                <GradientSpace>
                  <h1 className={'display-1'} style={{color: SECONDARY_COLOR}}>Glad to have you back!</h1>
                </GradientSpace>
              </div>
            </div>
          </div>
        </RegisterPage>
      </>
  )
};

export default Login;
