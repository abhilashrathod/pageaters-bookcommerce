import React, {useRef, useState} from 'react';
import useSWR from 'swr'
import {useRouter} from "next/router";
import styled from "styled-components";
import {Icon} from "@iconify/react";
import {ScrollArea, Skeleton} from '@mantine/core';

import CategoryLandscapeCard from "../cards/CategoryLandscapeCard";
import EmptySectionMessage from "../elements/FailedToLoad";

import {MD} from "../../core/_variables";
import {ICategory} from "../../schemas/category";

interface Props {
}

export const CategoryTitleSpace = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const SectionTitle = styled.h3`
  font-size: 1.5rem;
  letter-spacing: normal;
`;

const IconButton = styled.button`
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  border-radius: 0.2rem;
  box-shadow: none;
  border: none;
  background: none;
`;

const CategoryNavigators = styled.div`
  display: none;
  
  @media screen and (min-width: ${MD - 1}px) {      
    display: block;      
  }
`;


const Categories: React.FC<Props> = () => {
  const carouselContainer = useRef(null);
  const router = useRouter();

  const [params, setParams] = useState({page: 1, limit: 25, sortBy: 'priority', sortOrder: 'asc'});

  const {data, error} = useSWR({url: `/categories`, args: params});

  function scrollRight() {
    // @ts-ignore
    carouselContainer.current.scrollTo({left: (carouselContainer.current.scrollLeft + 500), behavior: 'smooth'});
  }

  function scrollLeft() {
    // @ts-ignore
    carouselContainer.current.scrollTo({left: (carouselContainer.current.scrollLeft - 500), behavior: 'smooth'});
  }

  if (error) return <EmptySectionMessage title={'Failed to Load Categories...'}/>;
  if (!data) return (
      <div className="custom-container">
        <div className="row">
          {
            [0, 0, 0, 0, 0, 0].map((item, index) => (
                <div key={index} className="col-xxl-2 col-xl-2 col-lg-3 col-md-3 col-4">
                  <Skeleton height={50} circle mb="xl"/>
                  <Skeleton height={8} radius="xl"/>
                  <Skeleton height={8} mt={6} radius="xl"/>
                  <Skeleton height={8} mt={6} width="70%" radius="xl"/>
                </div>
            ))
          }
        </div>
      </div>
  );

  function navigateToCategories() {
    router.push(`/categories`);
  }

  return (
      <>
        <div className="custom-container">
          <div className="row">
            <div className="col">
              <CategoryTitleSpace>
                <SectionTitle>
                  Categories ({data.data.docs.length})
                </SectionTitle>

                <CategoryNavigators>
                  <IconButton onClick={scrollLeft}>
                    <Icon icon="bx:bx-chevron-left-circle" height={24} width={24}/>
                  </IconButton>
                  <IconButton onClick={scrollRight}>
                    <Icon icon="bx:bx-chevron-right-circle" height={24} width={24}/>
                  </IconButton>
                </CategoryNavigators>
              </CategoryTitleSpace>
            </div>
          </div>
          <ScrollArea viewportRef={carouselContainer}>
            <div className="row categories-list-container">
              {data.data.docs.map((category: ICategory) => (
                  <div key={category._id} className="col-xxl-2 col-xl-2 col-lg-3 col-md-3 col-4">
                    <CategoryLandscapeCard category={category}/>
                  </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </>
  )
};

export default Categories;
