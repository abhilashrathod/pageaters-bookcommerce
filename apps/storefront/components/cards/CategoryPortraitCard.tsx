  import React from 'react';
import styled from 'styled-components';
import {useRouter} from "next/router";
import {getCategoryImage} from "../../core/_imageRendererHelper";
import {ICategory} from "../../schemas/category";
import {LIGHTER_PRIMARY_COLOR, MD} from "../../core/_variables";

interface Props {
  category: ICategory;
}



const CategoryItem = styled.div`
  position: relative;
  border-radius: 0.825rem;
  
  &:after {
    content: "";
    display: block;
    background: rgba(0,0,0,0.5);
    // background: linear-gradient(160deg, rgba(0, 0, 0, 0.75) 0%, transparent 100%);
    opacity: 1;
    left: 0;
    top: 0;
    height: 100%;
    width: 100%;
    border-radius: 1rem;
    position: absolute;
  }
  
  @media screen and (max-width: ${MD - 1}px) {
    border-radius: 0.5rem;
  }
`;

const CategoryImageArea = styled.div``;

const CategoryImage = styled.img`
  border-radius: 0.825rem;
  
  @media screen and (max-width: ${MD - 1}px) {
    border-radius: 0.5rem;
  }
`;

const CategoryContentArea = styled.div`
  width: 100%;
  position: absolute;
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  top: 0;
  align-items: center;
  z-index: 1;
  padding: 0.825rem;
`;

const CategoryTitle = styled.h4`
  font-size: 1.25rem;
  letter-spacing: 0;
  text-align: center;
  
  @media screen and (max-width: ${MD - 1}px) {
    font-size: 1rem;
  }
`;

const CategoryDescription = styled.p``;

const CategoryPortraitCard: React.FC<Props> = ({category}) => {
  const router = useRouter();

  function renderImageSize(w: number, h: number) {
    return getCategoryImage(category.thumbnail, {height: h, width: w, fit: 'cover'});
  }


  function navigateToDetails(e: any) {
    e.preventDefault();
    router.push(`/categories/${category.categoryId}`);
  }

  return (
      <CategoryItem onClick={navigateToDetails}>
        <CategoryImageArea>
          <CategoryImage src={renderImageSize(300, 400)} loading={"lazy"} width={400} height={300} alt={category.title}/>
        </CategoryImageArea>
        <CategoryContentArea>
          <CategoryTitle>{category.title}</CategoryTitle>
          <CategoryDescription>{category.numberOfBooks} Titles</CategoryDescription>
        </CategoryContentArea>
      </CategoryItem>
  )
};

export default CategoryPortraitCard;
