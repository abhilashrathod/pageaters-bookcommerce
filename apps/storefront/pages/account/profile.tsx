import React, {useEffect, useState} from 'react';
import styled from 'styled-components';
import {get} from 'lodash';
import {useForm} from "@mantine/form";
import cookie from "js-cookie";
import useSWR, {mutate} from "swr";
import {Skeleton, Tooltip} from "@mantine/core";
import {Icon} from "@iconify/react";
import Head from "next/head";
import moment from 'moment';
import axios from "axios";
import {useNotifications} from "@mantine/notifications";
import {useInterval} from "@mantine/hooks";

import PageWrapper from "../../components/elements/PageWrapper";
import Breadcrumbs from "../../components/elements/Breadcrumbs";
import PageHeadings from "../../components/elements/PageHeadings";
import EmptySectionMessage from "../../components/elements/FailedToLoad";
import AppIconButton from "../../components/form-controls/IconButton";
import AppButton, {ButtonSizes, ButtonVariants} from "../../components/form-controls/Button";
import AppTextInput from "../../components/form-controls/AppTextInput";

import {IUser} from "../../schemas/user";
import {AUTH_COOKIE, PRIMARY_COLOR, PRIMARY_DANGER, PRIMARY_SUCCESS, SECONDARY_COLOR, SM} from "../../core/_variables";

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Account', href: '/account'},
  {title: 'Profile Info', href: '/account/profile', isActive: true},
];

interface Props {
}

const InfoCard = styled.div`
  padding: 1.5rem;
  border: 1px solid #ddd;
  border-radius: 1rem;
  
  @media screen and (max-width: ${SM - 1}px) {
    border: none;
    border-bottom: 1px solid #ddd;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    margin-bottom: 1rem;
    padding: 0;
  }
`;

const ContentWrapper = styled.div`  
  display: flex;
  flex-direction: column; 
  justify-content: space-between;
`;

const Content = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
`;

const SubmitButton = styled.button`
  color: ${SECONDARY_COLOR};
  background: ${PRIMARY_COLOR};
  font-size: 1.2rem;
  line-height: 1.486rem;
  padding: 14px 24px;
  border-radius: 0.5rem;
  margin-bottom: 1.2rem;
  box-shadow: 0 2px 10px 0 rgb(0 0 0 / 16%);
`;

interface PersonalCardProps {
  user: IUser;
  onSubmit: () => void;
}

const PersonalInfoCard = ({user, onSubmit}: PersonalCardProps) => {
  const notif = useNotifications();

  const [editMode, setEditMode] = useState(false);

  const personalDetailsForm = useForm({
    initialValues: {
      fullName: user.fullName,
    },

    validate: {
      fullName: (value) => value == '' ? 'Please provide name' : null,
    }
  });

  function toggleEditMode() {
    setEditMode((e) => !e);
  }

  async function handleSubmit(values: any) {
    try {
      await axios.put(`/auth/me`, values, {withCredentials: true});
      notif.showNotification({message: 'Profile Info Updated', color: 'green', autoClose: 3000});
      onSubmit();
      toggleEditMode();
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  return (
      <InfoCard>
        <h6>Personal Info</h6>
        <ContentWrapper>
          <Content>
            <div>
              <p>
                <strong>Primary Email Address</strong><br/>
                <span>{user.email}</span>
              </p>
              <p>
                <strong>Full Name</strong><br/>
                <span>{user.fullName}</span>
              </p>
            </div>

            <Tooltip label={user.emailVerified ? 'Email Verified' : 'Email Not Verified'} withArrow>
              <span>
                  {
                    user.emailVerified
                        ? <Icon icon={'ic:twotone-check-circle'} width={24} height={24} color={PRIMARY_SUCCESS}/>
                        : <Icon icon={'ic:twotone-highlight-off'} width={24} height={24} color={PRIMARY_DANGER}/>
                  }
                </span>
            </Tooltip>
          </Content>
          <div>
            <AppIconButton variant={ButtonVariants.Secondary} styles={{paddingLeft: 0}} onClick={toggleEditMode}
                           size={ButtonSizes.Small}>
              {editMode
                  ? <><Icon icon={'ic:twotone-close'} width={16} height={16}/>&nbsp;Close</>
                  : <><Icon icon={'bx:edit-alt'} width={16} height={16}/>&nbsp;Edit</>}
            </AppIconButton>
          </div>
          {
            editMode && (
                <div style={{marginTop: '1rem'}}>
                  <form onSubmit={personalDetailsForm.onSubmit(handleSubmit)}>
                    <AppTextInput id={'fullName'}
                                  required={true}
                                  label={'Full Name'}
                                  type={'text'}
                                  {...personalDetailsForm.getInputProps('fullName')}/>

                    <SubmitButton type={'submit'}>Save</SubmitButton>
                  </form>
                </div>
            )
          }
        </ContentWrapper>
      </InfoCard>
  )
};

interface ContactCardProps {
  user: IUser;
  onVerifySubmit: () => void;
}

const ContactNoCard = ({user, onVerifySubmit}: ContactCardProps) => {
  const [seconds, setSeconds] = useState(75);
  const [editMode, setEditMode] = useState(false);
  const interval = useInterval(() => setSeconds((s) => s - 1), 1000);
  const [showOtpForm, setShowOtpForm] = useState(false);

  const notif = useNotifications();

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

    validate: {
      contactNo: (value) => /^\d{10}$/.test(value) ? null : 'Please provide valid contact without country code'
    },
  });

  const otpForm = useForm({
    initialValues: {
      otp: '',
    },

    validate: {
      otp: (value) => /^\d{6}$/.test(value) ? null : 'Please enter valid OTP code with 6 digits'
    },
  });

  function changeNumber() {
    setShowOtpForm(false);
  }

  async function handleSubmit(values: any) {
    try {
      await axios.post(`/auth/contact/send`, values, {withCredentials: true});
      notif.showNotification({message: 'Verification code sent on provided no.', color: 'green', autoClose: 5000});
      setSeconds(75);
      interval.start();
      setShowOtpForm(true);
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  async function handleVerifySubmit(values: any) {
    try {
      await axios.post(`/auth/contact/verify`, values, {withCredentials: true});
      notif.showNotification({message: 'Verification Completed. Account verified!', color: 'green', autoClose: 3000});
      onVerifySubmit();
      interval.stop();
      setSeconds(0);
      setEditMode(false);
      setShowOtpForm(false);
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  async function handleResend() {
    try {
      await axios.post(`/auth/contact/resend`, {}, {withCredentials: true});
      notif.showNotification({message: 'Verification code sent on provided no.', color: 'green', autoClose: 3000});
      setSeconds(75);
      interval.start();
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  function toggleEditMode() {
    setEditMode((e) => !e);
  }

  return (
      <InfoCard>
        <h6>Contact</h6>
        <ContentWrapper>
          <Content>
            <div>
              <strong>Primary Contact No</strong><br/>
              <span>{user.contactNo ? user.contactNo : 'Not Provided'}</span>
            </div>
            <Tooltip label={user.contactVerified ? 'Contact Verified' : 'Contact Not Verified'} withArrow>
              <span>
                {
                  user.contactVerified
                      ? <Icon icon={'ic:twotone-check-circle'} width={24} height={24} color={PRIMARY_SUCCESS}/>
                      : <Icon icon={'ic:twotone-highlight-off'} width={24} height={24} color={PRIMARY_DANGER}/>
                }
              </span>
            </Tooltip>
          </Content>
          <div>
            <AppIconButton variant={ButtonVariants.Secondary} onClick={toggleEditMode} styles={{paddingLeft: 0}}
                           size={ButtonSizes.Small}>
              {editMode
                  ? <><Icon icon={'ic:twotone-close'} width={16} height={16}/>&nbsp;Close</>
                  : <><Icon icon={'bx:edit-alt'} width={16} height={16}/>&nbsp;Edit</>}
            </AppIconButton>
          </div>
          {
            editMode && (
                <div style={{marginTop: '1rem'}}>
                  <>
                    {
                      !showOtpForm
                          ? <form onSubmit={contactForm.onSubmit(handleSubmit)}>
                            <AppTextInput id={'contactNo'}
                                          required={true}
                                          label={'Contact No'}
                                          type={'tel'}
                                          {...contactForm.getInputProps('contactNo')}/>
                            <SubmitButton type="submit">Save</SubmitButton>
                          </form>
                          : <form onSubmit={otpForm.onSubmit(handleVerifySubmit)}>
                            <AppTextInput id={'otp'}
                                          required={true}
                                          label={'OTP Code (6 Digits)'}
                                          type={'text'}
                                          {...otpForm.getInputProps('otp')}/>
                            <SubmitButton type="submit">Verify</SubmitButton>
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
                </div>
            )
          }

        </ContentWrapper>
      </InfoCard>
  )
};

interface ChangePasswordProps {
  user: IUser;
}

const ChangePasswordCard = ({user}: ChangePasswordProps) => {
  const notif = useNotifications();

  const [editMode, setEditMode] = useState(false);

  const changePasswordForm = useForm({
    initialValues: {
      password: '',
      newPassword: '',
      confirmPassword: '',
    },

    validate: {
      password: (value) => value == '' ? 'Please provide current password' : null,
      newPassword: (value) => value == '' ? 'Please provide your new password' : null,
      confirmPassword: (value, values) => value !== values.newPassword ? 'Passwords did not match' : null,
    }
  });

  async function handleSubmit(values: any) {
    try {
      await axios.put(`/auth/password`, values, {withCredentials: true});
      notif.showNotification({message: 'Password updated.', color: 'green', autoClose: 3000});
      toggleEditMode();
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  function toggleEditMode() {
    setEditMode((e) => !e);
  }

  return (
      <InfoCard>
        <h6>Security</h6>
        <ContentWrapper>
          <Content>
            <div>
              <p>
                <strong>Change Password</strong><br/>
                <span>Last Changed: {moment(user.lastPasswordSetAt).format('DD MMM YYYY')}</span>
              </p>
              <p>
                <strong>Last login</strong><br/>
                <span>Last Login At: {moment(user.lastLoginAt).format('DD MMM YYYY')}</span>
              </p>
            </div>
          </Content>
          <div>
            <AppIconButton variant={ButtonVariants.Secondary} styles={{paddingLeft: 0}} onClick={toggleEditMode}
                           size={ButtonSizes.Small}>
              {editMode
                  ? <><Icon icon={'ic:twotone-close'} width={16} height={16}/>&nbsp;Close</>
                  : <><Icon icon={'bx:edit-alt'} width={16} height={16}/>&nbsp;Change</>}
            </AppIconButton>
          </div>
          {
            editMode && (
                <div style={{marginTop: '1rem'}}>
                  <form onSubmit={changePasswordForm.onSubmit(handleSubmit)}>
                    <AppTextInput id={'password'}
                                  required={true}
                                  label={'Current Password'}
                                  type={'password'}
                                  {...changePasswordForm.getInputProps('password')}/>
                    <AppTextInput id={'newPassword'}
                                  required={true}
                                  label={'New Password'}
                                  type={'password'}
                                  {...changePasswordForm.getInputProps('newPassword')}/>
                    <AppTextInput id={'confirmPassword'}
                                  required={true}
                                  label={'Confirm Password'}
                                  type={'password'}
                                  {...changePasswordForm.getInputProps('confirmPassword')}/>
                    <SubmitButton type={'submit'}>Save</SubmitButton>
                  </form>
                </div>
            )
          }
        </ContentWrapper>
      </InfoCard>
  )
};

const Profile: React.FC<Props> = () => {
  const notif = useNotifications();
  const isLoggedIn = cookie.get(AUTH_COOKIE);

  const {data, error} = useSWR({url: isLoggedIn ? `/auth/me` : null, withCredentials: true});

  const user = get(data, 'data', null);

  function updateUser() {
    mutate({url: '/auth/me', withCredentials: true});
  }

  if (error) return <PageWrapper><EmptySectionMessage title={'Error while loading account info...'}/></PageWrapper>;

  return (
      <>
        <Head>
          <title>Customer Profile | Pageaters</title>
        </Head>
        <PageWrapper>
          <div className="custom-container">
            <div className="row">
              <div className="col">
                <Breadcrumbs items={BREADCRUMBS_ITEMS}/>
              </div>
            </div>
          </div>
          <section>
            <PageHeadings title={'Profile'}/>
          </section>
          <section>
            {
              !user
                ? <div className="custom-container">
                    <div className="row">
                      {
                        [0, 0, 0].map((j, i) => (
                            <div key={i} className="col-xxl-3 col-xl-3 col-lg-4 col-md-6 col-12">
                              <Skeleton height={200} radius="lg" mb={'lg'}/>
                              <Skeleton height={12} mt={6} width="75%" radius="xl"/>
                              <Skeleton height={12} mt={6} width="50%" radius="xl"/>
                              <Skeleton height={12} mt={6} width="25%" radius="xl"/>
                            </div>
                        ))
                      }
                    </div>
                  </div>
                :  <div className="custom-container">
                    <div className="row">
                      <div className="col-xxl-4 col-xl-4 col-12">
                        <PersonalInfoCard user={user} onSubmit={updateUser}/>
                      </div>
                      <div className="col-xxl-4 col-xl-4 col-12">
                        <ContactNoCard user={user} onVerifySubmit={updateUser}/>
                      </div>
                      <div className="col-xxl-4 col-xl-4 col-12">
                        <ChangePasswordCard user={user}/>
                      </div>
                    </div>
                  </div>
            }

          </section>
        </PageWrapper>
      </>
  )
};

export default Profile;
