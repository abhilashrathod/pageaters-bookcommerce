import React, {useEffect, useState} from 'react';
import useSWR from "swr";
import cookie from "js-cookie";

import PageWrapper from "../../components/elements/PageWrapper";
import PageHeadings from "../../components/elements/PageHeadings";

import {AUTH_COOKIE, LIGHTEST_PRIMARY_COLOR, SM} from "../../core/_variables";
import Breadcrumbs from "../../components/elements/Breadcrumbs";
import styled from "styled-components";
import CartBreakdown from "../../components/cart-elements/cart-breakdown";
import AppButton, {ButtonSizes, ButtonVariants} from "../../components/form-controls/Button";
import axios from "axios";
import {useNotifications} from "@mantine/notifications";
import {useRouter} from "next/router";
import {useUser} from "../../contexts/user.context";

interface Props {
}

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Cart', href: '/cart'},
  {title: 'Addresses', href: '/address-select'},
  {title: 'Checkout', href: '', isActive: true},
];

const AddressSpace = styled.div`
  padding: 1.5rem;
  border: 1px solid #eee;
  border-radius: 1rem;
  margin-bottom: 2.5rem;
  transition: all 0.5s ease;
  
  &:hover {
    border: 1px solid ${LIGHTEST_PRIMARY_COLOR};
  }
  
  @media screen and (max-width: ${SM - 1}px) {
    padding: 0rem;
    margin-bottom: 0.825rem;
    border: none;
    
    &:hover {
      border: none;
    }
  }
`;

const Checkout: React.FC<Props> = () => {
  const [auth, setAuth] = useState(() => {
    return cookie.get(AUTH_COOKIE) ? true : false;
  });

  const notif = useNotifications();
  const router = useRouter();
  const {user} = useUser();

  const {data: order, error} = useSWR({url: auth ? `/orders/retrieve` : null, withCredentials: true});
  const {data: cart} = useSWR({url: auth ? `/cart/retrieve` : null, withCredentials: true});

  useEffect(() => {
    initializeRazorpay();
  }, []);

  async function createOrder() {
    try {
      const response$ = await axios.post(`/orders/create`, {}, {withCredentials: true});
      const {data, message} = await response$.data;
      notif.showNotification({message: message, color: 'green', autoClose: 5000});

      handleOrderConfirm(data);
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  async function handleOrderConfirm(orderData: any) {
    const options = {
      key: process.env.NEXT_PUBLIC_RAZOR_KEY, // Enter the Key ID generated from the Dashboard
      name: "Pageaters",
      currency: 'INR',
      amount: orderData.total,
      order_id: orderData.razorOrderId,
      description: "Thank you for your purchase!",
      prefill: {
        name: user?.fullName,
        email: user?.email,
        contact: user?.contactNo,
      },
      handler: (response: any) => {
        router.replace(`/order-confirm/${orderData.orderId}`);
      },
    };

    // @ts-ignore
    const paymentObject = new window.Razorpay(options);
    paymentObject.open();
  }

  function initializeRazorpay () {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        resolve(false);
      };

      document.body.appendChild(script);
    });
  }

  return (
      <PageWrapper>
        <div className="custom-container">
          <div className="row">
            <div className="col">
              <Breadcrumbs items={BREADCRUMBS_ITEMS}/>
            </div>
          </div>
        </div>
        <section>
          <PageHeadings title={'Checkout'}/>
        </section>
        <section>
          <div className="custom-container">
            <div className="row">
              <div className="col-xl-8 col-md-8 col-12">
                <AddressSpace>
                </AddressSpace>
              </div>
              <div className="col-xl-4 col-md-4 col-12">
                <div className="breakdown">
                  <h5>Order Summary</h5>
                  {cart && <CartBreakdown cart={cart?.data} shippingCharges={order?.data?.shipping}/>}

                  <AppButton variant={ButtonVariants.Accent}
                             size={ButtonSizes.Large}
                             styles={{width: '100%', display: 'block'}}
                             onClick={createOrder}>
                    Place Order
                  </AppButton>
                </div>
              </div>
            </div>
          </div>
        </section>
      </PageWrapper>
  )
};

export default Checkout;
