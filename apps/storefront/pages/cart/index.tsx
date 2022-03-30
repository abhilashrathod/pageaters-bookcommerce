import React, {useState} from 'react';
import useSWR, {useSWRConfig} from "swr";
import styled from "styled-components";
import cookie from "js-cookie";
import {Skeleton} from '@mantine/core';
import {useRouter} from "next/router";
import {get} from 'lodash';

import PageWrapper from "../../components/elements/PageWrapper";
import PageHeadings from "../../components/elements/PageHeadings";
import Breadcrumbs from "../../components/elements/Breadcrumbs";
import FailedToLoad from '../../components/elements/FailedToLoad';
import AppButton, {ButtonSizes, ButtonVariants} from "../../components/form-controls/Button";

import {useUser} from "../../contexts/user.context";

import {AUTH_COOKIE, LIGHTEST_PRIMARY_COLOR, SM} from "../../core/_variables";

import CartBreakdown from "../../components/cart-elements/cart-breakdown";
import ProductItem from "../../components/cart-elements/cart-product-item";
import BundleItem from "../../components/cart-elements/cart-bundle-item";
import axios from "axios";
import {useNotifications} from "@mantine/notifications";

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


const Cart: React.FC<Props> = () => {
  const [auth, setAuth] = useState(() => {
    return cookie.get(AUTH_COOKIE) ? true : false;
  });

  const {user} = useUser();
  const router = useRouter();
  const notif = useNotifications();
  const {mutate} = useSWRConfig();

  const {data: cart, error} = useSWR({url: auth ? `/cart/retrieve` : null, withCredentials: true});

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

  if (error)
    return <FailedToLoad title={'Error Loading Cart..'}/>;

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
          cart?.data
              ? <section>
                <div className="custom-container">
                  <div className="row">
                    <div className="col-xl-8 col-md-8 col-12">
                      <ProductListSpace>
                        <ProductList>
                          {
                            get(cart, 'data.products', []).map((item: any) => {
                              return (
                                  <ProductListItem key={item._id}>
                                    <ProductItem book={item} onDelete={handleOnDelete} onQuantityChange={handleQuantityChange} />
                                  </ProductListItem>
                              )
                            })
                          }
                          {
                            get(cart, 'data.bundles', []).map((item: any) => {
                              return (
                                  <ProductListItem key={item._id}>
                                    <BundleItem onDelete={handleOnBundleDelete} cartBundle={item} />
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
                        {(cart && cart.data) && <CartBreakdown cart={cart?.data} shippingCharges={'Calculated at Checkout'}/>}
                        <AppButton variant={ButtonVariants.Accent}
                                   size={ButtonSizes.Large}
                                   styles={{width: '100%', display: 'block'}}
                                   onClick={transferToAddress}>
                          Proceed to Buy
                        </AppButton>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
              : <section>
                <div className="custom-container">
                  <div className="row">
                    <div className="col-xl-8 col-md-8 col-12">
                      <ProductListSpace>
                        <ul>
                          {[1, 2, 3, 4, 5].map((j, i) => {
                            return (
                                <div key={j + i} className="row">
                                  <div className="col-1"><Skeleton circle height={75} mb="xl"/></div>
                                  <div className="col-10">
                                    <Skeleton height={12} mt={6} width="75%" radius="xl"/>
                                    <Skeleton height={12} mt={6} width="50%" radius="xl"/>
                                    <Skeleton height={12} mt={6} width="25%" radius="xl"/>
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
        }

      </PageWrapper>
  )
};

export default Cart;
