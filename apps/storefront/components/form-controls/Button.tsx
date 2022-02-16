import React from 'react';
import styled from 'styled-components'

import {useRouter} from "next/router";

import {ACCENT_COLOR, PRIMARY_COLOR, SECONDARY_COLOR} from "../../core/_variables";

interface Props {
  variant: string;
  href: string;
  size?: string;
  styles?: React.CSSProperties;
}

export enum ButtonVariants {
  Default = 'default',
  Accent = 'accent',
  Secondary = 'secondary',
}

export enum ButtonSizes {
  Default = 'default',
  Small = 'sm',
  Large = 'lg',
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

const handlePadding = (size: string) => {
  switch (size) {
    case "sm":
      return '0.25rem 0.5rem;';
    default:
      return '1rem 1.714rem';
  }
};

const handleBorderRadius = (size: string) => {
  switch (size) {
    case "sm":
      return '0.2rem';
    default:
      return '0.5rem';
  }
};

const handleFont = (size: string) => {
  switch (size) {
    case "sm":
      return '0.875rem';
    default:
      return '1rem';
  }
};

const MainButton = styled.button`
  color: ${({theme}) => handleColor(theme.variant)};
  background-color: ${({theme}) => handleBackgroundColor(theme.variant)};
  padding: ${({theme}) => handlePadding(theme.size)};  
  border-radius: ${({theme}) => handleBorderRadius(theme.size)};
  font-size: ${({theme}) => handleFont(theme.size)};
  border: 1px solid ${PRIMARY_COLOR};
`;

const AppButton: React.FC<Props> = ({variant, href, size, styles, children}) => {
  const router = useRouter();

  const handleClick = (e: any) => {
    e.preventDefault();
    router.push(href)
  };

  return (
      <>
        <MainButton style={styles} theme={{variant, size}} onClick={handleClick}>
          {children}
        </MainButton>
      </>
  )
};

export default AppButton;
