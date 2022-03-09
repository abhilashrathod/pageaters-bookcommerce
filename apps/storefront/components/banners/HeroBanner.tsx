import React, {useEffect, useState} from 'react';
import styled from "styled-components";

import AppButton from "../form-controls/Button";

import {LG, MD, SM} from "../../core/_variables";
import {IBanner} from "../../schemas/banner";
import {useRouter} from "next/router";
import {getAssetImage} from "../../core/_imageRendererHelper";

interface Props {
  banner: IBanner;
}

const Hero = styled.section`
  background-repeat: no-repeat;
  background-position: center right;
  background-size: cover;

  display: flex;
  align-items: center;
  position: relative;
  z-index: 0;
  
  height: 80vh;
  
 &:after {
    content: "";
    display: block;
    background: rgb(0, 0, 0);
    background: linear-gradient(to bottom right, rgba(0, 0, 0, 0.3) -25%, transparent 100%);
    left: 0;
    top: 0;
    height: 100%;
    width: 100%;
    position: absolute;
  }
  
  @media screen and (max-width: ${LG - 1}px) {      
    height: 60vh;
  }
  
  @media screen and (max-width: ${MD - 1}px) {      
    align-items: flex-end;
    padding-bottom: 4.5rem;
  }
`;

const HeroTitleSection = styled.div`
  @media screen and (max-width: ${MD - 1}px) {      
      text-align: center;
  }
`;

const HeroTitle = styled.h2`
  color: #fff;
  position: relative;
  font-size: 5rem;
  line-height: 5.286rem;
  letter-spacing: -3px;
  margin-bottom: 2rem;
  
 @media screen and (max-width: ${MD - 1}px) {      
    font-size: 4rem;
    line-height: 4rem;
    letter-spacing: -1px;
  }

 @media screen and (max-width: ${SM - 1}px) {      
    font-size: 2.5rem;
    line-height: 2.5rem;
    letter-spacing: -2px;
  }
`;

const HeroBanner: React.FC<Props> = ({banner}) => {
  const router = useRouter();

  function renderBanner(image: string) {
    return getAssetImage(image, {height: 1280, width: 1920, fit: 'cover'})
  }

  function handleNavigation() {
    // @ts-ignore
    router.push(banner.ctaLink);
  }

  return (
      <Hero style={{backgroundImage: `url(${renderBanner(banner.poster)})`}}>
        <div className="custom-container" style={{zIndex: 1}}>
          <div className="row">
            <div className="col-xxl-4 col-lg-6 col-12">
              <HeroTitleSection>
                <HeroTitle>Buy, Sell, Rent Books and More</HeroTitle>
                <div>
                  <AppButton variant={'secondary'} onClick={handleNavigation}>Get Started</AppButton>
                </div>
              </HeroTitleSection>
            </div>
          </div>
        </div>
      </Hero>
  )
};

export default HeroBanner;
