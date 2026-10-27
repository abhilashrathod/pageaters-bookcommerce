import React, {useEffect, useState} from 'react';
import {Skeleton} from "@mantine/core";
import {showNotification, updateNotification} from "@mantine/notifications";
import cookie from "js-cookie";
import styled from "styled-components";
import {useRouter} from "next/router";
import axios from "axios";
import useSWR, {mutate} from "swr";
import {Icon} from "@iconify/react";
import {get} from 'lodash';

import AddOrUpdateAddress from "../../components/dialogs/add-or-update-address";
import Address from "../../components/interactive-cards/Address";
import CartBreakdown from "../../components/cart-elements/cart-breakdown";
import PageWrapper from "../../components/elements/PageWrapper";
import Breadcrumbs from "../../components/elements/Breadcrumbs";
import PageHeadings from "../../components/elements/PageHeadings";
import FailedToLoad from "../../components/elements/FailedToLoad";
import AppIconButton from "../../components/form-controls/IconButton";
import EmptyMessageWithGraphic from "../../components/elements/EmptyMessageWithGraphic";
import AppButton, {ButtonSizes, ButtonVariants} from "../../components/form-controls/Button";

import {AUTH_COOKIE, LIGHTEST_PRIMARY_COLOR, SM} from "../../core/_variables";
import {IAddress} from "../../schemas/address";

import emptyAddress from '../../public/illustrations/delivery-address.svg';
import emptyCart from '../../public/illustrations/empty-cart.svg'
import Head from "next/head";
import {addShippingInfo} from "../../core/_analytics";


interface Props {
}

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Cart', href: '/cart'},
  {title: 'Addresses', href: '', isActive: true},
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

const AddressList = styled.ul``;

const AddressListWrapper = styled.li`
  margin: 1rem 0;
  border-bottom: 1px solid #ddd;
  padding-bottom: 1rem;
  
  &:first-child {
    margin-top: 0;
  }
  
  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
    margin-bottom: 0;
  }
`;

const ActionCenter = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1.5rem;
`;

const AddressLoading = () => (
    <section>
      <div className="custom-container">
        <div className="row">
          <div className="col-xl-8 col-md-8 col-12">
            <AddressSpace>
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
            </AddressSpace>
          </div>
        </div>
      </div>
    </section>
);

const AddressSelect: React.FC<Props> = () => {
  const isLoggedIn = cookie.get(AUTH_COOKIE);

  const [selectedAddress, setSelectedAddress] = useState('');
  const [currentAddress, setCurrentAddress] = useState(undefined);
  const [edit, setEdit] = useState(false);
  const [opened, setOpened] = useState(false);


  const router = useRouter();

  const {data: addressRes, error} = useSWR({url: isLoggedIn ? `/addresses` : null, withCredentials: true});
  const {data: cartRes} = useSWR({url: isLoggedIn ? `/cart/retrieve` : null, withCredentials: true});

  const cart = get(cartRes, 'data', null);
  const books = get(cartRes, 'data.products', []);
  const bundles = get(cartRes, 'data.bundles', []);
  const mysteryBoxes = get(cartRes, 'data.mysteryBoxes', []);

  const addresses = get(addressRes, 'data', null);

  useEffect(() => {
    if (addresses) {
      const defaultAddress = addresses.find((x: any) => x.isDefault);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress._id);
      } else {
        setSelectedAddress('');
      }
    }
  }, [addresses]);

  async function handleAddressSelection(addressId: string) {
    try {
      await axios.patch(`/addresses/${addressId}`, {}, {withCredentials: true});
      showNotification({message: 'Delivery address marked', color: 'green', autoClose: 3000});

      updateAddresses();
    } catch (e: any) {
      showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  async function handleOnDelete(address: any) {
    try {
      await axios.delete(`/addresses/${address._id}`, {withCredentials: true});

      showNotification({message: 'Address deleted', color: 'green', autoClose: 3000});

      updateAddresses();
    } catch (e: any) {
      showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  async function handleAddressConfirm() {
    try {
      showNotification({
        id: 'address-confirm',
        loading: true,
        title: 'Processing Address',
        message: 'Calculating shipping charges and validating your address. Please wait...',
        autoClose: false,
        disallowClose: true,
      });
      await axios.post(`/orders/attempt`, {address: selectedAddress}, {withCredentials: true});
      updateNotification({
        id: 'address-confirm',
        color: 'green',
        title: 'Delivery address confirmed.',
        message: '',
        autoClose: 3000,
      });
      router.push('/checkout');
      mutate({key: `/orders/retrieve`, withCredentials: true});

      addShippingInfo(cart, 'cart', 'Cart'); // for analytics
    } catch (e: any) {
      showNotification({message: e.message, color: 'red', autoClose: 3000});
      updateNotification({
        id: 'address-confirm',
        color: 'red',
        title: '',
        message: '',
        autoClose: 1000,
      });
    }
  }

  function handleOnEdit(address: any) {
    toggleAddressModal();
    setEdit(true);
    setCurrentAddress(address);
  }

  function updateAddresses() {
    mutate({url: `/addresses`, withCredentials: true});
  }

  function toggleAddressModal() {
    setOpened(v => !v);
  }

  function handleOnCancel() {
    setOpened(false);
    setEdit(false);
    setCurrentAddress(undefined);
  }

  function handleOnSave() {
    setEdit(false);
    updateAddresses();
    toggleAddressModal();
  }

  if (error)
    return (
        <PageWrapper>
          <FailedToLoad title={'Error Loading Addresses..'}/>
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
          <title>Address Selection | Pageaters</title>
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
            <PageHeadings title={'Address Selection'}/>
          </section>
          {
            addresses
                ? <section>
                  <div className="custom-container">
                    <div className="row">
                      <div className="col-xl-8 col-md-8 col-12">
                        <AddressSpace>
                          {
                            addresses.length === 0 &&
                            <EmptyMessageWithGraphic title={'Save Some Addresses!'}
                                                     illustration={emptyAddress}
                                                     illustrationHeight={'250px'}
                                                     illustrationWidth={'250px'}/>
                          }

                          <AddressList>
                            {
                              addresses?.map((address: IAddress) => {
                                return (
                                    <AddressListWrapper key={address._id}>
                                      <Address
                                          address={address}
                                          onSelection={handleAddressSelection}
                                          onEdit={handleOnEdit}
                                          onDelete={handleOnDelete}/>
                                    </AddressListWrapper>
                                )
                              })
                            }
                            <AddressListWrapper>
                              <ActionCenter>
                                <AppIconButton
                                    variant={ButtonVariants.LightPrimary}
                                    onClick={toggleAddressModal}
                                    size={ButtonSizes.Large}>
                                  <Icon icon={'ic:twotone-add-circle'} width={30} height={30}/>&nbsp;Add Address
                                </AppIconButton>
                              </ActionCenter>
                            </AddressListWrapper>
                          </AddressList>
                        </AddressSpace>
                      </div>
                      <div className="col-xl-4 col-md-4 col-12">
                        <div className="breakdown">
                          <h5>Order Summary</h5>
                          {
                            cart && (
                                <>
                                  <CartBreakdown
                                      cart={cart}
                                      storeCredit={0}
                                      shippingCharges={'Calculated at Checkout'}
                                      orderTotal={cart.subTotal}/>
                                  <AppButton
                                      variant={ButtonVariants.Accent}
                                      size={ButtonSizes.Large}
                                      disabled={!selectedAddress}
                                      styles={{width: '100%', display: 'block'}}
                                      onClick={handleAddressConfirm}>
                                    {
                                      !selectedAddress
                                          ? 'Add/Select Address Info'
                                          : 'Use Selected Address'
                                    }
                                  </AppButton>
                                </>
                            )
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
                : <AddressLoading/>
          }
        </PageWrapper>
        <AddOrUpdateAddress isOpened={opened}
                            editMode={edit}
                            currentAddress={currentAddress}
                            onCancel={handleOnCancel}
                            onSave={handleOnSave}/>
      </>
  )
};

export default AddressSelect;
