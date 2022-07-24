import React, {useEffect, useState} from 'react';
import styled from "styled-components";
import {useRouter} from "next/router";

import AppButton, {ButtonSizes, ButtonVariants} from "../form-controls/Button";

import {getCollectionImage, getProductImage} from "../../core/_imageRendererHelper";

import {ICollection} from "../../schemas/collection";
import {MD, SECONDARY_COLOR, SM} from "../../core/_variables";

interface Props {
  collection: ICollection;
}

const MainCardWrapper = styled.div`
  margin-bottom: 1rem;
  border-radius: 1rem;
  position: relative;
  cursor: pointer;
  
   &:after {
    content: "";
    display: block;
    background: #000;
    background: linear-gradient(160deg, rgba(0, 0, 0, 0.2) 0%, transparent 100%);
    opacity: 1;
    left: 0;
    top: 0;
    height: 100%;
    width: 100%;
    border-radius: 1rem;
    position: absolute;
  }
`;
const CardCoverSpace = styled.div``;

const CardImage = styled.img`
  border-radius: 1rem;
  width: 100%;
  max-width: 100%;
  height: 345px;
  object-fit: cover;
  
  @media screen and (max-width: ${MD - 1}px) {
   height: 250px; 
  }
  
  @media screen and (max-width: ${SM - 1}px) {
   height: 200px; 
  }
`;

const CardContent = styled.div`
  position: absolute;
  left: 2rem;
  height: 100%;
  display: flex;
  justify-content: space-between;
  top: 0;
  z-index: 1;
  max-width: 200px;
  word-break: break-word;
  flex-direction: column;
  padding: 2rem 0;
  
  @media screen and (max-width: ${MD - 1}px) {
   left: 1.5rem;
   padding: 1.5rem 0;
  }
`;

const CardTitle = styled.h4`
  display: flex;
  align-items: center;
  font-size: 1.6rem;
  line-height: 1.886rem;
  color: ${SECONDARY_COLOR};
  
  @media screen and (max-width: ${SM - 1}px) {
    font-size: 1.457rem;
    line-height: 1.743rem;
  }
`;

const CardTextSpace = styled.div``;
const CardLearnMore = styled.div``;

const AvatarList = styled.div`
  display: flex;
  margin-bottom: 0;
`;

const AvatarListItem = styled.div`
  margin-left: -5px;
`;

const AvatarImageSpace = styled.div`
  box-shadow: 0 0 0 2px ${SECONDARY_COLOR};          
  align-items: center;
  display: flex;
  justify-content: center;          
  border-radius: 50%;
`;

const AvatarStyles = `
  align-items: center;
  background-color: rgb(187, 187, 187);
  border-radius: 50%;
  box-shadow: rgb(255 255 255) 0px 0px 0px 2px;
  color: ${SECONDARY_COLOR};
  display: flex;
  height: 3rem;
  width: 3rem;
  justify-content: center;
  object-fit: cover;
  object-position: top center;
  
  @media screen and (max-width: ${SM - 1}px) {
    height: 2rem;
    width: 2rem;
  }
`;

const AvatarImage = styled.img`${AvatarStyles}`;
const AvatarSpan = styled.span`${AvatarStyles}`;


const CollectionCardSmall: React.FC<Props> = ({collection}) => {
  const [showRestCounter, setShowRestCounter] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (collection.books.length > 4) {
      setShowRestCounter(collection.books.length - 4);
      collection.books = collection.books.splice(0, 4);
    }
  }, [collection]);

  function renderImageSize(w: number, h: number) {
    return getCollectionImage(collection.poster, {height: h, width: w, fit: 'cover'});
  }

  function handleProductImage(imageUrl: string) {
    return getProductImage(imageUrl, {height: 48, width: 48, fit: 'cover'});
  }

  function handleNavigation() {
    router.push(`/collections/${collection.collectionId}`);
  }

  return (
      <MainCardWrapper onClick={handleNavigation}>
        <CardCoverSpace>
          <CardImage src={renderImageSize(517, 345)} loading={'lazy'} alt={collection.title} />
        </CardCoverSpace>
        <CardContent>
          <CardTextSpace>
            <CardTitle>
              {collection.title}
            </CardTitle>
          </CardTextSpace>
          <CardLearnMore>
            <AvatarList>
              {
                collection.books.map((book, index) => {
                  return (
                      <AvatarListItem key={index} title={book.title}>
                        <AvatarImageSpace>
                          <AvatarImage loading={'lazy'} src={handleProductImage(book.poster)} alt={book.title}
                                       height={48} width={48}/>
                        </AvatarImageSpace>
                      </AvatarListItem>
                  )
                })
              }
              {
                showRestCounter > 0 && (
                    <AvatarListItem>
                      <AvatarImageSpace>
                        <AvatarSpan>
                          +{showRestCounter}
                        </AvatarSpan>
                      </AvatarImageSpace>
                    </AvatarListItem>
                )
              }
            </AvatarList>
          </CardLearnMore>
        </CardContent>
      </MainCardWrapper>

  )
};

export default CollectionCardSmall;
