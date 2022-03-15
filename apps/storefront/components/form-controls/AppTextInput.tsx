import React from 'react';
import styled from 'styled-components';
import {TextInput} from "@mantine/core";
import {DARKER_PRIMARY_COLOR, PRIMARY_COLOR} from "../../core/_variables";

interface Props {
  id: string;
  label: string;
  required: boolean;
  type: 'text' | 'password' | 'email' | 'search' | 'tel' | 'url' | 'number';
}

const InputWrapper = styled.div`
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
              input: {
                color: PRIMARY_COLOR,
                '&:hover': {borderColor: DARKER_PRIMARY_COLOR},
                '&:focus': {borderColor: DARKER_PRIMARY_COLOR},
                '&:focus-within': {borderColor: DARKER_PRIMARY_COLOR}},
            }}
            {...rest}
        />
      </InputWrapper>
  )
};

export default AppTextInput;
