import React, {useEffect, useState} from 'react';
import useSWR from "swr";
import Head from "next/head";
import cookie from "js-cookie";
import {useRouter} from "next/router";
import axios from "axios";
import {get, isString} from 'lodash';
import styled from "styled-components";
import {showNotification} from "@mantine/notifications";
import {Accordion, Alert, Checkbox, Loader, Radio, Skeleton, Textarea, TextInput} from "@mantine/core";

import PageWrapper from "../../components/elements/PageWrapper";
import PageHeadings from "../../components/elements/PageHeadings";
import Breadcrumbs from "../../components/elements/Breadcrumbs";
import CartBreakdown from "../../components/cart-elements/cart-breakdown";
import EmptyMessageWithGraphic from "../../components/elements/EmptyMessageWithGraphic";
import EmptySectionMessage from "../../components/elements/FailedToLoad";
import ProductItem from "../../components/cart-elements/cart-product-item";
import BundleItem from "../../components/cart-elements/cart-bundle-item";
import AppButton, {ButtonSizes, ButtonVariants} from "../../components/form-controls/Button";
import {InputWrapper} from "../../components/form-controls/AppTextInput";

import {AUTH_COOKIE, GIFT_PACKAGES, LIGHTER_PRIMARY_COLOR, LIGHTEST_PRIMARY_COLOR, SM} from "../../core/_variables";

import emptyCart from "../../public/illustrations/empty-cart.svg";
import {completePurchase} from "../../core/_analytics";
import PageLoader from "../../components/elements/PageLoading";
import MysteryBoxItem from "../../components/cart-elements/cart-mystery-box";

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
  const router = useRouter();

  const {data: orderRes, error} = useSWR({url: isLoggedIn ? `/orders/retrieve` : null, withCredentials: true});
  const {data: userRes} = useSWR({url: isLoggedIn ? `/auth/me` : null, withCredentials: true});
  const {data: cartRes} = useSWR({url: isLoggedIn ? `/cart/retrieve` : null, withCredentials: true});

  const [paymentMethod, setPaymentMethod] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [opened, setOpened] = useState(false);
  const [giftOptions, setGiftOptions] = useState({
    isGift: false,
    options: {package: '', cost: 0, details: 'Includes special gift wrapping', message: '', from: ''}
  });

  useEffect(() => {
    initializeRazorpay();
  }, []);

  const user = get(userRes, 'data', null);
  const order = get(orderRes, 'data', null);
  const cart = get(cartRes, 'data', null);

  const address = get(orderRes, 'data.deliveryAddress', null);
  const books = get(cartRes, 'data.products', []);
  const bundles = get(cartRes, 'data.bundles', []);
  const mysteryBoxes = get(cartRes, 'data.mysteryBoxes', []);

  async function createOrder() {
    try {
      setOpened(true);
      const payload = {
        method: paymentMethod,
        instructions: deliveryInstructions,
        giftOptions: {
          isGift: giftOptions.isGift,
          details: {
            package: giftOptions.options.package,
            from: giftOptions.options.from,
            message: giftOptions.options.message,
            cost: giftOptions.options.cost
          },
        }
      };
      const response$ = await axios.post(`/orders/create`, payload, {withCredentials: true});
      const {data, message} = await response$.data;
      showNotification({message: message, color: 'green', autoClose: 5000});

      if (paymentMethod === 'online') {
        handleOrderConfirm(data);
      }

      if (paymentMethod === 'cod') {
        setOpened(false);
        router.replace(`/order-confirm/${data.orderId}`);
        completePurchase(cart, order, 'order', 'Order');
      }

    } catch (e: any) {
      setOpened(false);
      showNotification({message: e.message, color: 'red', autoClose: 3000});
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
        setOpened(false);
        completePurchase(cart, order, 'order', 'Order'); // for analytics
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

  function handleChangePaymentMethod(e: string) {
    setPaymentMethod(e);
  }

  function handleChangeDeliveryInst(e: any) {
    setDeliveryInstructions(e.currentTarget.value)
  }

  function handleGiftToggle(e: any) {
    const val = e.currentTarget.checked;
    setGiftOptions((prevState) => ({
      ...prevState,
      isGift: val
    }))
  }

  function handlePackageChange(prop: string, e: any) {
    const selectedPackage = GIFT_PACKAGES.find((x) => x.title === e);
    setGiftOptions((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        package: e,
        cost: selectedPackage?.cost || 0,
        details: selectedPackage?.details || '',
      }
    }));
  }

  function handleFieldChange(prop: string ,e: any) {
    const val = get(e, 'currentTarget.value', e);

    setGiftOptions((prevState) => ({
      ...prevState,
      options: {
        ...prevState.options,
        [prop]: val,
      }
    }));
  }

  if (error)
    return (
        <PageWrapper>
          <EmptySectionMessage title={'Error Processing Order.. Please try again later.'}/>
        </PageWrapper>
    );

  if (books.length === 0 && bundles.length === 0 && mysteryBoxes.length === 0)
    return (
        <PageWrapper>
          <EmptyMessageWithGraphic title={'Cart is empty'} illustration={emptyCart} illustrationHeight={'300px'}
                                   illustrationWidth={'300px'}/>
        </PageWrapper>
    );

  return (
      <>
        <Head>
          <title>Checkout | Pageaters</title>
        </Head>
        <PageLoader visible={opened}>
          <Loader color="orange" size="xl"/>
          <h3 style={{textAlign: "center"}}>Processing your order</h3>
          <p style={{textAlign: "center"}}>Please don&apos;t close or refresh the window</p>
        </PageLoader>
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
                          <Accordion defaultValue={'payment-method'}>
                            <Accordion.Item value={'gift'}>
                              <Accordion.Control>
                                Gift Options
                              </Accordion.Control>
                              <Accordion.Panel>
                                <p>
                                  <Checkbox
                                      label="Send this order as gift"
                                      onChange={handleGiftToggle}
                                      checked={giftOptions.isGift}
                                  />
                                </p>
                                {
                                  giftOptions.isGift && (
                                      <>
                                        <p>
                                          <Radio.Group
                                              label="Choose a package for your gift"
                                              value={giftOptions.options.package}
                                              onChange={(e) => handlePackageChange('package', e)}
                                              description="Please choose an option for your gift packaging">
                                            {
                                              GIFT_PACKAGES.map((item) => <Radio value={item.title} key={item.title}
                                                                                 label={`${item.title} ₹${item.cost}`}/>)
                                            }
                                          </Radio.Group>
                                        </p>
                                        <p>
                                          <TextInput
                                              placeholder="Sender Name"
                                              label="From"
                                              value={giftOptions.options.from}
                                              onChange={(e) => handleFieldChange('from', e)}
                                              withAsterisk
                                          />
                                        </p>
                                        <p>
                                          <Textarea
                                              placeholder="Add your message"
                                              label="Gift Message"
                                              autosize
                                              minRows={2}
                                              maxRows={5}
                                              onChange={(e) => handleFieldChange('message', e)}
                                              value={giftOptions.options.message}
                                          />
                                        </p>
                                        <Alert title="Package details" color="gray">
                                          <p>{giftOptions.options.details}</p>
                                        </Alert>
                                      </>
                                  )
                                }
                              </Accordion.Panel>
                            </Accordion.Item>
                            <Accordion.Item value={'address'}>
                              <Accordion.Control>
                                Delivery Address
                              </Accordion.Control>
                              <Accordion.Panel>
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
                              </Accordion.Panel>
                            </Accordion.Item>
                            <Accordion.Item value={'products'}>
                              <Accordion.Control>
                                In Cart
                              </Accordion.Control>
                              <Accordion.Panel>
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
                                    {
                                      mysteryBoxes.map((item: any) => {
                                        return (
                                            <ProductListItem key={item._id}>
                                              <MysteryBoxItem viewOnly={true} mysteryBox={item}/>
                                            </ProductListItem>
                                        )
                                      })
                                    }
                                  </ProductList>
                                </CartItemsContent>
                              </Accordion.Panel>
                            </Accordion.Item>
                            <Accordion.Item value={'payment-method'}>
                              <Accordion.Control>
                                Payment Method
                              </Accordion.Control>
                              <Accordion.Panel>
                                <InputWrapper>
                                  <Radio.Group value={paymentMethod} onChange={handleChangePaymentMethod} spacing="xs"
                                               orientation="vertical" label="Please Select Preferred Payment Method"
                                               required>
                                    <Radio value="online" label="Pay Online (Credit Cards, Debit Cards, Wallets, UPIs)"/>
                                    <Radio value="cod" label="Cash on Delivery"/>
                                  </Radio.Group>
                                </InputWrapper>
                                <InputWrapper>
                                  <Textarea
                                      placeholder="Preferences are used to plan your delivery. However, shipments can sometimes arrive early or later than planned."
                                      value={deliveryInstructions}
                                      onChange={handleChangeDeliveryInst}
                                      label="Delivery Instructions (If any)"
                                  />
                                </InputWrapper>
                              </Accordion.Panel>
                            </Accordion.Item>
                          </Accordion>
                        </OrderSpace>
                      </div>
                      <div className="col-xl-4 col-md-4 col-12">
                        <div className="breakdown">
                          <h5>Order Summary</h5>

                          {cart && (
                              <>
                                <CartBreakdown cart={cart}
                                               shippingCharges={order?.shipping}
                                               giftCharges={giftOptions.isGift ? giftOptions.options.cost : undefined}
                                               orderTotal={order?.total}/>
                                <AppButton variant={ButtonVariants.Accent}
                                           size={ButtonSizes.Large}
                                           disabled={!paymentMethod}
                                           styles={{width: '100%', display: 'block'}}
                                           onClick={createOrder}>
                                  {paymentMethod ? 'Place Order' : 'Please Select Payment Method'}
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
      </>
  )
};

export default Checkout;
