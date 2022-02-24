import React, {useEffect, useState} from 'react';

import styled from "styled-components";

import Image from 'next/image';
import AppButton, {ButtonSizes, ButtonVariants} from "../form-controls/Button";

import {SM} from "../../core/_variables";
import {getAssetImage} from "../../core/_imageRendererHelper";

import {IBanner} from "../../schemas/banner";

interface Props {
  banner: IBanner
}

const MainCardWrapper = styled.div`
  margin-bottom: 1rem;
`;

const BannerImageSpace = styled.div`
  margin-bottom: 0.625rem;
`;

const BannerImage = styled.img`
  border-radius: 1rem;
  width: 100%;
  height: 350px;
  object-fit: cover;
  object-position: top center;
  
  @media screen and (max-width: ${SM - 1}px) {      
     height: 200px;
  }
`;

const BannerContent = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

const BannerTextSpace = styled.div`
  display: flex;
`;

const BannerTitle = styled.h4`
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  font-size: 1.6rem;
`;

const BannerLearnMore = styled.div`
  display: flex;
  align-items: center;
`;


const LandscapeBanner: React.FC<Props> = ({banner}) => {
  const [poster, setPoster] = useState('');

  useEffect(() => {
    setPoster(getAssetImage(banner.poster, {height: 350, width: 776, fit: 'cover'}));
  }, []);

  return (
      <MainCardWrapper>
        <BannerImageSpace>
          <BannerImage src={banner.poster} loading={"lazy"} alt={banner.title} height={350} width={776}/>
        </BannerImageSpace>
        <BannerContent>
          <BannerTextSpace>
            <BannerTitle>{banner.title}</BannerTitle>
          </BannerTextSpace>
          <BannerLearnMore>
            <AppButton href={'/'} variant={ButtonVariants.Default} size={ButtonSizes.Default}>
              Learn More
            </AppButton>
          </BannerLearnMore>
        </BannerContent>
      </MainCardWrapper>
  )
};

export default LandscapeBanner;
