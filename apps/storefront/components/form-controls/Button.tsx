import React from 'react';
import styled from 'styled-components'

import {useRouter} from "next/router";

import {ACCENT_COLOR, PRIMARY_COLOR, SECONDARY_COLOR} from "../../core/_variables";

interface Props {
  variant: string;
  href: string;
}

const handleColor = (color: string) => {
  switch (color) {
    case "secondary":
      return PRIMARY_COLOR;
    case "accent":
      return SECONDARY_COLOR;
    default:
      return SECONDARY_COLOR;
  }
};
const handleBackgroundColor = (color: string) => {
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
  background-color: ${({theme}) => handleBackgroundColor(theme)};
`;

const AppButton: React.FC<Props> = ({variant, href, children}) => {
  const router = useRouter();

  const handleClick = (e: any) => {
    e.preventDefault();
    router.push(href)
  };

  return (
      <>
        <MainButton theme={variant} onClick={handleClick}>
          {children}
        </MainButton>
      </>
  )
};

export default AppButton;
