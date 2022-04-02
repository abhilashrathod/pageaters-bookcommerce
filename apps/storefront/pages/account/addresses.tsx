import React, {useState} from 'react';
import useSWR, {mutate} from "swr";
import cookie from "js-cookie";
import {get} from 'lodash';
import {Divider, Skeleton} from "@mantine/core";
import styled from "styled-components";
import {Icon} from "@iconify/react";
import axios from "axios";
import {useNotifications} from "@mantine/notifications";

import PageWrapper from "../../components/elements/PageWrapper";
import Breadcrumbs from "../../components/elements/Breadcrumbs";
import PageHeadings from "../../components/elements/PageHeadings";
import EmptySectionMessage from "../../components/elements/FailedToLoad";
import Address from "../../components/interactive-cards/Address";
import AppIconButton from "../../components/form-controls/IconButton";
import AppButton, {ButtonSizes, ButtonVariants} from "../../components/form-controls/Button";
import AddOrUpdateAddress from "../../components/dialogs/add-or-update-address";
import EmptyMessageWithGraphic from "../../components/elements/EmptyMessageWithGraphic";

import {AUTH_COOKIE, LIGHTEST_PRIMARY_COLOR, SM} from "../../core/_variables";
import {IAddress} from "../../schemas/address";

import graphic from "../../public/illustrations/delivery-address.svg";

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Account', href: '/account'},
  {title: 'Addresses', href: '/account/addresses', isActive: true},
];


interface Props {
}

const SkeletonWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  margin-bottom: 1.25rem;
`;
const SkeletonThumb = styled.div`
  display: inline-flex;
`;
const SkeletonContent = styled.div`
  width: 100%;
  margin-left: 1rem;    
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
}
`;

const AddressLoading = () => {
  return (
      <>
        <SkeletonWrapper>
          <SkeletonThumb>
            <Skeleton circle height={75}/>
          </SkeletonThumb>
          <SkeletonContent>
            <Skeleton height={12} mt={6} width="75%" radius="xl"/>
            <Skeleton height={12} mt={6} width="50%" radius="xl"/>
            <Skeleton height={12} mt={6} width="25%" radius="xl"/>
          </SkeletonContent>
        </SkeletonWrapper>
      </>
  )
};

const AddressCardWrapper = styled.div`
  padding: 1.5rem;
  margin-bottom: 1.6rem;
  border: 1px solid #ddd;
  border-radius: 1rem;
  transition: all 0.5s ease;
  
  &:hover {
    border: 1px solid ${LIGHTEST_PRIMARY_COLOR};
  }

  @media screen and (max-width: ${SM - 1}px) {
    padding: 0;
    padding-bottom: 0.825rem;
    margin: 0;
    margin-bottom: 0.825rem;
    border: none;
    border-bottom: 1px solid #ddd;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    
    &:hover {
      border: none;
    }
  }
`;

const ActionCenter = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1.5rem;
`;

const Addresses: React.FC<Props> = () => {
  const isLoggedIn = cookie.get(AUTH_COOKIE);

  const [currentAddress, setCurrentAddress] = useState(undefined);
  const [edit, setEdit] = useState(false);
  const [opened, setOpened] = useState(false);

  const notif = useNotifications();

  const {data, error} = useSWR({url: isLoggedIn ? `/addresses` : null, withCredentials: true});

  async function handleAddressSelection(addressId: string) {
    try {
      await axios.patch(`/addresses/${addressId}`, {}, {withCredentials: true});
      notif.showNotification({message: 'Default address marked', color: 'green', autoClose: 3000});

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

  if (error) return <EmptySectionMessage title={'Error Loading Addresses...'}/>;

  const addresses = get(data, 'data', null);

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
          <PageHeadings title={'Addresses'}/>
        </section>
        <section>
          {
            !addresses
                ? <div className="custom-container">
                  <div className="row">
                    {
                      [0, 0, 0, 0, 0, 0].map((j, i) => (
                          <div key={i} className="col-xl-4 col-lg-6 col-12">
                            <AddressLoading/>
                          </div>
                      ))
                    }
                  </div>
                </div>
                : <div className="custom-container">
                  {
                    addresses.length === 0 && <EmptyMessageWithGraphic title={'Save Some Addresses!'}
                                                                       illustration={graphic}
                                                                       illustrationHeight={'250px'}
                                                                       illustrationWidth={'250px'}/>
                  }
                  <div className="row">
                    {
                      addresses.map((address: IAddress) => {
                        return (
                            <div key={address?._id} className="col-xl-4 col-lg-6 col-12">
                              <AddressCardWrapper>
                                <Address address={address}
                                         onEdit={handleOnEdit}
                                         onSelection={handleAddressSelection}
                                         onDelete={handleOnDelete}/>
                              </AddressCardWrapper>
                            </div>
                        )
                      })
                    }
                  </div>
                  <div className="row">
                    <div className="col-12">
                      <ActionCenter>
                        <AppButton variant={ButtonVariants.Accent} onClick={toggleAddressModal}
                                       size={ButtonSizes.Large}>
                          <Icon icon={'ic:outline-add-circle-outline'} width={24} height={24}/>
                          <span style={{marginLeft: '.5rem'}}>Add Address</span>
                        </AppButton>
                      </ActionCenter>
                    </div>
                  </div>
                </div>
          }
        </section>
        <AddOrUpdateAddress isOpened={opened}
                            editMode={edit}
                            currentAddress={currentAddress}
                            onCancel={handleOnCancel}
                            onSave={handleOnSave}/>
      </PageWrapper>
  )
};

export default Addresses;
