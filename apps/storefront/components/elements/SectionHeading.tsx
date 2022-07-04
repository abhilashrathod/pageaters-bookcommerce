import React from 'react';
import styled from 'styled-components';
import {Icon} from "@iconify/react";
import {MD} from "../../core/_variables";
import {useRouter} from "next/router";

interface Props {
  sectionTitle: string,
  navigateButtonProps?: {
    buttonText: string;
    buttonNavigationUrl: string;
  }
}

const SectionTitleSpace = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SectionTitle = styled.h3`
  font-size: 1.5rem;
  letter-spacing: normal;
`;

const IconButton = styled.button`
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  border-radius: 0.2rem;
  box-shadow: none;
  border: none;
  background: none;
  display: flex;
  align-items: center;
`;

export const SectionNavigators = styled.div`
  display: none;
  
  @media screen and (min-width: ${MD - 1}px) {      
    display: block;      
  }
`;

const SectionHeading: React.FC<Props> = ({sectionTitle, navigateButtonProps}) => {
  const router = useRouter();

  function handleNavigation() {
    // @ts-ignore
    router.push(navigateButtonProps?.buttonNavigationUrl);
  }
  return (
      <>
        <SectionTitleSpace>
          <SectionTitle>
            {sectionTitle}
          </SectionTitle>

          {
            navigateButtonProps && (
                <SectionNavigators>
                  <IconButton onClick={handleNavigation}>
                    <span style={{paddingTop: '2px'}}>{navigateButtonProps?.buttonText}</span> <Icon icon={'bx:bx-chevron-right'} height={28} width={28}/>
                  </IconButton>
                </SectionNavigators>
            )
          }
        </SectionTitleSpace>
      </>
  )
};

export default SectionHeading;
