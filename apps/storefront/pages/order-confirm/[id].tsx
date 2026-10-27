import React from 'react';
import styled from "styled-components";
import {useRouter} from "next/router";
import {random} from 'lodash';
import {Center} from "@mantine/core";
import Head from "next/head";

import PageWrapper from "../../components/elements/PageWrapper";
import AppButton, {ButtonVariants} from "../../components/form-controls/Button";

import graphic from '../../public/illustrations/order-confirm.svg'

interface Props {
}

const GREETINGS = [
  `You're awesome! Thanks for your order`,
  `You're a hero! Thanks for your order`,
  `Thanks for Supporting Local Business!`,
  `Great news! We’ve got your order`,
  `Order Received,! We're on it.`,
  `We're your new bookish friends. Thanks for the order!`,
  `Hey Pageater, your order is received!`
];

const IllustrationImage = styled.img`
  width: ${(props) => props.width};
  height: ${(props) => props.height};
  margin-bottom: 2rem;
`;

const OrderConfirm: React.FC<Props> = () => {
  const router = useRouter();

  function navigateToOrders() {
    router.replace('/account/orders');
  }

  function randomTitles() {
    return GREETINGS[random(0, 6)];
  }

  return (
      <>
        <Head>
          <title>Order Confirmed | Pageaters</title>
        </Head>
        <PageWrapper>
          <section>
            <div className="custom-container">
              <Center>
                <IllustrationImage
                    alt="order-confirmation"
                    src={graphic.src}
                    width={'400px'}
                    height={'400px'}/>
              </Center>
            </div>
          </section>
          <section>
            <div className="custom-container">
              <div className="row">
                <div className="col">
                  <Center style={{flexDirection: 'column'}}>
                    <h1 style={{marginBottom: '1rem', textAlign: 'center'}}
                        className={'display-1'}>{randomTitles()}</h1>
                    <h6>Your Order No: {router.query.id}</h6>
                    <p>Track order status and information in orders page</p>
                    <AppButton variant={ButtonVariants.Accent} onClick={navigateToOrders}>View Orders</AppButton>
                  </Center>
                </div>
              </div>
            </div>
          </section>
        </PageWrapper>
      </>
  )
};

export default OrderConfirm;
