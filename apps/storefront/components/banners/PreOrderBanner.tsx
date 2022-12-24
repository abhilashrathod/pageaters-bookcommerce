import React from 'react';
import {useRouter} from "next/router";
import styled from "styled-components";

import AppButton, {ButtonSizes, ButtonVariants} from "../form-controls/Button";

import {LG, MD, PRIMARY_COLOR, SM, XL} from "../../core/_variables";
import {getAssetImage, getProductImage} from "../../core/_imageRendererHelper";

import {IBanner} from "../../schemas/banner";

interface Props {

}

const MainCardWrapper = styled.div`
  margin-bottom: 1rem;
  position: relative;
  border-radius: 1.5rem;
  padding: 5rem 2.5rem;
  background: linear-gradient(to right, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C);
  
  @media screen and (max-width: ${MD - 1}px) {
    padding: 20rem 0 2.5rem 0;
  }
  
  @media screen and (max-width: ${SM - 1}px) {
    padding: 15rem 0 2.5rem 0;
  }
`;

const BannerImageSpace = styled.div`
  margin-bottom: 0.625rem;
  position: absolute;
  top: -4rem;
  right: 2.5rem;
  
  @media screen and (max-width: ${LG - 1}px) {
  
  }
  
  @media screen and (max-width: ${MD - 1}px) {
    right: auto;
    left: 37%;
    top: -2rem;
  }
  
  @media screen and (max-width: ${SM - 1}px) {
    right: auto;
    left: 30%;
    top: -2rem;
  }
`;

const BannerImage = styled.img`
  border-radius: 1rem;
  width: 100%;
  height: 380px;
  object-fit: cover;
  object-position: top center;
  
  @media screen and (max-width: ${MD - 1}px) {
    height: 275px;
  }
  
  @media screen and (max-width: ${SM - 1}px) {      
     height: 225px;
  }
`;

const BannerContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  
  @media screen and (max-width: ${MD - 1}px) {
    align-items: center;
  }
  
  @media screen and (max-width: ${SM - 1}px) {
    align-items: center;
  }
`;

const BannerTextSpace = styled.div`
  display: flex;
`;

const BannerTitle = styled.h4`
  color: ${PRIMARY_COLOR};
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
  }
`;

const BannerLearnMore = styled.div`
  display: flex;
  align-items: center;
`;


const PreOrderBanner: React.FC<Props> = () => {
  const router = useRouter();

  function renderImageSize(w: number, h: number) {
    return getProductImage("king-of-wrath-QOUrVsZFWM-1669290026314.jpg", {height: h, width: w, fit: 'cover'});
  }

  function handleNavigation() {
    router.push('/books/BK-6364059139');
  }

  return (
      <div className={'container'}>
        <div className="row">
          <div className="col">
            <MainCardWrapper>
              <BannerImageSpace>
                <BannerImage src={renderImageSize(250, 380)} loading={"lazy"} alt={'New Release "King of Wrath"'} height={380} width={250}/>
              </BannerImageSpace>
              <BannerContent>
                <BannerTextSpace>
                  <BannerTitle>{'New Release "King of Wrath"'}</BannerTitle>
                </BannerTextSpace>
                <BannerLearnMore>
                  <AppButton onClick={handleNavigation} variant={ButtonVariants.Default} size={ButtonSizes.Default}>
                    Buy Now!
                  </AppButton>
                </BannerLearnMore>
              </BannerContent>
            </MainCardWrapper>
          </div>
        </div>

      </div>
  )
};

export default PreOrderBanner;
