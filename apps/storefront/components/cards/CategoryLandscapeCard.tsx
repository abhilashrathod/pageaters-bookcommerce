import React from 'react';
import styled from "styled-components";
import {useRouter} from "next/router";

import {MD} from "../../core/_variables";
import {ICategory} from "../../schemas/category";
import {getCategoryImage} from "../../core/_imageRendererHelper";

interface Props {
  category: ICategory;
}

const CategoryItem = styled.div`
  border-radius: 1rem;
  cursor: pointer;
  margin-bottom: 1rem;
  display: flex;
  scroll-snap-align: start;
  scroll-snap-stop: normal;
  
  @media screen and (max-width: ${MD - 1}px) {      
    flex-direction: column;
    align-items: center;
  }
`;

const CategoryImageArea = styled.div`
   @media screen and (max-width: ${MD - 1}px) {      
    margin-bottom: 1rem;
  }
`;

const CategoryImage = styled.img`         
  object-fit: cover;
  border-radius: 50%;
  width: 64px;
  height: 64px;  
`;

const CategoryContentArea = styled.div`         
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin: 0 1rem;

  @media screen and (max-width: ${MD - 1}px) {      
    align-items: center;
  } 
`;

const CategoryTitle = styled.h4`
  font-size: 1rem;
  margin-bottom: .1rem;
  letter-spacing: normal;
  
   @media screen and (max-width: ${MD - 1}px) {      
    text-align: center;
  } 
`;

const CategoryDescription = styled.p`
  margin-bottom: 0;
  
  @media screen and (max-width: ${MD - 1}px) {      
    text-align: center;
  }
`;


const CategoryLandscapeCard: React.FC<Props> = ({category}) => {
  const router = useRouter();

  function renderImageSize(w: number, h: number) {
    return getCategoryImage(category.thumbnail, {height: h, width: w, fit: 'cover'});
  }


  function navigateToDetails(e: any) {
    e.preventDefault();
    router.push(`/categories/${category.categoryId}`);
  }

  return (
      <>
        <CategoryItem onClick={navigateToDetails}>
          <CategoryImageArea>
            <CategoryImage src={renderImageSize(64, 64)} loading={"lazy"} width={64} height={64} alt={category.title}/>
          </CategoryImageArea>
          <CategoryContentArea>
            <CategoryTitle>{category.title}</CategoryTitle>
            <CategoryDescription>{category.numberOfBooks} Books</CategoryDescription>
          </CategoryContentArea>
        </CategoryItem>
      </>
  )
};

export default CategoryLandscapeCard;
