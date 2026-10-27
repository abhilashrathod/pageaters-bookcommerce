import React from 'react';
import styled from 'styled-components';
import AppButton, {ButtonSizes, ButtonVariants} from "../form-controls/Button";

import {LG, MD, SECONDARY_COLOR, SM} from "../../core/_variables";
import {getAssetImage} from "../../core/_imageRendererHelper";

import {IBanner} from "../../schemas/banner";
import {useRouter} from "next/router";

interface Props {
  banner: IBanner;
}

const MainCardWrapper = styled.div`
  position: relative;
  
  &:after {
    content: "";
    display: block;
    background: #000;
    background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 100%);
    opacity: 1;
    left: 0;
    top: 0;
    height: 100%;
    width: 100%;
    border-radius: 1rem;
    position: absolute;
  }
`;

const BannerImageSpace = styled.div`
  position: relative;
`;

const BannerImage = styled.img`
  width: 100%;
  height: 700px;
  object-fit: cover;
  object-position: center center;
  aspect-ratio: 16/9;
  border-radius: 1.5rem;
  filter: drop-shadow(0px 8px 6px rgba(0, 0, 0, 0.25)) !important;
  
  @media screen and (max-width: ${MD - 1}px) {
     height: 600px;
  }
  
  @media screen and (max-width: ${SM - 1}px) {
     height: 450px;
  }
`;

const BannerContent = styled.div`
  position: absolute;
  height: auto;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  top: 0;  
  z-index: 1;
  word-break: break-word;
  flex-direction: column;
  padding: 3rem;
  
  @media screen and (max-width: ${MD - 1}px) {      
    max-width: 100%;
    width: 100%;
  }
  
  @media screen and (max-width: ${SM - 1}px) {
    padding: 1rem 0 1rem 1rem;
    max-width: 100%;
    width: 100%;
  }
`;

const BannerTextSpace = styled.div`
  display: flex;
`;

const BannerTitle = styled.h2`
  color: ${SECONDARY_COLOR};
  font-size: 3.8rem;
  line-height: 3.957rem;
  letter-spacing: -3px;
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

const GiantSquareBanner: React.FC<Props> = ({banner}) => {

  const router = useRouter();

  function renderImageSize(w: number, h: number) {
    return getAssetImage(banner.poster, {height: h, width: w});
  }

  function navigate() {
    router.push(banner.ctaLink || '/');
  }

  return (
      <>
        <div className="custom-container">
          <div className="row">
            <div className="col">
              <MainCardWrapper>
                <BannerImageSpace>
                  <picture>
                    <source media={`(max-width: ${SM - 1}px)`} type="image/jpeg" srcSet={renderImageSize(375, 450)} height={450} width={375}/>
                    <source media={`(max-width: ${MD - 1}px)`} type="image/jpeg" srcSet={renderImageSize(768, 600)} height={768} width={600}/>
                    <source media={`(max-width: ${LG - 1}px)`} type="image/jpeg" srcSet={renderImageSize(1024, 800)} height={800} width={1024}/>
                    <BannerImage src={renderImageSize(1920, 1080)} alt={'Explore Membership Benefits'} loading={'lazy'} height={1080} width={1920}/>
                  </picture>
                </BannerImageSpace>
                <BannerContent>
                  <BannerTextSpace>
                    <BannerTitle>
                      {banner.title}
                    </BannerTitle>
                  </BannerTextSpace>
                  <div>
                    <AppButton styles={{borderRadius: '2rem'}}
                               onClick={navigate}
                               variant={ButtonVariants.Secondary}
                               size={ButtonSizes.Default}>
                      {banner.ctaText}
                    </AppButton>
                  </div>
                </BannerContent>
              </MainCardWrapper>
            </div>
          </div>
        </div>
      </>
  )
};

export default GiantSquareBanner;
