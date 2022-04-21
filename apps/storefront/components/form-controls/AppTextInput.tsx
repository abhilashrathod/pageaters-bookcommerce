import React from 'react';
import styled from 'styled-components';
import {TextInput} from "@mantine/core";
import {LIGHTER_PRIMARY_COLOR, PRIMARY_COLOR} from "../../core/_variables";

interface Props {
  id: string;
  label: string;
  required: boolean;
  type: 'text' | 'password' | 'email' | 'search' | 'tel' | 'url' | 'number' | 'date';
}

export const InputWrapper = styled.div`
  margin-bottom: 1rem;
`;

const AppTextInput: React.FC<Props> = ({id, required, label, type, ...rest}) => {
  return (
      <InputWrapper>
        <TextInput
            label={label}
            size="md"
            id={id}
            type={type}
            styles={{
              label: {
                fontSize: '1rem',
              },
              error: {
                fontSize: '0.85rem',
              },
              input: {
                color: PRIMARY_COLOR,
                fontSize: '1rem',
                '&:hover': {borderColor: LIGHTER_PRIMARY_COLOR},
                '&:focus': {borderColor: LIGHTER_PRIMARY_COLOR},
                '&:focus-within': {borderColor: LIGHTER_PRIMARY_COLOR}},
            }}
            {...rest}
        />
      </InputWrapper>
  )
};

export default AppTextInput;
