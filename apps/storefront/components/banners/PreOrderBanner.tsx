import React from 'react';
import {useRouter} from "next/router";
import styled from "styled-components";

import AppButton, {ButtonSizes, ButtonVariants} from "../form-controls/Button";

import {LG, MD, PRIMARY_COLOR, SECONDARY_COLOR, SM} from "../../core/_variables";
import {getProductImage} from "../../core/_imageRendererHelper";

interface Props {

}

// const PreOrderSection = styled.section`
//   background: #000;
//   padding: 7.5rem 0;
//   margin: 0 0 5rem 0;
//
//   @media screen and (max-width: ${MD - 1}px) {
//     padding: 4.5rem 0 0.1rem 0;
//     margin: 3.75rem 0;
//   }
//
//   @media screen and (max-width: ${SM - 1}px) {
//     padding: 4rem 0 0.1rem 0;
//     margin: 2.5rem 0;
//   }
// `;

const MainCardWrapper = styled.div`
  margin-bottom: 1rem;
  position: relative;
  border-radius: 1.5rem;
  padding: 2.5rem;
  background: linear-gradient(to right, #6dd5ed, #2193b0);  
    
  @media screen and (max-width: ${MD - 1}px) {
   
  }
  
  @media screen and (max-width: ${SM - 1}px) {
  padding: 1rem; 
  }
`;

const BannerImageSpace = styled.div`
  margin-bottom: 0.625rem;
  display: flex;
  justify-content: center;
  
  @media screen and (max-width: ${LG - 1}px) {
  
  }
  
  @media screen and (max-width: ${MD - 1}px) {
    // right: auto;
    // left: 37%;
    // top: -2rem;
  }
  
  @media screen and (max-width: ${SM - 1}px) {
    // right: auto;
    // left: 30%;
    // top: -2rem;
  }
`;

const BannerImage = styled.img`
  border-radius: 1rem;
  width: auto;
  height: 380px;
  object-fit: cover;
  box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.16);
  object-position: top center;
  
  @media screen and (max-width: ${MD - 1}px) {
    height: 275px;
  }
  
  @media screen and (max-width: ${SM - 1}px) {      
     height: 225px;
     margin-bottom: 1.5rem;
     margin-top: 0.5rem;
  }
`;

const BannerContent = styled.div`
  display: flex;  
  justify-content: center;
  flex-direction: column;
  height: 100%; 
  
  @media screen and (max-width: ${MD - 1}px) {
    align-items: center;
  }
  
  @media screen and (max-width: ${SM - 1}px) {
    align-items: center;
  }
`;

const BannerTextSpace = styled.div`
  display: flex;
  flex-direction: column;
`;

const BannerTitle = styled.h4`
  color: ${SECONDARY_COLOR};
  font-size: 3.6rem;
  line-height: 3.857rem;
  letter-spacing: -3px;
  margin-bottom: 1.6rem;
  
  @media screen and (max-width: ${MD - 1}px) {
   font-size: 2.8rem;
   line-height: 3.086rem;
   letter-spacing: -1px;
   text-align: center;
   width: 100%;
  }
  
  @media screen and (max-width: ${SM - 1}px) {      
   font-size: 1.8rem;
   line-height: 2.086rem;
   letter-spacing: -1px;
   text-align: center;
   width: 100%;
   margin-bottom: 1rem;
  }
`;

const BannerSubTitle = styled.h4`
  color: ${PRIMARY_COLOR};
  font-size: 1.25rem;
  line-height: 1.477rem;
  margin-bottom: 1rem;
  
  @media screen and (max-width: ${MD - 1}px) {
   font-size: 2.8rem;
   line-height: 3.086rem;
   letter-spacing: -1px;
   text-align: center;
   width: 100%;
  }
  
  @media screen and (max-width: ${SM - 1}px) {      
   font-size: 1.8rem;
   line-height: 2.086rem;
   letter-spacing: -1px;
   text-align: center;
   width: 100%;
  }
`;

const BannerTag = styled.span`
  display: inline-flex;
  border-radius: 1.5rem;
  position: relative;
  color: ${PRIMARY_COLOR};
  font-size: 1rem;
  line-height: 1;
  font-weight: 600;
  margin-bottom: 0.5rem;
  background-color: ${SECONDARY_COLOR};
  text-decoration: none;
  padding: 0.5rem 1rem;
  letter-spacing: normal;
  margin-left: 0.5rem;

  &:first-child {
    margin-left: 0;
  }
  @media screen and (max-width: ${SM - 1}px) {
    font-size: 0.825rem;
  }
`;

const BannerLearnMore = styled.div`
  display: flex;
  align-items: center;
`;


const PreOrderBanner: React.FC<Props> = () => {
  const router = useRouter();

  function renderImageSize(w: number, h: number) {
    return getProductImage("icebreaker-PXGH54MWXB-1674293344459.jpg", {height: h, width: w, fit: 'cover'});
  }

  function handleNavigation() {
    router.push('/books/BK-9818112389');
  }

  const TAGS = [
    'Adult Contemporary Romance',
    'Frenemies to Lovers',
    'Mental Health Rep',
    'Reverse grumpy x sunshine',
    'Banter & Spice',
  ];

  return (

      <div className={'custom-container'}>
        <div className="row">
          <div className="col">
            <MainCardWrapper>
              <div className="row">
                <div className="col-12 col-lg-3">
                  <BannerImageSpace>
                    <BannerImage src={renderImageSize(250, 380)} loading={"lazy"} alt={'New Release "Icebreaker"'}
                                 height={380} width={250}/>
                  </BannerImageSpace>
                </div>
                <div className="col-12 col-lg-9">
                  <BannerContent>
                    <BannerTextSpace>
                      <BannerTitle>{'New Release "Icebreaker"'}</BannerTitle>
                      <BannerSubTitle>{TAGS.map((tag: string) => <BannerTag>{tag}</BannerTag>)}</BannerSubTitle>
                    </BannerTextSpace>
                    <BannerLearnMore>
                      <AppButton onClick={handleNavigation} variant={ButtonVariants.Default} size={ButtonSizes.Default}>
                        Buy Now!
                      </AppButton>
                    </BannerLearnMore>
                  </BannerContent>
                </div>
              </div>
            </MainCardWrapper>
          </div>
        </div>
      </div>

  )
};

export default PreOrderBanner;
