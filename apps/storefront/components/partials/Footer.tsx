import React from 'react';
import styled from 'styled-components'
import Link from "next/link";
import Image from 'next/image';
import {useRouter} from "next/router";

import AppButton, {ButtonSizes, ButtonVariants} from "../form-controls/Button";

import {FOOTER_NAVIGATION, PRIMARY_COLOR, SECONDARY_COLOR, SM} from "../../core/_variables";


interface Props {
}


const MainFooter = styled.footer`
  display: flex;
  flex-flow: row wrap;
  padding: 2rem 0 6rem 0;
  color: ${PRIMARY_COLOR};
  background-color: ${SECONDARY_COLOR};
  border-top: 1px solid #e5e5e5;
`;

const MainFooterAddress = styled.div`
  margin-bottom: 2rem;
  
  @media screen and (min-width: ${SM - 1}px) {      
    flex: 1 0;
    margin-right: 1rem;
  }
`;
const MainFooterLogoSpace = styled.div``;

const MainFooterLogo = styled.span`
  display: inline-block;
  white-space: nowrap;
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1;
`;

const ContactTitle = styled.h6`
  margin-bottom: 0.5rem;
  font-size: 1rem;
`;

const FooterNavigation = styled.ul`
  display: flex;
  flex-flow: row wrap;
  list-style: none;
  padding-left: 0;
  
  @media screen and (min-width: ${SM - 1}px) {      
    flex: 1 0;
  }
`;

const FooterColumn = styled.li`
  line-height: 2rem;
  margin-bottom: 2rem;
  flex: 1 50%;
 
  @media screen and (max-width: ${SM - 1}px) {      
    flex: 1 100%;
  }
`;

const FooterColumnList = styled.ul`
  list-style: none;
  padding-left: 0;
  margin: 0;
  
  @media screen and (max-width: ${SM - 1}px) {      
    flex-grow: 2;
    column-count: 2;
    column-gap: 1.25rem;
  }
`;

const FooterColumnListItem = styled.li`
  line-height: 2rem;
  margin-bottom: 0;
`;

const FooterLegal = styled.div`
  display: flex;
  flex-wrap: wrap;
  color: #999;
  flex: 1 100%;
  justify-content: center;
`;

const Greeting = styled.div`
  display: flex;
  align-items: center;
  
  @media screen and (min-width: ${SM - 1}px) {      
    margin-left: auto;
  }
`;

const AppFooter: React.FC<Props> = () => {
  const router = useRouter();

  function handleContact(url: string) {
    router.push(url);
  }

  return (
      <>
        <div className="custom-container">
          <div className="row">
            <div className="col">
              <MainFooter>
                <MainFooterAddress>
                  <MainFooterLogoSpace>
                    <MainFooterLogo>Pageaters</MainFooterLogo>
                  </MainFooterLogoSpace>
                </MainFooterAddress>
                <MainFooterAddress>
                  <ContactTitle>Contact</ContactTitle>

                  <address>
                    Unit 1, Demo Logistics Park, Sector 1,<br/>
                    Gandhinagar, Gujarat - 382016 <br/>
                    (Active Hours: Monday to Saturday, 11AM to 7PM) <br/>
                    <AppButton variant={ButtonVariants.Secondary} styles={{margin: '0.6rem 1rem 0.6rem 0'}} size={ButtonSizes.Small} onClick={() => handleContact( 'mailto:support@demo.pageaters.com')}>Mail Us</AppButton>
                  </address>
                </MainFooterAddress>
                <FooterNavigation>
                  {
                    FOOTER_NAVIGATION.map((section, index) => (
                        <FooterColumn key={index}>
                          <h6 style={{fontSize: '1rem'}}>{section.linkName}</h6>
                          <FooterColumnList>
                            {section.children.map((link, index) => (
                                <FooterColumnListItem key={index}>
                                  <Link href={link.linkHref}><a style={{color: '#999'}}>{link.linkName}</a></Link>
                                </FooterColumnListItem>
                            ))}
                          </FooterColumnList>
                        </FooterColumn>
                    ))
                  }
                </FooterNavigation>
                <FooterLegal>
                  <p>&copy; 2021-2023 Pageaters, Inc. All Rights Reserved</p>

                  <Greeting>
                    <span>Made in India with 🧡</span>
                  </Greeting>
                </FooterLegal>
              </MainFooter>
            </div>
          </div>
        </div>
      </>
  )
};

export default AppFooter;
