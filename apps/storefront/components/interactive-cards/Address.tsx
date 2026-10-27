import React from "react";
import styled from "styled-components";
import {Icon} from "@iconify/react";

import AppIconButton from "../form-controls/IconButton";

import {ButtonVariants} from "../form-controls/Button";
import {LIGHTER_PRIMARY_COLOR} from "../../core/_variables";
import {IAddress} from "../../schemas/address";


const AddressContent = styled.div`
  flex-direction: column;
  display: flex;
  width: 100%;
  position: relative;
`;

const AddressTitle = styled.div`
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const AddressContactSpace = styled.div`
  margin-bottom: 1rem;
`;

const AddressContactInfo = styled.span`
  color: ${LIGHTER_PRIMARY_COLOR};
  display: flex;
  align-items: center;
`;

const AddressDetails = styled.div`
  margin-bottom: 0.5rem;
  min-height: ${8 + (3 * 22.4)}px;
`;

const AddressActions = styled.span`

`;

interface AddressProps {
  address: IAddress;
  onSelection: (id: string) => void;
  onEdit: (address: IAddress) => void;
  onDelete: (address: IAddress) => void;
}

const Address = ({address, onSelection, onEdit, onDelete}: AddressProps) => (
    <AddressContent>
      <AddressTitle>
        <h6 style={{display: "flex", alignItems: "center"}}><Icon icon={address.type === 'OFFICE' ? 'bx:buildings' : 'bx:home'} width={21} height={21}/>&nbsp;<span>{address.fullName}</span></h6>
      </AddressTitle>
      <AddressDetails>
        {address.addressLine1 + ', '} {address.addressLine2} {address.landmark ? `- ${address.landmark}, ` : ''}<br/>
        {address.city + ', '} {address.state + ' - '} {address.pinCode}<br/>
      </AddressDetails>
      <AddressContactSpace>
        <AddressContactInfo><Icon icon={'bx:phone-call'} width={16} height={16}/>&nbsp;{address.contactNo}
        </AddressContactInfo>
        <AddressContactInfo><Icon icon={'bx:mail-send'} width={16} height={16}/>&nbsp;{address.email}
        </AddressContactInfo>
      </AddressContactSpace>
      <AddressActions>
        <AppIconButton
            disabled={address.isDefault} styles={{paddingLeft: '0'}}
            variant={address.isDefault ? ButtonVariants.Accent : ButtonVariants.Default}
            onClick={() => onSelection(address._id)}>
          <Icon icon={address.isDefault ? 'ic:twotone-check-circle' : 'bx:check-circle'} width={18} height={18}/>
          &nbsp;{address.isDefault ? 'Default Address' : 'Mark Default'}
        </AppIconButton>

        <AppIconButton styles={{marginLeft: '2rem'}} variant={ButtonVariants.Default} onClick={() => onEdit(address)}>
          <Icon icon={'bx:edit-alt'} width={18} height={18}/>&nbsp;Edit
        </AppIconButton>
        <AppIconButton styles={{marginLeft: '1rem'}} variant={ButtonVariants.Default}
                       onClick={() => onDelete(address)}>
          <Icon icon={'bx:bx-trash'} width={18} height={18}/>&nbsp;Delete
        </AppIconButton>
      </AddressActions>
    </AddressContent>
);

export default Address;
