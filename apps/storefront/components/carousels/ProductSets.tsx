import React, {useState} from 'react';
import {useKeenSlider} from "keen-slider/react";
import {kebabCase} from 'lodash';
import {Skeleton} from "@mantine/core";
import styled from "styled-components";
import {Icon} from "@iconify/react";

import ProductCardLandScape from "../cards/ProductCardLandscape";
import SectionHeading from "../elements/SectionHeading";
import AppIconButton from "../form-controls/IconButton";
import {ButtonSizes, ButtonVariants} from "../form-controls/Button";

import {MD} from "../../core/_variables";

import {IBook} from "../../schemas/book";
import EmptySectionMessage from "../elements/FailedToLoad";

interface Props {
  title: string;
  products: Array<IBook>;
}

const Navigators = styled.div`
  display: none;
  
  @media screen and (min-width: ${MD - 1}px) {      
    display: block;
  }
`;

const ProductSets: React.FC<Props> = ({title, products}) => {
  // const {data, error} = useSWR({url});

  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const [refCallback, instanceRef] = useKeenSlider({
    mode: "free",
    slides: {
      spacing: 10,
    },
    breakpoints: {
      '(min-width: 993px)': {
        slides: {origin: "auto", perView: 7.5, spacing: 12},
      },
      '(max-width: 992px)': {
        slides: {origin: "auto", perView: 5.1, spacing: 12},
      },
      '(max-width: 768px)': {
        slides: {origin: "auto", perView: 4.1, spacing: 12},
      },
      '(max-width: 576px)': {
        slides: {origin: "auto", perView: 2.1, spacing: 12},
      },
    },
    slideChanged(slider) {
      setCurrentSlide(slider.track.details.rel)
    },
    created() {
      setLoaded(true)
    },
  });

  function handlePrev(e: any) {
    e.stopPropagation() || instanceRef.current?.prev()
  }

  function handleNext(e: any) {
    e.stopPropagation() || instanceRef.current?.next()
  }

  const SectionExtras = () => (
      <Navigators>
        <AppIconButton variant={ButtonVariants.Default} size={ButtonSizes.Small} styles={{padding: 0}}
                       onClick={handlePrev}>
          <Icon icon="fluent:chevron-circle-left-20-regular" height={28} width={28}/>
        </AppIconButton>
        <AppIconButton variant={ButtonVariants.Default} size={ButtonSizes.Small} styles={{padding: 0}}
                       onClick={handleNext}>
          <Icon icon="fluent:chevron-circle-right-20-regular" height={28} width={28}/>
        </AppIconButton>
      </Navigators>
  );

  return (
      <>
        <div className="custom-container">
          <div className="row">
            <div className="col">
              <SectionHeading sectionTitle={title} sectionExtras={SectionExtras}/>
            </div>
          </div>
          {
            products?.length === 0
                ? <div className="row">
                  {
                    [0, 0, 0, 0, 0, 0].map((item, index) => {
                      return (
                          <div key={index} className="col-xxl-2 col-xl-3 col-lg-3 col-md-3 col-6">
                            <Skeleton height={300} radius="lg"/>
                            <Skeleton height={10} width="100%" mt={10} radius="sm"/>
                            <Skeleton height={10} width="100%" mt={10} radius="sm"/>
                          </div>
                      )
                    })
                  }
                </div>
                : <div className="row">
                  <div className="col">
                    <div ref={refCallback} className="keen-slider">
                      {
                        products.map((book: IBook) => {
                          return (
                              <div className="keen-slider__slide" key={book._id}>
                                <ProductCardLandScape book={book} analytics={{listId: kebabCase(title), listName: title}}/>
                              </div>
                          )
                        })
                      }
                    </div>
                  </div>
                </div>
          }
        </div>
      </>
  )
};

export default ProductSets;
