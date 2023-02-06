import React, {useState} from 'react';
import styled from 'styled-components';
import {useRouter} from "next/router";
import {useKeenSlider} from "keen-slider/react";

import SectionHeading from "../elements/SectionHeading";
import BundlesCardMedium from "../cards/BundlesCardMedium";

import {IBundle} from "../../schemas/bundle";

interface Props {
}

const NavigationWrapper = styled.div`
  position: relative;
`;

const BOOKS = [
  {
    productId: 'BK-9818112389', // ice breaker
    backgroundColor: ''
  },
  {
    productId: 'BK-9417624112', // loath to love you
    backgroundColor: ''
  },
  {
    productId: 'BK-7875341159', // hell bent
    backgroundColor: ''
  },
  {
    productId: 'BK-8706405846', // Final offer
    backgroundColor: ''
  },
  {
    productId: 'BK-5318622784', // stolen heir
    backgroundColor: ''
  },
  {
    productId: 'BK-4635093742', // secretly yours
    backgroundColor: ''
  },

];

const FeaturedBooks: React.FC<Props> = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();

  const [refCallback, instanceRef] = useKeenSlider({
    mode: "free",
    initial: 0,
    breakpoints: {
      '(min-width: 993px)': {
        slides: {origin: "auto", perView: 4.25, spacing: 12},
      },
      '(max-width: 992px)': {
        slides: {origin: "auto", perView: 2.5, spacing: 12},
      },
      '(max-width: 768px)': {
        slides: {origin: "auto", perView: 2.25, spacing: 12},
      },
      '(max-width: 576px)': {
        slides: {origin: "auto", perView: 1.25, spacing: 12},
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

  return (
      <>
        <div className="custom-container">
          <div className="row">
            <div className="col">
              <SectionHeading sectionTitle={'Featured Books'}/>
            </div>
          </div>
          <div className="row">
            <div className="col">
              <NavigationWrapper>
                <div ref={refCallback} className="keen-slider">
                  {
                    bundles.map((bundle: IBundle) => {
                      return (
                          <div className="keen-slider__slide" key={bundle._id}>
                            <BundlesCardMedium bundle={bundle}/>
                          </div>
                      )
                    })
                  }
                </div>
              </NavigationWrapper>
            </div>
          </div>
        </div>
      </>
  )
};

export default FeaturedBooks;
