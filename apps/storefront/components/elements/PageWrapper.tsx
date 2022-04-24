import React from 'react';
import styled from 'styled-components';
import {SM} from "../../core/_variables";

interface Props {
}

const Page = styled.section`
  margin: 5rem 0;
  min-height: 80vh;
  height: auto;

  @media screen and (max-width: ${SM - 1}px) {      
    margin-top: 4.5rem 2rem;
  }
`;

const PageWrapper: React.FC<Props> = ({children}) => <Page>{children}</Page> ;

export default PageWrapper;
