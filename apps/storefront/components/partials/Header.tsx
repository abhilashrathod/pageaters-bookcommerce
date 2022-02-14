import React from 'react';
import styled from "styled-components";
import Image from 'next/image';
import Link from 'next/link';
import {Icon} from '@iconify/react';

import logo from '../../public/images/brand-logo.svg';
import {MD} from "../../core/_variables";

interface Props {
}

const AppHeaderSpace = styled.header`
  color: #fff;
  position: absolute;
  display: flex;
  flex-flow: row wrap;
  width: 100%;
  margin: 0;
  padding: 0;
  top: 0;
  left: 0;
  z-index: 9;
`;

const LogoSpace = styled.div`
    text-transform: uppercase;
    font-weight: bold;
    display: inline-flex;
    flex: 1;
    
     @media screen and (max-width: ${MD - 1}px) {      
      display: none;  
    }
`;

const BackSpace = styled.div`
    text-transform: uppercase;
    font-weight: bold;
    display: inline-flex;
    flex: 1;
    display: none;
        
    @media screen and (max-width: ${MD - 1}px) {      
      display: block;      
    }
`;

const HeaderContainerStyles = {
  display: 'flex',
  flexFlow: 'row wrap',
  alignItems: 'center',
  padding: '10px 0',
};

const AppHeader: React.FC<Props> = () => {
  return (
      <AppHeaderSpace>
        <div className="custom-container" style={HeaderContainerStyles}>
          <LogoSpace>
            <Link href={'/'}>
              <a><Image src={logo} alt="pageaters-logo" height={44} width={42}/></a>
            </Link>
          </LogoSpace>
          <BackSpace>
            <Link href={'/'}>
              <a>
                <Icon icon="bx:bx-chevron-left-circle" height={30} width={30}/>
              </a>
            </Link>
          </BackSpace>
        </div>
      </AppHeaderSpace>
  )
};

export default AppHeader;
