import React from 'react';
import styled from "styled-components";
import {useRouter} from "next/router";

import {getBundleImage} from "../../core/_imageRendererHelper";
import {LIGHT_COLOR, MD, SM} from "../../core/_variables";
import {currencyFormat, returnDiscountedAmount} from "../../core/_helpers";
import {IBundle} from "../../schemas/bundle";

interface Props {
  bundle: IBundle;
}

const WrapperDiv = styled.div`
  margin-bottom: 1rem;
  border-radius: 1rem;
  cursor: pointer;  
`;

const CardImageSpace = styled.div`
  margin-bottom: 0.625rem;
`;

const CardImage = styled.img`
  border-radius: 1rem;
  object-fit: cover;
  width: 385px;
  height: 385px;
  -webkit-box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.16);
  -moz-box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.16);
  box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.16);
  
  @media screen and (max-width: ${MD - 1}px) {      
    width: 100%;
    height: 330px;
  }
    
  @media screen and (max-width: ${SM - 1}px) {      
    width: 100%;
    height: 170px;
  }`
;

const CardContent = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
`;

const CardTitle = styled.h4`
    display: flex;
    align-items: center;
    line-height: 1.375rem;
    font-size: 1.125rem;
    letter-spacing: 0;
`;

const CardSubTitle = styled.div`
    font-size: 1rem;
    line-height: 1.5rem;
    width: 100%;
    margin-bottom: 0.5rem;
    font-weight: 600;
`;

const Crossed = styled.span`
    margin-right: 0.5rem;
    text-decoration: line-through;
    color: ${LIGHT_COLOR};
`;

const BundlesCardMedium: React.FC<Props> = ({bundle}) => {
  const router = useRouter();

  function renderImageSize(w: number, h: number) {
    return getBundleImage(bundle.poster, {height: h, width: w, fit: 'cover'});
  }

  function handleNavigation() {
    router.push(`/bundles/${bundle.bundleId}`);
  }

  return (
      <WrapperDiv onClick={handleNavigation}>
        <CardImageSpace>
          <CardImage src={renderImageSize(385, 385)} loading={'lazy'} alt={bundle.title} height={385} width={385}/>
        </CardImageSpace>
        <CardContent>
          <div>
            <CardTitle>
              {bundle.title}
            </CardTitle>
            <CardSubTitle>
              {
                (bundle.currentDiscount > 0)
                && <>
                  <Crossed>{currencyFormat(bundle.price)}</Crossed><span>{currencyFormat(returnDiscountedAmount(bundle.price, bundle.currentDiscount))}</span></>

              }
              <p>
                <small className="text-positive">&nbsp;(Additional {bundle.currentDiscount} % Off)</small>
              </p>
            </CardSubTitle>
          </div>
        </CardContent>
      </WrapperDiv>
  )
};

export default BundlesCardMedium;
