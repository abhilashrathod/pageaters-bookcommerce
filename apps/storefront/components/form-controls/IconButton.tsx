import React from 'react';
import styled from 'styled-components'

import {
  ACCENT_COLOR,
  LIGHTER_PRIMARY_COLOR,
  LIGHTEST_PRIMARY_COLOR,
  PRIMARY_COLOR,
  PRIMARY_DANGER
} from "../../core/_variables";
import {ButtonVariants} from "./Button";

interface Props {
  variant: string;
  size?: string;
  disabled?: boolean;
  styles?: React.CSSProperties;
  type?: 'button' | 'submit';
  onClick: (e?: any) => void;
}

const handleColor = (color: string) => {
  switch (color) {
    case ButtonVariants.Secondary:
      return PRIMARY_COLOR;
    case ButtonVariants.Accent:
      return ACCENT_COLOR;
    case ButtonVariants.Danger:
      return PRIMARY_DANGER;
    case ButtonVariants.LightPrimary:
      return LIGHTER_PRIMARY_COLOR;
    case ButtonVariants.LightestPrimary:
      return LIGHTEST_PRIMARY_COLOR;
    default:
      return PRIMARY_COLOR;
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
  font-size: ${({theme}) => handleFont(theme.size)};
  
  box-shadow: none;
  outline: none;
  padding: 0.25rem 0.5rem;
  display: inline-flex;
  align-items: center;
`;

const AppIconButton: React.FC<Props> = ({variant, size, styles, type, disabled, onClick, children}) => {
  const handleClick = (e: any) => {
    onClick(e);
  };

  return (
      <>
        <MainButton style={styles} disabled={disabled} type={type || 'button'} theme={{variant, size}}
                    onClick={handleClick}>
          {children}
        </MainButton>
      </>
  )
};

export default AppIconButton;
