import React, {useState} from 'react';
import styled from 'styled-components';
import {Icon} from "@iconify/react";
import {kebabCase} from 'lodash';
import {useKeenSlider} from "keen-slider/react";

import SectionHeading from "../elements/SectionHeading";
import AppIconButton from "../form-controls/IconButton";
import ProductCardLandScape from "../cards/ProductCardLandscape";
import {ButtonSizes, ButtonVariants} from "../form-controls/Button";

import {MD} from "../../core/_variables";

import {ICollection} from "../../schemas/collection";
import {IBook} from "../../schemas/book";
import EmptySectionMessage from "../elements/FailedToLoad";

interface Props {
  collection: ICollection;
}

const Navigators = styled.div`
  display: none;
  
  @media screen and (min-width: ${MD - 1}px) {      
    display: block;      
  }
`;

const CollectionGallery: React.FC<Props> = ({collection}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const [refCallback, instanceRef] = useKeenSlider({
    mode: "free",
    breakpoints: {
      '(min-width: 993px)': {
        slides: {origin: "auto", perView: 7.5, spacing: 12},
      },
      '(max-width: 992px)': {
        slides: {origin: "auto", perView: 5.25, spacing: 12},
      },
      '(max-width: 768px)': {
        slides: {origin: "auto", perView: 4.25, spacing: 12},
      },
      '(max-width: 576px)': {
        slides: {origin: "auto", perView: 2.25, spacing: 12},
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
        <AppIconButton variant={ButtonVariants.Default} size={ButtonSizes.Small} styles={{padding: 0}} onClick={handlePrev}>
          <Icon icon="fluent:chevron-circle-left-20-regular" height={28} width={28}/>
        </AppIconButton>
        <AppIconButton variant={ButtonVariants.Default} size={ButtonSizes.Small} styles={{padding: 0}} onClick={handleNext}>
          <Icon icon="fluent:chevron-circle-right-20-regular" height={28} width={28}/>
        </AppIconButton>
      </Navigators>
  );

  return (
      <>
        <div className={'custom-container'}>
          <div className="row">
            <div className="col">
              <SectionHeading sectionTitle={collection.title} sectionExtras={SectionExtras}/>
            </div>
          </div>
          <div className="row">
            <div className="col">
              <div ref={refCallback} className="keen-slider">
                {
                  collection.books.map((book: IBook) => {
                    return (
                        <div className="keen-slider__slide" key={book._id}>
                          <ProductCardLandScape book={book} analytics={{
                            listId: kebabCase(collection.title),
                            listName: collection.title
                          }}/>
                        </div>
                    )
                  })
                }
              </div>
            </div>
          </div>
        </div>
      </>
  )
};

export default CollectionGallery;
