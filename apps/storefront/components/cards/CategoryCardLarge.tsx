import React, {useEffect, useState} from 'react';
import styled from "styled-components";

import {LG, MD, SECONDARY_COLOR, SM} from "../../core/_variables";
import {ICategory} from "../../schemas/category";
import {getCategoryImage} from "../../core/_imageRendererHelper";

interface Props {
  category: ICategory;
}

const CategoryItem = styled.div`
  position: relative;
  border-radius: 1rem;
  background-size: cover;
  width: 100%;
  height: 400px;
  margin-bottom: 2rem;
  cursor: pointer;
  
  @media screen and (max-width: ${LG - 1}px) {      
    height: 300px; 
  }
  
  @media screen and (max-width: ${MD - 1}px) {      
    height: 220px;
  }
  
  @media screen and (max-width: ${SM - 1}px) {      
    height: 200px;
  }
`;

const CategoryTitleArea = styled.div`         
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 25%;
  -webkit-backdrop-filter: blur(5px);
  backdrop-filter: blur(5px);
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  border-top-left-radius: 0;
  border-top-right-radius: 0;

  @media screen and (max-width: ${SM - 1}px) {      
    height: 30%;
  } 
`;

const CategoryTitle = styled.h4`
  font-size: 2.5rem;
  letter-spacing: -1px;
  text-align: center;
  line-height: 2.5rem;
  color: ${SECONDARY_COLOR};
  
  @media screen and (max-width: ${LG - 1}px) {      
    font-size: 1.75rem;
    line-height: 1.75rem;
    letter-spacing: normal;  
  }
  
  @media screen and (max-width: ${MD - 1}px) {      
    font-size: 2.25rem;
    line-height: 2.25rem;
    letter-spacing: normal;
  }
  
  @media screen and (max-width: ${SM - 1}px) {      
    font-size: 1.25rem;
    line-height: 1.25rem;
    letter-spacing: normal;
  }
`;

const CategoryCardLarge: React.FC<Props> = ({category}) => {
  const [poster, setPoster] = useState('');

  useEffect(() => {
    setPoster(getCategoryImage(category.thumbnail, {height: 400, fit: 'cover', width: 400}));
  }, []);

  return (
      <>
        <CategoryItem style={{backgroundImage: `url(${poster})`}}>
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
