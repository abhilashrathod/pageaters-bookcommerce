import React, {useEffect, useState} from 'react';
import Image from 'next/image';
import styled from "styled-components";

import {getAssetImage} from "../../core/_imageRendererHelper";

import {IDeal} from "../../schemas/deal";
import {LG, MD, SECONDARY_COLOR, SM} from "../../core/_variables";

interface Props {
  deal: IDeal;
}

const MainCardWrapper = styled.div`
  margin-bottom: 1rem;
  position: relative;
  cursor: pointer;
`;

const CardCover = styled.div`
  margin-bottom: 0.625rem;
`;

const CardCoverImage = styled.img`
  border-radius: 1rem;
  width: 100%;
  height: 520px;
  object-fit: cover;
  object-position: center center;
  aspect-ratio: 1/1;
  filter: drop-shadow(0px 8px 6px rgba(0, 0, 0, 0.25)) !important;
  
  @media screen and (max-width: ${LG - 1}px) {      
    height: 460px;
  }
  
  @media screen and (max-width: ${MD - 1}px) {      
    height: 350px;
  }
  
  @media screen and (max-width: ${SM - 1}px) {      
    height: 390px;
  }
`;

const CardContent = styled.div`
    position: absolute;
    width: 50%;
    bottom: 2rem;
    max-width: 50%;
    left: 2rem;
`;

const CardTitle = styled.h4`
  line-height: 2.286rem;
  font-size: 2rem;
  margin-bottom: 0;
  color: ${SECONDARY_COLOR};
`;

const CardSubTitle = styled.p`
  font-size: 0.875rem;
  line-height: 1.125rem;
  width: 100%;
  margin-bottom: 0.5rem;
`;

const DealsCardLarge: React.FC<Props> = ({deal}) => {
  const [poster, setPoster] = useState('');

  useEffect(() => {
    setPoster(getAssetImage(deal.poster, {height: 520, width: 520, fit: 'cover'}));
  }, []);

  return (
      <>
        <MainCardWrapper>
          <CardCover>
            <CardCoverImage loading={"lazy"} src={poster} alt={deal.title} height={520} width={520}/>
          </CardCover>
          <CardContent>
            <CardTitle>
              {deal.title}
            </CardTitle>
          </CardContent>
        </MainCardWrapper>
      </>
  )
};

export default DealsCardLarge;
