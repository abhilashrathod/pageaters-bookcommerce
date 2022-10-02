import React from 'react';
import styled from 'styled-components'
import useSWR from "swr";
import {useRouter} from "next/router";
import {get, range} from 'lodash';
import {Skeleton} from "@mantine/core";
import {useViewportSize} from "@mantine/hooks";

import ProductCardLandScape from "../cards/ProductCardLandscape";
import SectionHeading from "../elements/SectionHeading";
import EmptySectionMessage from "../elements/FailedToLoad";

import {getAssetImage} from "../../core/_imageRendererHelper";

import {MD, SECONDARY_COLOR, SM} from "../../core/_variables";

import {IBook} from "../../schemas/book";

interface Props {
}

const CategoryWrapper = styled.div`
  display: grid;
  grid-gap: 1rem;
  grid-template-columns:1fr 2fr;
  
  @media screen and (max-width: ${MD - 1}px) {
    grid-template-columns:1fr;
  }
   
  @media screen and (max-width: ${SM - 1}px) {
    grid-template-columns:1fr; 
  }
`;

const OtherBooks = styled.div`
  display:grid;
  grid-gap: 1rem;
  grid-template-columns: repeat(5, 1fr);
  
  @media screen and (max-width: ${MD - 1}px) {
    grid-gap: 1.25rem;
    grid-template-columns: repeat(4, 1fr);
  }
  
  @media screen and (max-width: ${SM - 1}px) {
    grid-gap: 1rem;
    grid-template-columns: repeat(2, 1fr);
  }
`;

const PosterSection = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-start;
  position: relative;
`;

const PosterImg = styled.img`
  width: 500px;
  height: 750px;
  object-fit: cover;
  border-radius: 1rem;
  cursor: pointer;
  
  @media screen and (max-width: ${MD - 1}px) {
    width: 100%;
    height: 300px;
  }
  
  @media screen and (max-width: ${SM - 1}px) {
    width: 100%;
    height: 250px;
  }
`;

const PosterTitle = styled.h3`  
  color: ${SECONDARY_COLOR};  
  
  @media screen and (max-width: ${SM - 1}px) {    
    text-align: center;
    font-size: 1.8rem;
    letter-spacing: -1px;
  }
`;

const PosterContent = styled.div`
  position: absolute;
  top: 2.5rem;
  left: 2.5rem;
  max-width: 50%;
  
  @media screen and (max-width: ${SM - 1}px) {
    bottom: 1rem;
    left: 0;
    top: auto;
    max-width: 100%;
    width: 100%;
  }
`;

const LoadingCard = () => (
    <>
      <Skeleton height={50} circle mb="xl"/>
      <Skeleton height={8} radius="xl"/>
      <Skeleton height={8} mt={6} radius="xl"/>
      <Skeleton height={8} mt={6} width="70%" radius="xl"/>
    </>
);

const FeaturedCategory: React.FC<Props> = () => {
  const {data: categoryRes, error: categoryErr} = useSWR({url: `/categories/unique/${'CA-8238991218'}`});
  const {data: storeDealRes, error: storeDealErr} = useSWR({url: `/deals/unique/${'DE-6009406967'}`});
  const {data: productRes, error: productErr} = useSWR({url: `/product-sets/slug/featured-category-set-gqgACP`});

  const category = get(categoryRes, 'data', null);
  const discount = get(storeDealRes, 'data', null);
  const products = get(productRes, 'data.products', []);

  const {width} = useViewportSize();
  const router = useRouter();

  function renderImageSize(w: number, h: number) {
    return getAssetImage(discount.poster, {height: h, width: w, fit: 'cover'});
  }

  function handleNavigation(id: string) {
    router.push(`/deals/${id}`);
  }

  const ProductsList = () => {
    return products.map((item: IBook) =>
        <ProductCardLandScape key={item._id}
                              book={item}
                              analytics={{
                                listId: 'featured-category-products',
                                listName: 'Featured Category Products'
                              }}/>);
  };

  if (categoryErr || storeDealErr || productErr) return <EmptySectionMessage title={'Failed to Category details...'}/>;

  return (
      <>
        <div className={'custom-container'}>
          <div className="row">
            <div className="col">
              <SectionHeading sectionTitle={`Featured Category: ${category?.title}`}/>
            </div>
          </div>
          <div className="row">
            <CategoryWrapper>
              <PosterSection>
                {
                  !discount
                      ? <Skeleton height={(width <= MD - 1) ? 200 : 750} circle mb="xl"/>
                      : (
                          <>
                            <PosterImg onClick={() => handleNavigation(discount.dealId)}
                                       src={(width <= MD - 1) ? renderImageSize(500, 200) : renderImageSize(500, 750)}
                                       loading={'lazy'}/>
                            <PosterContent>
                              <PosterTitle>{discount.title}</PosterTitle>
                            </PosterContent>
                          </>
                      )
                }
              </PosterSection>
              <OtherBooks>
                {
                  products.length === 0
                      ? range(0, 10).map((item, index) => <LoadingCard key={index}/>)
                      : <ProductsList/>
                }
              </OtherBooks>
            </CategoryWrapper>
          </div>
        </div>
      </>
  )
};

export default FeaturedCategory;
