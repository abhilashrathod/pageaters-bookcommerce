import React, {useEffect, useState} from 'react';
import styled from "styled-components";

import AppButton from "../form-controls/Button";

import {LG, MD, PRIMARY_COLOR, SECONDARY_COLOR, SM} from "../../core/_variables";
import {IBanner} from "../../schemas/banner";
import {useRouter} from "next/router";
import {getAssetImage} from "../../core/_imageRendererHelper";
import useAuth from "../../hooks/useAuth";

interface Props {
  banner: IBanner;
}

const Hero = styled.section`
  background-repeat: no-repeat;
  background-position: center center;
  background-size: cover;

  display: flex;
  align-items: flex-end;
  padding-bottom: 2rem;
  position: relative;
  z-index: 0;
  
  // height: 100vh;
  
 // &:after {
 //    content: "";
 //    display: block;
 //    background: rgb(0, 0, 0);
 //    background: linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%);
 //    left: 0;
 //    top: 0;
 //    height: 100%;
 //    width: 100%;
 //    position: absolute;
 //  }
  
  @media screen and (max-width: ${LG - 1}px) {      
    // height: 60vh;
  }
  
  @media screen and (max-width: ${MD - 1}px) {      
    // align-items: flex-end;
    // padding-bottom: 4.5rem;
  }
`;

const HeroTitleSection = styled.div`        
  text-align: center;
`;

const HeroTitle = styled.h2`
  color: ${SECONDARY_COLOR};
  position: relative;
  font-size: 3.714rem;
  line-height: 4rem;
  letter-spacing: -2px;
  margin-bottom: 1rem;
  text-shadow: 3px 4px 7px rgba(81,67,21,0.8);
  
 @media screen and (max-width: ${MD - 1}px) {      
    font-size: 3rem;
    line-height: 4rem;
    letter-spacing: -1px;
  }

 @media screen and (max-width: ${SM - 1}px) {      
    font-size: 2rem;
    line-height: 2.5rem;
    letter-spacing: -1px;
  }
`;

const HeroSubTitle = styled.p`
  color: ${SECONDARY_COLOR};
`;

const BannerImageSpace = styled.div`
  position: relative;
`;

const BannerImage = styled.img`
  width: 100%;
  height: auto;
  object-fit: cover;
  object-position: center center;
  aspect-ratio: 16/9;
  border-bottom-left-radius: 1.5rem;
  border-bottom-right-radius: 1.5rem;
  
  // @media screen and (max-width: ${MD - 1}px) {
  //    height: 600px;
  // }
  //
  // @media screen and (max-width: ${SM - 1}px) {
  //    height: 450px;
  // }
`;

const HeroBanner: React.FC<Props> = ({banner}) => {
  const router = useRouter();
  const loggedIn = useAuth();

  function renderImageSize(w: number, h: number) {
    return getAssetImage(banner.poster, {height: h, width: w, fit: 'cover'});
  }

  function handleNavigation() {
    // @ts-ignore
    router.push('/categories');
  }

  return (
      <Hero>
        <div className="custom-container" style={{zIndex: 1}}>
          <div className="row">
            <div className="col-12">
              {/*<HeroTitleSection>*/}
              {/*  <HeroTitle>{banner.title}</HeroTitle>*/}
              {/*  <HeroSubTitle>Novels • Literature • Self-Help</HeroSubTitle>*/}
              {/*  <div>*/}
              {/*    <AppButton variant={'secondary'} onClick={handleNavigation}>*/}
              {/*      {'Explore'}*/}
              {/*    </AppButton>*/}
              {/*  </div>*/}
              {/*</HeroTitleSection>*/}
              <BannerImageSpace>
                <picture>
                  {/*<source media={`(max-width: ${SM - 1}px)`} type="image/jpeg" srcSet={renderImageSize(450, 800)} height={450} width={800}/>*/}
                  {/*<source media={`(max-width: ${MD - 1}px)`} type="image/jpeg" srcSet={renderImageSize(768, 1365)} height={768} width={1365}/>*/}
                  {/*<source media={`(max-width: ${LG - 1}px)`} type="image/jpeg" srcSet={renderImageSize(1422, 800)} height={1422} width={1024}/>*/}
                  <BannerImage src={renderImageSize(1600, 900)} alt={'Explore Membership Benefits'} loading={'lazy'} height={900} width={1600}/>
                </picture>
              </BannerImageSpace>
            </div>
          </div>
        </div>
      </Hero>
  )
};

export default HeroBanner;
