import React, {useState} from 'react';
import {useKeenSlider} from "keen-slider/react";
import useSWR from "swr";
import styled from "styled-components";
import {Skeleton} from "@mantine/core";
import {get} from 'lodash';
import {Icon} from "@iconify/react";

import SectionHeading from "../elements/SectionHeading";
import BundlesCardMedium from "../cards/BundlesCardMedium";
import EmptySectionMessage from "../elements/FailedToLoad";

import AppIconButton from "../form-controls/IconButton";
import {ButtonSizes, ButtonVariants} from "../form-controls/Button";
import {MD} from "../../core/_variables";

import {IBundle} from "../../schemas/bundle";

interface Props {
  url: string;
  title: string;
}

const NavigationWrapper = styled.div`
  position: relative;
`;

const Navigators = styled.div`
  display: none;
  
  @media screen and (min-width: ${MD - 1}px) {      
    display: block;      
  }
`;

const Bundles: React.FC<Props> = ({url, title}) => {
  const {data, error} = useSWR({url});

  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);

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

  if (error) return <EmptySectionMessage title={'Failed to load Bundles...'}/>;

  const bundles = get(data, 'data.docs', []);

  return (
      <>
        <div className="custom-container">
            <div className="row">
              <div className="col">
                <SectionHeading sectionTitle={title} sectionExtras={SectionExtras}/>
              </div>
            </div>
            {
              bundles.length === 0
                  ? <div className="row">
                    {
                      [0, 0, 0, 0].map((item, index) => {
                        return (
                            <div key={index} className="col-lg-3 col-6">
                              <Skeleton height={385} radius="lg"/>
                            </div>
                        )
                      })
                    }
                  </div>
                  : <div className="row">
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
            }

          </div>
      </>
  )
};

export default Bundles;
