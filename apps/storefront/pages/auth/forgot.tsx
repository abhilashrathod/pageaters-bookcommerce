import React, {useState} from 'react';
import styled from "styled-components";
import {useForm} from "@mantine/hooks";

import PageWrapper from "../../components/elements/PageWrapper";
import AppTextInput from "../../components/form-controls/AppTextInput";
import Link from "next/link";

import {ACCENT_COLOR, LIGHTER_PRIMARY_COLOR, SECONDARY_COLOR} from "../../core/_variables";
import axios from "axios";
import {useNotifications} from "@mantine/notifications";
import EmptyMessageWithGraphic from "../../components/elements/EmptyMessageWithGraphic";

import graphic from '../../public/illustrations/forgot-password-success.svg';
import {Center, Divider} from "@mantine/core";
import AppButton, {ButtonSizes, ButtonVariants} from "../../components/form-controls/Button";
import {useRouter} from "next/router";
import {Icon} from "@iconify/react";
import Head from "next/head";
import {obscureEmail} from "../../core/_helpers";

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

const ForgotPassword: React.FC<Props> = () => {
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  const router = useRouter();
  const notif = useNotifications();

  const form = useForm({
    initialValues: {
      email: '',
    },

    validationRules: {
      email: (value) => value !== '',
    },

    errorMessages: {
      email: 'Please enter valid email address',
    },
  });

  async function handleSubmit(values: any) {
    try {
      await axios.post(`/auth/forgot-password`, values);
      setMessage(`A reset password email has been sent to to ${obscureEmail(form.values.email)}. Please follow the instructions to reset your password`);
      setSuccess(true);
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 5000});
    }
  }

  async function handleResentEmail() {
    try {
      await axios.post(`/auth/forgot-password/resend`, {email: form.values.email});
      setMessage(`A new reset password email has been sent to ${obscureEmail(form.values.email)}.`);
      notif.showNotification({message: 'Resend Success!', color: 'green', autoClose: 3000});
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 5000});
    }
  }

  function handleContactUs() {
    router.push('/store/contact');
  }

  function retryEmail() {
    setMessage(``);
    setSuccess(false);
  }

  return (
      <>
      <Head>
        <title>Password Assistance | Pageaters</title>
      </Head>
      <PageWrapper>
        <div className="custom-container">
          {
            !success
                ? <div className="row">
                  <div className="col-xxl-6 col-xl-6 col-lg-8 col-md-8 col-12" style={{margin: '0 auto'}}>
                    <AuthPageHeading>
                      <h2>Forgot Password?</h2>
                      <h6 style={{textAlign: 'center'}}>Enter the email accociated with your account.</h6>
                    </AuthPageHeading>
                  </div>
                  <div className="clearfix"></div>
                  <div className="col-xxl-4 col-xl-4 col-lg-8 col-md-8 col-12" style={{margin: '0 auto'}}>
                    <form onSubmit={form.onSubmit(handleSubmit)}>
                      <AppTextInput id={'email'}
                                    required={true}
                                    label={'Email'}
                                    type={'email'}
                                    {...form.getInputProps('email')}/>
                      <LoginButton type="submit">Send</LoginButton>
                      <p style={{marginBottom: '1.25rem'}}>
                        <Link href={`/auth/login`}><a style={{
                          display: 'flex',
                          alignItems: 'center'
                        }}><Icon icon={'bx:bx-chevron-left'} width={16} height={16}/> Back to Login</a></Link>
                      </p>
                    </form>
                  </div>
                </div>
                : <>
                  <div className="row">
                    <div className="col-xxl-6 col-xl-6 col-lg-8 col-md-8 col-12" style={{margin: '0 auto'}}>
                      <AuthPageHeading>
                        <h2>Instruction Email Sent!</h2>
                      </AuthPageHeading>
                      <EmptyMessageWithGraphic title={message} illustration={graphic} illustrationHeight={'250px'}
                                               illustrationWidth={'250px'}/>
                      <Center>
                        <AppButton variant={ButtonVariants.Default} onClick={retryEmail}>Retry Email</AppButton>
                      </Center>
                      <Divider my="xs" label="ASSISTANCE" labelPosition="center"/>
                      <Center style={{flexDirection: 'column'}}>
                        <h6>Didn&#39;t Receive Reset Mail?</h6>
                        <p>
                          <AppButton variant={ButtonVariants.Secondary} size={ButtonSizes.Small} onClick={handleResentEmail}
                                     type="button">Resend Email</AppButton>
                          &nbsp;
                          &nbsp;
                          &nbsp;
                          <AppButton variant={ButtonVariants.Secondary} size={ButtonSizes.Small} onClick={handleContactUs}
                                     type="button">Contact Us</AppButton>
                        </p>
                      </Center>
                    </div>
                  </div>
                </>
          }
        </div>
      </PageWrapper>
      </>
  )
};

export default ForgotPassword;
