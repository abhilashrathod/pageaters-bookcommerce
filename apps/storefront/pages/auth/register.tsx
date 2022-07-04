import React, {useEffect, useState} from 'react';
import styled from 'styled-components';
import axios from "axios";
import {mutate} from "swr";
import cookie from 'js-cookie';
import Link from "next/link";
import Head from "next/head";
import {useRouter} from "next/router";
import {Divider, Stepper} from "@mantine/core";
import {useNotifications} from "@mantine/notifications";
import {useForm, useInterval} from "@mantine/hooks";
import {Icon} from "@iconify/react";

import AppTextInput from "../../components/form-controls/AppTextInput";
import AppButton, {ButtonSizes, ButtonVariants} from "../../components/form-controls/Button";

import {getAssetImage} from "../../core/_imageRendererHelper";
import {ACCENT_COLOR, AUTH_COOKIE, LG, LIGHTER_PRIMARY_COLOR, MD, SECONDARY_COLOR, SM} from "../../core/_variables";
import {signUp} from "../../core/_analytics";


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
    padding: 1.5rem 1rem 1rem 1rem;
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
  
  background: #f12711; 
  background: -webkit-linear-gradient(to bottom right, #f5af19, #f12711);
  background: linear-gradient(to bottom right, #f5af19, #f12711);
   
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

const RegistrationForm = ({onStepChange, onSubmit}: any) => {
  const router = useRouter();

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

  function handleRegisterSubmit(values: any) {
    onSubmit(values);
  }

  return (
      <>
        <form onSubmit={form.onSubmit(handleRegisterSubmit)}>
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
          <p style={{marginBottom: '1.25rem'}}>
            By registering you&#39;re agreeing to our <Link href={'/terms-and-conditions'}><a>terms of
            use</a></Link> and <Link href={'/privacy-policy'}>privacy policy.</Link>
          </p>
          <LoginButton type="submit">Register</LoginButton>
        </form>
        <Divider my="xs" label="OR" labelPosition="center"/>
        <h6 style={{textAlign: 'center'}}>Existing User?</h6>
        <AppButton styles={{width: '33%', margin: '0 auto'}}
                   variant={ButtonVariants.Secondary}
                   size={ButtonSizes.Small}
                   onClick={() => router.push(`/auth/login`)} type="button">Sign In</AppButton>
      </>
  )
};

const PersonalInfoForm = ({onStepChange, onSubmit}: any) => {

  const personalDetailsForm = useForm({
    initialValues: {
      fullName: '',
    },

    validationRules: {
      fullName: (value) => value !== '',
    },

    errorMessages: {
      fullName: 'Please provide your name',
    },
  });

  function changeStep() {
    onStepChange(2)
  }

  function handleRegisterSubmit(values: any) {
    onSubmit(values);
  }

  return (
      <form onSubmit={personalDetailsForm.onSubmit(handleRegisterSubmit)}>
        <AppTextInput id={'fullName'}
                      required={true}
                      label={'Full Name'}
                      type={'text'}
                      {...personalDetailsForm.getInputProps('fullName')}/>
        <LoginButton type="submit">Save</LoginButton>

        <p style={{marginBottom: '1.25rem', textAlign: 'center'}}>
          <AppButton variant={ButtonVariants.Secondary} size={ButtonSizes.Small}
                     onClick={changeStep}>I Will Provide Later</AppButton>
        </p>
      </form>
  )
};

const ContactForm = ({onStepChange, onSubmit, onVerifySubmit, onResend}: any) => {
  const [seconds, setSeconds] = useState(75);
  const interval = useInterval(() => setSeconds((s) => s - 1), 1000);
  const [showOtpForm, setShowOtpForm] = useState(false);

  useEffect(() => {
    return interval.stop;
  }, []);

  useEffect(() => {
    if (seconds <= 0) {
      interval.stop();
    }
  }, [seconds]);

  const contactForm = useForm({
    initialValues: {
      contactNo: '',
    },

    validationRules: {
      contactNo: (value) => /^\d{10}$/.test(value)
    },

    errorMessages: {
      contactNo: 'Please provide valid contact without country code',
    },
  });

  const otpForm = useForm({
    initialValues: {
      otp: '',
    },

    validationRules: {
      otp: (value) => /^\d{6}$/.test(value)
    },

    errorMessages: {
      otp: 'Please enter valid OTP code with 6 digits',
    },
  });

  function changeStep() {
    onStepChange(3)
  }

  function changeNumber() {
    setShowOtpForm(false);
  }

  function handleSubmit(values: any) {
    onSubmit(values);
    setSeconds(75);
    interval.start();
    setShowOtpForm(true);
  }

  function handleVerifySubmit(values: any) {
    onVerifySubmit(values);
  }

  function handleResend() {
    setSeconds(75);
    interval.start();
    onResend();
  }

  return (
      <>
        {
          !showOtpForm
              ? <form onSubmit={contactForm.onSubmit(handleSubmit)}>
                <AppTextInput id={'contactNo'}
                              required={true}
                              label={'Contact No'}
                              type={'tel'}
                              {...contactForm.getInputProps('contactNo')}/>
                <p>
                  *Required for orders and important account notifications.
                </p>
                <LoginButton type="submit">Save</LoginButton>
                <p style={{marginBottom: '1.25rem', textAlign: 'center'}}>
                  <AppButton variant={ButtonVariants.Secondary} size={ButtonSizes.Small}
                             onClick={changeStep}>I Will Provide Later</AppButton>
                </p>
              </form>
              : <form onSubmit={otpForm.onSubmit(handleVerifySubmit)}>
                <AppTextInput id={'otp'}
                              required={true}
                              label={'OTP Code (6 Digits)'}
                              type={'text'}
                              {...otpForm.getInputProps('otp')}/>
                <LoginButton type="submit">Verify</LoginButton>
                <p style={{marginBottom: '1.25rem', textAlign: 'center'}}>
                  {
                    seconds > 0
                        ? <span>Resend OTP in {seconds}s&nbsp;</span>
                        : <AppButton variant={ButtonVariants.Secondary} size={ButtonSizes.Small}
                                     onClick={handleResend}>Resend Code</AppButton>

                  }
                  &nbsp;
                  <AppButton variant={ButtonVariants.Secondary} size={ButtonSizes.Small}
                             onClick={changeNumber}>Different Number</AppButton>
                </p>
              </form>
        }
      </>
  )
};

const Register: React.FC<Props> = () => {
  const router = useRouter();
  const notif = useNotifications();
  const [step, setStep] = useState(0);

  function renderImageSize(i: string, w: number, h: number) {
    return getAssetImage(i, {height: h, width: w, fit: 'cover'});
  }

  async function handleRegisterSubmit(values: any) {
    try {
      await axios.post(`/auth/register`, values, {withCredentials: true});
      notif.showNotification({
        message: 'Welcome to Pageaters! Registration Successful',
        color: 'green',
        autoClose: 3000
      });
      cookie.set(AUTH_COOKIE, `${+new Date()}`);
      setStep(1);
      updateUser();

      signUp(); // for analytics
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  async function handlePersonalInfoSubmit(values: any) {
    try {
      await axios.put(`/auth/me`, values, {withCredentials: true});
      notif.showNotification({message: 'Profile Info Updated', color: 'green', autoClose: 3000});
      setStep(2);
      updateUser();
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  async function handleContactSubmit(values: any) {
    try {
      await axios.post(`/auth/contact/send`, values, {withCredentials: true});
      notif.showNotification({message: 'Verification code sent on provided no.', color: 'green', autoClose: 5000});
      updateUser();
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  async function handleVerifySubmit(values: any) {
    try {
      await axios.post(`/auth/contact/verify`, values, {withCredentials: true});
      notif.showNotification({message: 'Verification Completed. Account verified!', color: 'green', autoClose: 3000});
      router.replace('/');
      updateUser();
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  async function handleResend(values: any) {
    try {
      await axios.post(`/auth/contact/resend`, values, {withCredentials: true});
      notif.showNotification({message: 'Verification code sent on provided no.', color: 'green', autoClose: 3000});
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  function handleStepChange(val: any) {
    if (val === 3) {
      notif.showNotification({message: 'Registration Completed! Happy Reading 😊', color: 'green', autoClose: 3000});
      return router.replace('/');
    }
    setStep(val);
  }

  function updateUser() {
    mutate({url: `/auth/me`, withCredentials: true});
  }

  function returnCurrentStepTitle() {
    switch (step) {
      case 0:
        return 'Step I. Add Credentials';
      case 1:
        return 'Step II. Add Personal Info';
      case 2:
        return 'Step III. Add Contact Info';
      default:
        return null;
    }
  }

  return (
      <>
        <Head>
          <title>Sign Up | Pageaters</title>
        </Head>
        <RegisterPage>
          <div className="container-fluid g-0">
            <div className="row g-0">
              <div
                  className="order-last order-lg-first order-xl-first order-xxl-first col-12 col-lg-6 col-xl-5 col-xxl-5">
                <ContentSpace>
                  <ContentTitles>
                    <h1 className="display-1">
                      Let&#39;s Get You Started
                    </h1>
                    <h6 style={{color: LIGHTER_PRIMARY_COLOR}}>Register to shop, it&#39;s quick and easy</h6>
                  </ContentTitles>

                  <Stepper style={{margin: '0 0 2rem 0'}} color={'orange'} size={'lg'} active={step}>
                    <Stepper.Step icon={<Icon icon={'ic:twotone-mark-email-read'} width={24} height={24}/>}/>
                    <Stepper.Step icon={<Icon icon={'ic:twotone-person-add-alt'} width={24} height={24}/>}/>
                    <Stepper.Step icon={<Icon icon={'ic:twotone-perm-phone-msg'} width={24} height={24}/>}/>
                  </Stepper>

                  <h6>{returnCurrentStepTitle()}</h6>

                  {
                    step === 0 &&
                    <RegistrationForm
                        onStepChange={handleStepChange}
                        onSubmit={handleRegisterSubmit}/>
                  }
                  {
                    step === 1 &&
                    <PersonalInfoForm
                        onStepChange={handleStepChange}
                        onSubmit={handlePersonalInfoSubmit}/>
                  }
                  {
                    step === 2 &&
                    <ContactForm
                        onStepChange={handleStepChange}
                        onSubmit={handleContactSubmit}
                        onVerifySubmit={handleVerifySubmit}
                        onResend={handleResend}/>
                  }
                </ContentSpace>
              </div>
              <div
                  className="order-first order-lg-last order-xl-last order-xxl-last col-12 col-lg-6 col-xl-7 col-xxl-7">
                <HeroSpace>
                  <picture style={{width: '100%'}}>
                    <source media={`(max-width: ${SM - 1}px)`} type="image/jpeg"
                            srcSet={renderImageSize('login-reading-lady.jpg', 375, 450)} height={450} width={375}/>
                    <source media={`(max-width: ${MD - 1}px)`} type="image/jpeg"
                            srcSet={renderImageSize('login-reading-lady.jpg', 768, 600)} height={768} width={600}/>
                    <source media={`(max-width: ${LG - 1}px)`} type="image/jpeg"
                            srcSet={renderImageSize('login-reading-lady.jpg', 1024, 800)} height={800} width={1024}/>
                    <HeroImage src={renderImageSize('login-reading-lady.jpg', 1920, 1280)} alt="registration-banner"/>
                  </picture>
                </HeroSpace>
                <GradientSpace>
                  <h1 className={'display-1'} style={{color: SECONDARY_COLOR}}>Let&#39;s Get You Started</h1>
                </GradientSpace>
              </div>
            </div>
          </div>
        </RegisterPage>
      </>
  )
};

export default Register;
