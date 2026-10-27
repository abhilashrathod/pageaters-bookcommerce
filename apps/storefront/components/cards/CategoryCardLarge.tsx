import React from 'react';
import styled from "styled-components";
import {useRouter} from "next/router";
import {useViewportSize} from "@mantine/hooks";

import {LG, MD, PRIMARY_COLOR, SECONDARY_COLOR, SM} from "../../core/_variables";
import {ICategory} from "../../schemas/category";
import {getCategoryImage} from "../../core/_imageRendererHelper";


interface Props {
  category: ICategory;
}

const CategoryItem = styled.div`
  position: relative;
  border-radius: 1rem;  
  width: 100%;  
  margin-bottom: 2rem;
  cursor: pointer;
`;

const CategoryImage = styled.img`
  border-radius: 1rem;
  background-size: cover;
  object-fit: cover;
  width: 100%;
`;

const CategoryTitleArea = styled.div`         
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 20%;
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
`;

const CategoryTitle = styled.h4`
  font-size: 1.8rem;
  letter-spacing: -1px;
  text-align: center;
  margin-bottom: 0;
  line-height: 1.9rem;
  color: ${SECONDARY_COLOR};
  
  @media screen and (max-width: ${LG - 1}px) {      
    font-size: 1.4rem;
    line-height: 1.5rem;
    letter-spacing: normal;  
  }
  
  @media screen and (max-width: ${MD - 1}px) {      
    font-size: 1.125rem;
    line-height: 1.3rem;
    letter-spacing: normal;
  }
  
  @media screen and (max-width: ${SM - 1}px) {      
    font-size: 1rem;
    line-height: 1.1rem;
    letter-spacing: normal;
  }
`;

const CategoryCardLarge: React.FC<Props> = ({category}) => {
  const router = useRouter();
  const {width} = useViewportSize();

  function renderImageSize(w: number, h: number) {
    return getCategoryImage(category.thumbnail, {height: h, width: w, fit: 'cover'});
  }

  function handleRedirection() {
    router.push(`/categories/${category.categoryId}`);
  }

  return (
      <>
        <CategoryItem onClick={handleRedirection}>
          <CategoryImage src={renderImageSize(247, 375)}>
          </CategoryImage>
          <CategoryTitleArea>
            <CategoryTitle>
              {category.title}
            </CategoryTitle>
          </CategoryTitleArea>
        </CategoryItem>
      </>
  )
};

export default CategoryCardLarge;
