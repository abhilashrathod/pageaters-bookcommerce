import React, {useState} from 'react';
import useSWR, {mutate} from "swr";
import styled from "styled-components";
import cookie from "js-cookie";
import axios from "axios";
import {useNotifications} from "@mantine/notifications";
import {Skeleton} from '@mantine/core';
import {useRouter} from "next/router";
import {get} from 'lodash';

import PageWrapper from "../../components/elements/PageWrapper";
import PageHeadings from "../../components/elements/PageHeadings";
import Breadcrumbs from "../../components/elements/Breadcrumbs";
import FailedToLoad from '../../components/elements/FailedToLoad';
import CartBreakdown from "../../components/cart-elements/cart-breakdown";
import ProductItem from "../../components/cart-elements/cart-product-item";
import BundleItem from "../../components/cart-elements/cart-bundle-item";
import EmptyMessageWithGraphic from "../../components/elements/EmptyMessageWithGraphic";
import AppButton, {ButtonSizes, ButtonVariants} from "../../components/form-controls/Button";

import {AUTH_COOKIE, LIGHTEST_PRIMARY_COLOR, SM} from "../../core/_variables";

import graphic from '../../public/illustrations/empty-cart.svg';

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Cart', href: '', isActive: true},
];

interface Props {
}

const ProductListSpace = styled.div`
  padding: 1.5rem;
  margin-bottom: 2.5rem;
  border: 1px solid #eee;
  border-radius: 1rem;
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

const ProductList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const ProductListItem = styled.li`
  margin: 1.25rem 0;
  border-bottom: 1px solid #ddd;
  
  &:first-child {
    margin-top: 0;
  }

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 0;
  }
`;

const CartLoading = () => (
    <section>
      <div className="custom-container">
        <div className="row">
          <div className="col-xl-8 col-md-8 col-12">
            <ProductListSpace>
              <ul>
                {[1, 2, 3].map((j, i) => {
                  return (
                      <div key={j + i} className="row">
                        <div className="col-xxl-1 col-xl-2 col-3"><Skeleton circle height={75} mb={20} /></div>
                        <div className="col-xxl-10 col-xl-10 col-9">
                          <Skeleton height={12} mb={12} width="75%" radius="xl"/>
                          <Skeleton height={12} mb={12} width="50%" radius="xl"/>
                          <Skeleton height={12} mb={20} width="25%" radius="xl"/>
                        </div>
                      </div>
                  )
                })}
              </ul>
            </ProductListSpace>
          </div>
        </div>
      </div>
    </section>
);

const Cart: React.FC<Props> = () => {
  const [auth, setAuth] = useState(() => {
    return cookie.get(AUTH_COOKIE) ? true : false;
  });

  const router = useRouter();
  const notif = useNotifications();

  const {data, error} = useSWR({url: auth ? `/cart/retrieve` : null, withCredentials: true});

  function transferToAddress() {
    router.push(`/address-select`);
  }

  async function handleOnDelete(id: string) {
    try {
      await axios.delete(`/cart/remove/${id}`, {withCredentials: true});
      notif.showNotification({message: 'Book Removed from Cart', color: 'green', autoClose: 3000});

      updateCart();
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  async function handleOnBundleDelete(id: string) {
    try {
      await axios.delete(`/cart/remove/bundle/${id}`, {withCredentials: true});
      notif.showNotification({message: 'Bundle Removed from Cart', color: 'green', autoClose: 3000});

      updateCart();
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  async function handleQuantityChange(payload: any) {
    const {quantity, product} = payload;
    try {
      await axios.put(`/cart/update/${product}`, {quantity}, {withCredentials: true});
      notif.showNotification({message: 'Book Quantity Updated', color: 'green', autoClose: 3000});
      updateCart();
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  function updateCart() {
    mutate({url: `/cart/retrieve`, withCredentials: true});
  }

  if (error) return <PageWrapper><FailedToLoad title={'Error Loading Cart..'}/></PageWrapper>;

  const cart = get(data, 'data', null);
  const books = get(data, 'data.products', []);
  const bundles = get(data, 'data.bundles', []);

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
          <PageHeadings title={'Cart'}/>
        </section>
        {
          cart
              ? <section>
                  <div className="custom-container">
                    {
                      (books.length === 0 && bundles.length === 0)
                          ? <div className="row">
                            <div className="col-12">
                              <EmptyMessageWithGraphic title={'Add Some Books Here. Cart is Empty'} illustration={graphic} illustrationHeight={'300px'} illustrationWidth={'300px'}/>
                            </div>
                          </div>
                          : <div className="row">
                            <div className="col-xl-8 col-md-8 col-12">
                              <ProductListSpace>
                                <ProductList>
                                  {
                                    books.map((item: any) => {
                                      return (
                                          <ProductListItem key={item._id}>
                                            <ProductItem book={item} viewOnly={false} onDelete={handleOnDelete}
                                                         onQuantityChange={handleQuantityChange}/>
                                          </ProductListItem>
                                      )
                                    })
                                  }
                                  {
                                    bundles.map((item: any) => {
                                      return (
                                          <ProductListItem key={item._id}>
                                            <BundleItem viewOnly={false} onDelete={handleOnBundleDelete} cartBundle={item}/>
                                          </ProductListItem>
                                      )
                                    })
                                  }
                                </ProductList>
                              </ProductListSpace>
                            </div>
                            <div className="col-xl-4 col-md-4 col-12">
                              <div className="breakdown">
                                <h5>Bill Details</h5>
                                {cart && <CartBreakdown cart={cart} shippingCharges={'Calculated at Checkout'} orderTotal={cart.subTotal}/>}
                                <AppButton variant={ButtonVariants.Accent}
                                           size={ButtonSizes.Large}
                                           styles={{width: '100%', display: 'block'}}
                                           onClick={transferToAddress}>
                                  Proceed to Buy
                                </AppButton>
                              </div>
                            </div>
                          </div>
                    }
                  </div>
                </section>
              : <CartLoading/>
        }

      </PageWrapper>
  )
};

export default Cart;
