import React, {useEffect, useState} from 'react';
import cookie from "js-cookie";
import styled from "styled-components";
import {useRouter} from "next/router";
import axios from "axios";
import {Center} from "@mantine/core";
import useSWR, {mutate} from "swr";
import {Icon} from "@iconify/react";
import {get} from 'lodash';
import {useNotifications} from "@mantine/notifications";

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

import graphic from '../../public/illustrations/delivery-address.svg';

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

const AddressSelect: React.FC<Props> = () => {
  const isLoggedIn = cookie.get(AUTH_COOKIE);

  const [selectedAddress, setSelectedAddress] = useState('');
  const [currentAddress, setCurrentAddress] = useState(undefined);
  const [edit, setEdit] = useState(false);
  const [opened, setOpened] = useState(false);

  const notif = useNotifications();
  const router = useRouter();

  const {data: address, error} = useSWR({url: isLoggedIn ? `/addresses` : null, withCredentials: true});
  const {data} = useSWR({url: isLoggedIn ? `/cart/retrieve` : null, withCredentials: true});

  useEffect(() => {
    if (address) {
      const defaultAddress = address.data.find((x: any) => x.isDefault);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress._id);
      } else {
        setSelectedAddress('');
      }
    }
  }, [address]);

  async function handleAddressSelection(addressId: string) {
    try {
      await axios.patch(`/addresses/${addressId}`, {}, {withCredentials: true});
      notif.showNotification({message: 'Delivery address marked', color: 'green', autoClose: 3000});

      updateAddresses();
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  async function handleOnDelete(address: any) {
    try {
      await axios.delete(`/addresses/${address._id}`, {withCredentials: true});

      notif.showNotification({message: 'Address deleted', color: 'green', autoClose: 3000});

      updateAddresses();
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  async function handleAddressConfirm() {
    try {
      notif.showNotification({
        id: 'address-confirm',
        loading: true,
        title: 'Processing Address',
        message: 'Calculating shipping charges and validating your address. Please wait...',
        autoClose: false,
        disallowClose: true,
      });
      await axios.post(`/orders/attempt`, {address: selectedAddress, instructions: ''}, {withCredentials: true});
      notif.updateNotification('address-confirm', {
        color: 'green',
        title: 'Delivery address confirmed.',
        message: '',
        autoClose: 3000,
      });
      router.push('/checkout');
      mutate({key: `/orders/retrieve`, withCredentials: true});
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
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

  if (error) return <FailedToLoad title={'Error Loading Cart..'}/>;

  const cart = get(data, 'data', null);

  return (
      <>
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
          <section>
            <div className="custom-container">
              <div className="row">
                <div className="col-xl-8 col-md-8 col-12">
                  <AddressSpace>
                    {
                      address && address.data && address.data.length === 0 &&
                      <EmptyMessageWithGraphic title={'Save Some Addresses!'} illustration={graphic}
                                               illustrationHeight={'250px'} illustrationWidth={'250px'}/>
                    }

                    <AddressList>
                      {
                        address?.data.map((address: IAddress) => {
                          return (
                              <AddressListWrapper key={address._id}>
                                <Address address={address} onSelection={handleAddressSelection} onEdit={handleOnEdit}
                                         onDelete={handleOnDelete}/>
                              </AddressListWrapper>
                          )
                        })
                      }
                      <AddressListWrapper>
                        <ActionCenter>
                          <AppIconButton variant={ButtonVariants.LightPrimary} onClick={toggleAddressModal}
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
                    {cart &&
                    <CartBreakdown shippingCharges={'Calculated at Checkout'} cart={cart} orderTotal={cart.subTotal}/>}

                    <AppButton variant={ButtonVariants.Accent}
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
                  </div>
                </div>
              </div>
            </div>
          </section>
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
