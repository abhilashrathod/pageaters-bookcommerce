import React, {useState} from 'react';
import useSWR from 'swr';
import {get} from 'lodash';
import {useRouter} from "next/router";
import {useKeenSlider} from "keen-slider/react";
import styled from "styled-components";
import {Skeleton} from '@mantine/core';

import EmptySectionMessage from "../elements/FailedToLoad";
import CategoryPortraitCard from "../cards/CategoryPortraitCard";

import {MD} from "../../core/_variables";
import {ICategory} from "../../schemas/category";
import {Icon} from "@iconify/react";
import AppIconButton from "../form-controls/IconButton";
import {ButtonSizes, ButtonVariants} from "../form-controls/Button";

interface Props {
}

export const CategoryTitleSpace = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const SectionTitle = styled.h3`
  font-size: 1.571rem;
  line-height: 1.857rem;
  letter-spacing: normal;
  margin-bottom: 1rem;
`;

const CategoryNavigators = styled.div`
  display: none;
  
  @media screen and (min-width: ${MD - 1}px) {      
    display: block;      
  }
`;


const Categories: React.FC<Props> = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const {data, error} = useSWR({url: `/categories`, args: {page: 1, limit: 25, sortBy: 'priority', sortOrder: 'asc'}});

  const [refCallback, instanceRef] = useKeenSlider({
    mode: "free",
    breakpoints: {
      '(min-width: 993px)': {
        slides: {origin: "auto", perView: 8.25, spacing: 12},
      },
      '(max-width: 992px)': {
        slides: {origin: "auto", perView: 6.25, spacing: 12},
      },
      '(max-width: 768px)': {
        slides: {origin: "auto", perView: 5.25, spacing: 12},
      },
      '(max-width: 576px)': {
        slides: {origin: "auto", perView: 3.25, spacing: 12},
      },
    },
    slideChanged(slider) {
      setCurrentSlide(slider.track.details.rel)
    },
    created() {
      setLoaded(true)
    },
  });

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

  function handlePrev(e: any) {
    e.stopPropagation() || instanceRef.current?.prev()
  }

  function handleNext(e: any) {
    e.stopPropagation() || instanceRef.current?.next()
  }

  const categories = get(data, 'data.docs', []);

  return (
      <>
        <div className="custom-container">
          <div className="row">
            <div className="col">
              <CategoryTitleSpace>
                <SectionTitle>
                  Categories
                </SectionTitle>

                <CategoryNavigators>
                  <AppIconButton variant={ButtonVariants.Default} size={ButtonSizes.Small} styles={{padding: 0}} onClick={handlePrev}>
                    <Icon icon="fluent:chevron-circle-left-20-regular" height={28} width={28}/>
                  </AppIconButton>
                  <AppIconButton variant={ButtonVariants.Default} size={ButtonSizes.Small} styles={{padding: 0}} onClick={handleNext}>
                    <Icon icon="fluent:chevron-circle-right-20-regular" height={28} width={28}/>
                  </AppIconButton>
                </CategoryNavigators>
              </CategoryTitleSpace>
            </div>
          </div>
          <div className="row">
            <div className="col">
              <div ref={refCallback} className="keen-slider">
                {categories.map((category: ICategory) => (
                    <div className="keen-slider__slide" key={category._id}>
                      <CategoryPortraitCard category={category}/>
                    </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
  )
};

export default Categories;
