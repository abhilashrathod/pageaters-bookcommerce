import React from 'react';
import styled from 'styled-components';
import {ACCENT_COLOR, PRIMARY_COLOR} from "../../core/_variables";

interface Props {
  text: string;
  color?: string;
}

const Badge = styled.span`
    padding: 0.35em 0.65em;
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
    
    background-color: ${props => props.color === 'accent' ? ACCENT_COLOR : PRIMARY_COLOR};
`;

const Badges: React.FC<Props> = ({text, color}) => <Badge color={color}>{text}</Badge>;

export default Badges;
