import React, {useRef, useState} from 'react';
import useSWR from 'swr'
import styled from "styled-components";
import {Icon} from "@iconify/react";
import {Skeleton} from '@mantine/core';

import CategoryLandscapeCard from "../cards/CategoryLandscapeCard";

import {MD} from "../../core/_variables";
import {ICategory} from "../../schemas/category";

interface Props {
}

const CATEGORY = {
  categoryId: "CA-5609114898",
  numberOfBooks: 15,
  thumbnail: "fantacy-2bMBXeHBTu-1641323949900.jpg",
  title: "Fantacy",
  _id: "60f1600772a7bf2650dfb53c"
};

const CategoryTitleSpace = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SectionTitle = styled.h3`
  font-size: 2rem;
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
  const [params, setParams] = useState({page: 1, limit: 25});

  const {data, error} = useSWR({url: `${process.env.NEXT_PUBLIC_BASE_PATH}/categories`, args: params});

  function scrollRight() {
    // @ts-ignore
    carouselContainer.current.scrollTo({left: (carouselContainer.current.scrollLeft + 500), behavior: 'smooth'});
  }

  function scrollLeft() {
    // @ts-ignore
    carouselContainer.current.scrollTo({left: (carouselContainer.current.scrollLeft - 500), behavior: 'smooth'});
  }

  if (error) return <div>failed to load</div>;
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
                    <Icon icon="bx:bx-chevron-left-circle" height={30} width={30}/>
                  </IconButton>
                  <IconButton onClick={scrollRight}>
                    <Icon icon="bx:bx-chevron-right-circle" height={30} width={30}/>
                  </IconButton>
                </CategoryNavigators>
              </CategoryTitleSpace>
            </div>
          </div>
          <div ref={carouselContainer} className="row categories-list-container">
            {data.data.docs.map((category: ICategory) => (
                <div key={category._id} className="col-xxl-2 col-xl-2 col-lg-3 col-md-3 col-4">
                  <CategoryLandscapeCard category={category}/>
                </div>
            ))}
          </div>
        </div>
      </>
  )
};

export default Categories;
