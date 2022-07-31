import React, {useState} from "react";
import {range} from 'lodash';
import {Skeleton} from "@mantine/core";
import styled from "styled-components";
import {useKeenSlider} from "keen-slider/react";
import {Icon} from "@iconify/react";
import SectionHeading from "../elements/SectionHeading";
import AppIconButton from "../form-controls/IconButton";
import {ButtonSizes, ButtonVariants} from "../form-controls/Button";

import {MD} from "../../core/_variables";
import {IDeal} from "../../schemas/deal";
import DealsCardLarge from "../cards/DealsCardLarge";

interface Props {
  title: string;
  deals: Array<IDeal>;
}

const Navigators = styled.div`
  display: none;
  
  @media screen and (min-width: ${MD - 1}px) {      
    display: block;      
  }
`;

const NavigationWrapper = styled.div`
  position: relative;
`;

const DealsCarousel: React.FC<Props> = ({title, deals}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const [refCallback, instanceRef] = useKeenSlider({
    mode: "free",
    initial: 0,
    breakpoints: {
      '(min-width: 993px)': {
        slides: {origin: "auto", perView: 3.1, spacing: 12},
      },
      '(max-width: 992px)': {
        slides: {origin: "auto", perView: 2.1, spacing: 12},
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

  // if (error) return <EmptySectionMessage title={'Failed to load Collections list...'}/>;

  return (
      <div className="custom-container">
        <div className="row">
          <div className="col">
            <SectionHeading sectionTitle={title} sectionExtras={SectionExtras}/>
          </div>
        </div>

        {
          deals?.length === 0
              ? <div className="row">
                {
                  range(1, 4).map((item, index) => {
                    return (
                        <div key={index} className="col-xxl-4 col-xl-4 col-lg-6 col-sm-6 col-12">
                          <Skeleton height={520} mb={20} radius="lg"/>
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
                        deals.map((deal: IDeal) => {
                          return (
                              <div className="keen-slider__slide" key={deal.dealId}>
                                <DealsCardLarge deal={deal}/>
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
  )
};

export default DealsCarousel;
