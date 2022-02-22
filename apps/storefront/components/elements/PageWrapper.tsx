import React from 'react';
import styled from 'styled-components';
import {SM} from "../../core/_variables";

interface Props {
}

const Page = styled.section`
  margin-top: 4rem;
  padding-bottom: 0.5rem;
  padding-top: 3rem;

  @media screen and (max-width: ${SM - 1}px) {      
    margin-top: 2rem;
  }
`;

const PageWrapper: React.FC<Props> = ({children}) => <Page>{children}</Page> ;

export default PageWrapper;
