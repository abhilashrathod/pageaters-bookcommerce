import React, {useEffect} from 'react';
import useSWR from "swr";
import cookie from "js-cookie";
import {useRouter} from "next/router";
import axios from "axios";
import {get} from 'lodash';
import styled from "styled-components";
import {useNotifications} from "@mantine/notifications";
import {Skeleton} from "@mantine/core";

import PageWrapper from "../../components/elements/PageWrapper";
import PageHeadings from "../../components/elements/PageHeadings";
import Breadcrumbs from "../../components/elements/Breadcrumbs";
import CartBreakdown from "../../components/cart-elements/cart-breakdown";
import EmptyMessageWithGraphic from "../../components/elements/EmptyMessageWithGraphic";
import EmptySectionMessage from "../../components/elements/FailedToLoad";
import ProductItem from "../../components/cart-elements/cart-product-item";
import BundleItem from "../../components/cart-elements/cart-bundle-item";
import AppButton, {ButtonSizes, ButtonVariants} from "../../components/form-controls/Button";

import {AUTH_COOKIE, LIGHTER_PRIMARY_COLOR, LIGHTEST_PRIMARY_COLOR, SM} from "../../core/_variables";

import emptyCart from "../../public/illustrations/empty-cart.svg";

interface Props {
}

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Cart', href: '/cart'},
  {title: 'Addresses', href: '/address-select'},
  {title: 'Checkout', href: '', isActive: true},
];

const OrderSpace = styled.div`
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
    margin-bottom: 1.25rem;
    border: none;
    
    &:hover {
      border: none;
    }
  }
`;

const AddressContent = styled.div`
  flex-direction: column;
  display: flex;
  width: 100%;
  position: relative;
`;

const AddressTitle = styled.div`
  font-weight: 600;
`;

const AddressContactInfo = styled.span`
  color: ${LIGHTER_PRIMARY_COLOR}
`;

const AddressDetails = styled.div`
  margin-bottom: 0.5rem;
`;

const CartItemsContent = styled.div``;

const ProductList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const ProductListItem = styled.li`
  margin: 1.25rem 0;
  border-bottom: 1px solid #ddd;
  padding-bottom: 1.25rem;
  
  &:first-child {
    margin-top: 0;
  }

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 0;
  }
`;

const OrderLoading = () => (
    <section>
      <div className="custom-container">
        <div className="row">
          <div className="col-xl-8 col-md-8 col-12">
            <OrderSpace>
              <ul>
                {[1, 2, 3].map((j, i) => {
                  return (
                      <div key={j + i} className="row">
                        <div className="col-12">
                          <Skeleton height={12} mb={12} width="75%" radius="xl"/>
                          <Skeleton height={12} mb={12} width="50%" radius="xl"/>
                          <Skeleton height={12} mb={20} width="25%" radius="xl"/>
                        </div>
                      </div>
                  )
                })}
              </ul>
            </OrderSpace>
          </div>
        </div>
      </div>
    </section>
);

const Checkout: React.FC<Props> = () => {
  const isLoggedIn = cookie.get(AUTH_COOKIE);

  const notif = useNotifications();
  const router = useRouter();

  const {data: orderRes, error} = useSWR({url: isLoggedIn ? `/orders/retrieve` : null, withCredentials: true});
  const {data: userRes} = useSWR({url: isLoggedIn ? `/auth/me` : null, withCredentials: true});
  const {data: cartRes} = useSWR({url: isLoggedIn ? `/cart/retrieve` : null, withCredentials: true});

  useEffect(() => {
    initializeRazorpay();
  }, []);

  const user = get(userRes, 'data', null);
  const order = get(orderRes, 'data', null);
  const cart = get(cartRes, 'data', null);

  const address = get(orderRes, 'data.deliveryAddress', null);
  const books = get(cartRes, 'data.products', []);
  const bundles = get(cartRes, 'data.bundles', []);

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

  function initializeRazorpay() {
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

  if (error)
    return (
        <PageWrapper>
          <EmptySectionMessage title={'Error Processing Order.. Please try again later.'}/>
        </PageWrapper>
    );

  if (books.length === 0 && bundles.length === 0)
    return (
        <PageWrapper>
          <EmptyMessageWithGraphic title={'Cart is empty'} illustration={emptyCart} illustrationHeight={'300px'} illustrationWidth={'300px'}/>
        </PageWrapper>
    );

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
        {
          order
              ? <section>
                <div className="custom-container">
                  <div className="row">
                    <div className="col-xl-8 col-md-8 col-12">
                      <OrderSpace>
                        {
                          address && (
                              <AddressContent>
                                <h6>Delivery Address</h6>
                                <AddressTitle>
                                  {address.fullName} ({address.type.toLowerCase()})
                                  | <AddressContactInfo>{address.contactNo}</AddressContactInfo> | <AddressContactInfo>{address.email}</AddressContactInfo>
                                </AddressTitle>
                                <AddressDetails>
                                  {address.addressLine1 + ', '} {address.addressLine2 + ', '} {address.landmark} {address.city + ', '} {address.state + ' - '} {address.pinCode}
                                </AddressDetails>
                              </AddressContent>
                          )
                        }
                      </OrderSpace>
                      <OrderSpace>
                        <CartItemsContent>
                          <h6>Products</h6>

                          <ProductList>
                            {
                              books.map((item: any) => {
                                return (
                                    <ProductListItem key={item._id}>
                                      <ProductItem book={item} viewOnly={true}/>
                                    </ProductListItem>
                                )
                              })
                            }
                            {
                              bundles.map((item: any) => {
                                return (
                                    <ProductListItem key={item._id}>
                                      <BundleItem viewOnly={true} cartBundle={item}/>
                                    </ProductListItem>
                                )
                              })
                            }
                          </ProductList>
                        </CartItemsContent>
                      </OrderSpace>
                    </div>
                    <div className="col-xl-4 col-md-4 col-12">
                      <div className="breakdown">
                        <h5>Order Summary</h5>

                        {cart && (
                            <>
                              <CartBreakdown cart={cart} shippingCharges={order?.shipping} orderTotal={order?.total}/>
                              <AppButton variant={ButtonVariants.Accent}
                                         size={ButtonSizes.Large}
                                         styles={{width: '100%', display: 'block'}}
                                         onClick={createOrder}>
                                Place Order
                              </AppButton>
                            </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
              : <OrderLoading/>
        }
      </PageWrapper>
  )
};

export default Checkout;
