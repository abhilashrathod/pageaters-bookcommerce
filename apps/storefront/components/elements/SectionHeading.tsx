import React from 'react';
import styled from 'styled-components';

import {MD} from "../../core/_variables";

interface Props {
  sectionTitle: string,
  sectionExtras?: any;
}

const SectionTitleSpace = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SectionTitle = styled.h3`
  font-size: 1.571rem;
  line-height: 1.857rem;
  letter-spacing: normal;
  margin-bottom: 1rem;
`;

export const SectionNavigators = styled.div`
  display: none;
  
  @media screen and (min-width: ${MD - 1}px) {      
    display: block;      
  }
`;

const SectionHeading: React.FC<Props> = ({sectionTitle, sectionExtras}) => {
  return (
      <>
        <SectionTitleSpace>
          <SectionTitle>
            {sectionTitle}
          </SectionTitle>

          {
            sectionExtras && sectionExtras()
          }
        </SectionTitleSpace>
      </>
  )
};

export default SectionHeading;
