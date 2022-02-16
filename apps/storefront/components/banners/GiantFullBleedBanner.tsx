import React, {useEffect, useState} from 'react';

import styled from "styled-components";

import {MD, PRIMARY_COLOR, SM} from "../../core/_variables";
import {IBanner} from "../../schemas/banner";
import AppButton, {ButtonSizes, ButtonVariants} from "../form-controls/Button";
import {getAssetImage} from "../../core/_imageRendererHelper";

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
  height: 800px;
  object-fit: cover;
  object-position: center center;
  
  @media screen and (max-width: ${MD - 1}px) {      
     height: 600px;
  }
  
  @media screen and (max-width: ${SM - 1}px) {      
     height: 450px;
  }
`;

const BannerContent = styled.div`
  position: absolute;
  height: 100%;
  display: flex;
  justify-content: space-between;
  top: 0;
  max-width: 600px;
  word-break: break-word;
  flex-direction: column;
  padding: 3rem 0 3rem 3rem;
  
  @media screen and (max-width: ${MD - 1}px) {      
    max-width: 400px;
  }
  
  @media screen and (max-width: ${SM - 1}px) {      
   padding: 1rem 0 1rem 1rem;
   max-width: 600px;
  }
`;

const BannerTextSpace = styled.div`
  display: flex;
`;

const BannerTitle = styled.h2`
  color: ${PRIMARY_COLOR};
  font-size: 5rem;
  line-height: 5.286rem;
  letter-spacing: -3px;
  
  @media screen and (max-width: ${MD - 1}px) {      
   font-size: 4rem;
   line-height: 4rem;
   letter-spacing: -1px;
  }
  
  @media screen and (max-width: ${SM - 1}px) {      
   font-size: 2.5rem;
   line-height: 2.5rem;
   max-width: 250px;
   letter-spacing: -2px;
  }
`;

const GiantFullBleedBanner: React.FC<Props> = ({banner}) => {
  const [poster, setPoster] = useState('');

  useEffect(() => {
    setPoster(getAssetImage(banner.poster, {height: 1280, width: 1920, fit: 'cover'}));
  }, []);

  return (
      <>
        <MainCardWrapper>
          <BannerImageSpace>
            <BannerImage src={poster} alt={banner.title}/>
          </BannerImageSpace>
          <BannerContent>
            <BannerTextSpace>
              <BannerTitle>
                Explore Membership Benefits
              </BannerTitle>
            </BannerTextSpace>
            <div>
              <AppButton href={'/'} variant={ButtonVariants.Secondary} size={ButtonSizes.Default}>
                Learn More
              </AppButton>
            </div>
          </BannerContent>
        </MainCardWrapper>
      </>
  )
};

export default GiantFullBleedBanner;
