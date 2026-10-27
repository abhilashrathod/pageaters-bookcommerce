import React from 'react';
import styled from 'styled-components'

import {useRouter} from "next/router";

import {ACCENT_COLOR, PRIMARY_COLOR, SECONDARY_COLOR} from "../../core/_variables";

interface Props {
  variant: string;
  href: string;
  style?: React.CSSProperties;
}

const handleColor = (color: string) => {
  switch (color) {
    case "secondary":
      return SECONDARY_COLOR;
    case "accent":
      return ACCENT_COLOR;
    default:
      return PRIMARY_COLOR;
  }
};

const MainButton = styled.button`
  color: ${({theme}) => handleColor(theme)};
  background-color: ${SECONDARY_COLOR};
  box-shadow: none;
  text-transform: none;
  font-style: normal;
  background-color: rgba(33, 33, 33, 0.07);
  border: 1px solid ${({theme}) => handleColor(theme)};
`;

const OutlinedButton: React.FC<Props> = ({variant, href, children, ...rest}) => {
  const router = useRouter();

  const handleClick = (e: any) => {
    e.preventDefault();
    router.push(href)
  };

  return (
      <>
        <MainButton {...rest} theme={variant} onClick={handleClick}>
          {children}
        </MainButton>
      </>
  )
};

export default OutlinedButton;
