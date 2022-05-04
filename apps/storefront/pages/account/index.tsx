import React from 'react';
import {Icon} from "@iconify/react";
import styled from "styled-components";
import {useRouter} from "next/router";

import Breadcrumbs from "../../components/elements/Breadcrumbs";
import PageHeadings from "../../components/elements/PageHeadings";
import PageWrapper from "../../components/elements/PageWrapper";

import {AUTH_COOKIE, PRIMARY_COLOR, SM} from "../../core/_variables";
import cookie from "js-cookie";
import useSWR from "swr";
import Head from "next/head";

interface Props {
}

const ProfileOptionSpace = styled.div`
  padding: 1.5rem;
  margin-bottom: 2rem;
  border: 1px solid #ddd;
  border-radius: 1rem;
  cursor: pointer;
  transition: all 0.5s ease;
  
  @media screen and (max-width: ${SM - 1}px) {
    padding: 1rem;
    margin-bottom: 1rem;
    border-radius: 0.5rem;
  }
  
  &:hover {
   border: 1px solid ${PRIMARY_COLOR};
  }
`;

const ProfileOptionTitle = styled.h6`
  display: flex;
  align-items: center;
  line-height: 1;
`;

const ProfileOptionDesc = styled.p`
  margin-bottom: 0;
`;

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Account', href: '/account', isActive: true},
];

const PROFILE_OPTIONS = [
  {link: '/account/orders', title: 'Orders', icon: 'bx:bx-cart', description: 'Your current and past order history'},
  {link: '/account/wishlist', title: 'Wishlist', icon: 'bx:bx-heart', description: 'See all the books you\'ve wishlisted'},
  {link: '/account/profile', title: 'Profile', icon: 'bx:bx-user-circle', description: 'Update personal & contact info'},
  {link: '/account/addresses', title: 'Addresses', icon: 'bx:bx-location-plus', description: 'View and update addresses for orders'},
  // {link: '/account/payments', title: 'Payment History', icon: 'bx:bx-credit-card-alt', description: 'All the payment history of your orders and refunds'},
  // {link: '/account/security', title: 'Login & Security', icon: 'bx:bx-lock-open', description: 'Make your account more secure. Update Password'},
  // {link: '/account/notifications', title: 'Notification Prefrences', icon: 'bx:bx-bell', description: 'Choose how you would like to be contacted'},
  // {link: '/account/rewards', title: 'Rewards', icon: 'bx:bx-gift', description: 'Rewards you\'ve earned through purchases and other'},
  // {link: '/account/subscription', title: 'Subscription', icon: 'bx:bx-book-reader', description: 'One subscription to rule them all!'},
];

const Account: React.FC<Props> = () => {
  const router = useRouter();
  const isLoggedIn = cookie.get(AUTH_COOKIE);

  const {data: person} = useSWR({url: isLoggedIn ? `/auth/me` : null, withCredentials: true});

  function handleRedirect(route: string) {
    router.push(route)
  }

  return (
      <>
      <Head>
        <title>Account | Pageaters</title>
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
          <PageHeadings title={`Hello, ${person?.data?.fullName ? person?.data?.fullName : 'Reader'}`}/>
        </section>
        <section>
          <div className="custom-container">
            <div className="row">
              {
                PROFILE_OPTIONS.map((option, index) => {
                  return (
                      <div key={index} className="col-xxl-3 col-xl-3 col-lg-6 col-sm-6 col-12">
                        <ProfileOptionSpace onClick={() => handleRedirect(option.link)}>
                          <ProfileOptionTitle>
                            <Icon width="30" height="30" icon={option.icon}/>
                            &nbsp;<span>{option.title}</span>
                          </ProfileOptionTitle>
                          <ProfileOptionDesc>{option.description}</ProfileOptionDesc>
                        </ProfileOptionSpace>
                      </div>
                  )
                })
              }

            </div>
          </div>
        </section>
      </PageWrapper>
      </>
  )
};

export default Account;
