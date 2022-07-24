import React from 'react';
import styled from 'styled-components'
import AppButton, {ButtonSizes, ButtonVariants} from "../form-controls/Button";

import {LG, MD, PRIMARY_COLOR, SM} from "../../core/_variables";
import {getAssetImage} from "../../core/_imageRendererHelper";

import {IBanner} from "../../schemas/banner";

interface Props {
  banner: IBanner;
}

const MainCardWrapper = styled.div`
  position: relative;
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
  align-items: center;
  bottom: 0;  
  word-break: break-word;
  flex-direction: column;
  padding: 3rem 0 3rem 3rem;
  
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
  color: ${PRIMARY_COLOR};
  font-size: 3.6rem;
  line-height: 3.857rem;
  letter-spacing: -3px;
  
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

  function renderImageSize(w: number, h: number) {
    return getAssetImage(banner.poster, {height: h, width: w});
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
                      Explore Membership Benefits
                    </BannerTitle>
                  </BannerTextSpace>
                  <div>
                    <AppButton styles={{borderRadius: '2rem'}} onClick={() => console.log('1')} variant={ButtonVariants.Secondary} size={ButtonSizes.Default}>
                      Learn More
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
