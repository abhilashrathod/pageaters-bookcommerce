import React, {useEffect} from 'react';
import styled from "styled-components";
import axios from "axios";
import {useRouter} from "next/router";
import {get} from 'lodash';
import {Divider, InputWrapper, Modal, Select, Switch} from '@mantine/core';
import {useForm} from "@mantine/hooks";
import {useNotifications} from "@mantine/notifications";

import AppTextInput from "../form-controls/AppTextInput";
import {CONTACT_NO_REGEX, PRIMARY_COLOR, SECONDARY_COLOR} from "../../core/_variables";
import {IAddress} from "../../schemas/address";

interface Props {
  isOpened: boolean;
  onCancel: () => void;
  onSave: () => void;
  editMode?: boolean;
  currentAddress?: IAddress;
}

const Save = styled.button`
  padding: 0.25rem 0.5rem;
  color: ${SECONDARY_COLOR};
  background-color: ${PRIMARY_COLOR};
  border-radius: 0.2rem;
`;

const AddOrUpdateAddress: React.FC<Props> = ({isOpened, editMode, currentAddress, onCancel, onSave}) => {
  const notif = useNotifications();
  const router = useRouter();

  const form = useForm({
    initialValues: {
      fullName: editMode ? get(currentAddress, 'fullName', '') : '',
      contactNo: editMode ? get(currentAddress, 'contactNo', '') : '',
      email: editMode ? get(currentAddress, 'email', '') : '',
      city: editMode ? get(currentAddress, 'city', '') : '',
      state: editMode ? get(currentAddress, 'state', '') : '',
      pinCode: editMode ? get(currentAddress, 'pinCode', '') : '',
      addressLine1: editMode ? get(currentAddress, 'addressLine1', '') : '',
      addressLine2: editMode ? get(currentAddress, 'addressLine2', '') : '',
      landmark: editMode ? get(currentAddress, 'landmark', '') : '',
      isDefault: editMode ? get(currentAddress, 'isDefault', false) : false,
      type: editMode ? get(currentAddress, 'type', 'HOME') : 'HOME',
    },

    validationRules: {
      fullName: (value) => value !== '',
      contactNo: (value) => value !== '' && CONTACT_NO_REGEX.test(value),
      email: (value) => value !== '',
      city: (value) => value !== '',
      state: (value) => value !== '',
      pinCode: (value) => value !== '',
      addressLine1: (value) => value !== '',
      addressLine2: (value) => value !== '',
    },

    errorMessages: {
      fullName: 'Please enter valid name for this address',
      contactNo: 'Please enter a phone number so we can call if there are any issues with delivery.',
      email: 'Please provide valid email address for delivery notifications',
      city: 'Please provide valid a city name',
      state: 'Please provide valid state',
      pinCode: 'Please enter a ZIP or postal code to verify serviceability',
      addressLine1: 'Please provide valid address',
      addressLine2: 'Please provide valid address',
    },
  });

  useEffect(() => {
    if (editMode && currentAddress) {
      form.setValues(currentAddress);
    }
  }, [editMode]);

  useEffect(() => {
    if (!isOpened) {
      form.reset();
    }
  }, [isOpened]);

  async function saveAddress(values: any) {
    try {
      await axios.post(`/addresses`, values, {withCredentials: true});
      notif.showNotification({message: 'Address Added', color: 'green', autoClose: 3000});
      onSave();
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  async function updateAddress(values: any, id: any) {
    try {
      await axios.put(`/addresses/${id}`, values, {withCredentials: true});
      notif.showNotification({message: 'Address Updated', color: 'green', autoClose: 3000});
      onSave();
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }


  function handleSubmit(values: any) {
    if (!editMode) {
      saveAddress(values);
    } else {
      updateAddress(values, currentAddress?._id);
    }
  }

  return (
      <>
        <Modal closeOnClickOutside={false} size={'lg'} title={editMode ? 'Update Address' : 'Add Address'}
               opened={isOpened}
               onClose={onCancel}>
          <div className="row">
            <div className="col-12">
              <form onSubmit={form.onSubmit(handleSubmit)}>
                <AppTextInput id={'fullName'}
                              required={true}
                              label={'Full Name'}
                              type={'text'}
                              {...form.getInputProps('fullName')}/>

                <Divider my="xs" label="Contact Info" labelPosition="center"/>

                <div className="row">
                  <div className="col-6">
                    <AppTextInput id={'email'}
                                  required={true}
                                  label={'Email'}
                                  type={'email'}
                                  {...form.getInputProps('email')}/>
                  </div>
                  <div className="col-6">
                    <AppTextInput id={'contactNo'}
                                  required={true}
                                  label={'Contact No'}
                                  type={'tel'}
                                  {...form.getInputProps('contactNo')}/>
                  </div>
                </div>

                <Divider my="xs" label="Delivery Details" labelPosition="center"/>

                <div className="row">
                  <div className="col-6">
                    <AppTextInput id={'city'}
                                  required={true}
                                  label={'City'}
                                  type={'text'}
                                  {...form.getInputProps('city')}/>
                  </div>
                  <div className="col-6">
                    <AppTextInput id={'state'}
                                  required={true}
                                  label={'State'}
                                  type={'text'}
                                  {...form.getInputProps('state')}/>
                  </div>
                </div>


                <AppTextInput id={'addressLine1'}
                              required={true}
                              label={'Address LIne 1'}
                              type={'text'}
                              {...form.getInputProps('addressLine1')}/>

                <AppTextInput id={'addressLine2'}
                              required={true}
                              label={'Address Line 2'}
                              type={'text'}
                              {...form.getInputProps('addressLine2')}/>

                <div className="row">
                  <div className="col-6">
                    <AppTextInput id={'landmark'}
                                  required={true}
                                  label={'Landmark'}
                                  type={'text'}
                                  {...form.getInputProps('landmark')}/>
                  </div>
                  <div className="col-6">
                    <AppTextInput id={'pinCode'}
                                  required={true}
                                  label={'Pin Code'}
                                  type={'text'}
                                  {...form.getInputProps('pinCode')}/>
                  </div>
                </div>

                <Divider my="xs" label="Address Preferences" labelPosition="center"/>

                <div className="row" style={{marginBottom: '2rem'}}>
                  <div className="col-6">
                    <Select
                        label="Address Type"
                        placeholder="Pick one"
                        {...form.getInputProps('type')}
                        data={[
                          {value: 'OFFICE', label: 'Office'},
                          {value: 'HOME', label: 'Home'},
                        ]}
                    />
                  </div>
                  <div className="col-6">
                    <InputWrapper label="Make this my default address">
                      <Switch size="md"
                              color="dark"
                              {...form.getInputProps('isDefault')} />
                    </InputWrapper>
                  </div>
                </div>
                <Save type={'submit'}>{editMode ? 'Update Address' : 'Save Address'}</Save>
              </form>
            </div>
          </div>
        </Modal>
      </>
  )
};

export default AddOrUpdateAddress;
