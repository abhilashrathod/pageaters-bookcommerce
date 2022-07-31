import React from 'react';
import styled from 'styled-components';

import {
  ACCENT_COLOR,
  LIGHTER_PRIMARY_COLOR,
  LIGHTEST_PRIMARY_COLOR,
  PRIMARY_COLOR,
  PRIMARY_DANGER,
  SECONDARY_ACCENT_COLOR,
  SECONDARY_COLOR
} from "../../core/_variables";

import {ButtonVariants} from "../form-controls/Button";

interface Props {
  text: string;
  color: string;
}

const handleBackgroundColor = (color: string = '') => {
  switch (color) {
    case ButtonVariants.Secondary:
      return SECONDARY_COLOR;
    case ButtonVariants.Accent:
      return ACCENT_COLOR;
    case ButtonVariants.SecondaryAccent:
      return SECONDARY_ACCENT_COLOR;
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

const Badge = styled.span`
  padding: 0.55em 0.65em 0.35em 0.65em;
  font-weight: 700;
  color: #fff;
  text-align: center;
  white-space: nowrap;
  vertical-align: baseline;
  border-radius: 0.25rem;    
  display: inline-flex;
  font-size: 0.75rem;
  line-height: 0.75rem;
  font-weight: 300;
  margin-right: 0.5rem;    
  background-color: ${(props) => handleBackgroundColor(props.color)};
`;

const Badges: React.FC<Props> = ({text, color}) => <Badge color={color}>{text}</Badge>;

export default Badges;
