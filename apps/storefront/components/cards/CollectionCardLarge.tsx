import React, {useEffect, useState} from 'react';
import styled from "styled-components";

import {getCollectionImage} from "../../core/_imageRendererHelper";

import {ICollection} from "../../schemas/collection";

import {LG, MD, SM} from "../../core/_variables";

interface Props {
  collection: ICollection;
}

const MainCardWrapper = styled.div`  
  margin-bottom: 1rem;
  border-radius: 1rem;
  cursor: pointer;
  border: 1px solid #ccc;
`;
const CardCoverSpace = styled.div``;

const CardImage = styled.img`
  border-bottom-left-radius: 1rem;
  border-bottom-right-radius: 1rem;
  width: 100%;
  height: 420px;
  object-fit: cover;
  object-position: center center;
  vertical-align: middle;
  
  @media screen and (max-width: ${LG - 1}px) {      
    width: 100%;
    height: 355px;
  }
  
  @media screen and (max-width: ${MD - 1}px) {      
    width: 100%;
    height: 275px;
  }
    
  @media screen and (max-width: ${SM - 1}px) {      
    width: 100%;
    height: 320px;
  }
`;

const CardContent = styled.div`
  padding: 1.5rem;
  margin-bottom: 2.5rem;
  
  @media screen and (max-width: ${LG - 1}px) {      
    margin-bottom: 1.5rem;
  }
    
  @media screen and (max-width: ${SM - 1}px) {      
    margin-bottom: 1rem;
    padding: 1rem;
  }
`;

const CardTextSpace = styled.div`
  margin-bottom: 4px;
`;

const CardTitle = styled.h4`
  letter-spacing: -1px;
  font-weight: 300;
  font-size: 2rem;
`;

const CardSubTitle = styled.h4`
  font-size: 1rem;
  margin-bottom: 0.1rem;
  letter-spacing: 0;
`;

const CollectionCardLarge: React.FC<Props> = ({collection}) => {
  const [poster, setPoster] = useState('');

  useEffect(() => {
    setPoster(getCollectionImage(collection.poster, {height: 345, fit: 'cover', width: 517}));
  }, []);

  return (
      <MainCardWrapper>
        <CardContent>
          <CardTextSpace>
            <CardTitle>
              {collection.title}
            </CardTitle>
          </CardTextSpace>
          <CardSubTitle>
            {
              collection.tags.map((tag, index) => (
                  <span key={index}>
                      {tag}
                  </span>
              ))
            }
          </CardSubTitle>
        </CardContent>
        <CardCoverSpace>
          <CardImage src={poster} alt={collection.title}/>
        </CardCoverSpace>
      </MainCardWrapper>
  )
};

export default CollectionCardLarge;
