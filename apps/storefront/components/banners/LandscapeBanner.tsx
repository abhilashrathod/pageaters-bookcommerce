import React from 'react';
import {useRouter} from "next/router";
import styled from "styled-components";

import AppButton, {ButtonSizes, ButtonVariants} from "../form-controls/Button";

import {SM} from "../../core/_variables";
import {getAssetImage, getCollectionImage} from "../../core/_imageRendererHelper";

import {IBanner} from "../../schemas/banner";

interface Props {
  banner: IBanner
}

const MainCardWrapper = styled.div`
  margin-bottom: 2.5rem;
`;

const BannerImageSpace = styled.div`
  margin-bottom: 0.625rem;
`;

const BannerImage = styled.img`
  border-radius: 1rem;
  width: 100%;
  cursor: pointer;
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
  const router = useRouter();

  function renderImageSize(w: number, h: number) {
    // switch (banner.entity) {
      // case 'collection':
        // return getCollectionImage(banner.poster, {height: h, width: w, fit: 'cover'});
      // default:
    return getAssetImage(banner.poster, {height: h, width: w, fit: 'cover'});
    // }
  }

  function handleNavigation() {
    // @ts-ignore
    router.push(banner.ctaLink);
  }

  return (
      <MainCardWrapper>
        <BannerImageSpace>
          <BannerImage onClick={handleNavigation} src={renderImageSize(776, 350)} loading={"lazy"} alt={banner.title} height={350} width={776}/>
        </BannerImageSpace>
        <BannerContent>
          <BannerTextSpace>
            <BannerTitle>{banner.title}</BannerTitle>
          </BannerTextSpace>
          {/*<BannerLearnMore>*/}
          {/*  <AppButton  variant={ButtonVariants.Secondary} size={ButtonSizes.Small}>*/}
          {/*    Learn More*/}
          {/*  </AppButton>*/}
          {/*</BannerLearnMore>*/}
        </BannerContent>
      </MainCardWrapper>
  )
};

export default LandscapeBanner;
