import React, { useState } from "react";
import styled from "styled-components";
import { useKeenSlider } from "keen-slider/react";
import { useViewportSize } from "@mantine/hooks";

import AppButton from "../form-controls/Button";

import {
  MD,
  SECONDARY_COLOR,
  SM,
} from "../../core/_variables";
import { IBanner } from "../../schemas/banner";
import { useRouter } from "next/router";
import { getAssetImage } from "../../core/_imageRendererHelper";
import useAuth from "../../hooks/useAuth";

interface Props {}

const Hero = styled.section`
  display: flex;
  align-items: flex-end;
  margin-bottom: 2rem;
  position: relative;
  z-index: 0;
  height: 95vh;

  @media screen and (max-width: ${SM - 1}px) {
    height: 75vh;
  }
`;

const HeroTitleSection = styled.div`
  position: absolute;
  bottom: 2rem;
  left: 1rem;
  z-index: 2;
`;

const HeroTitle = styled.h2`
  color: ${SECONDARY_COLOR};
  position: relative;
  font-size: 3.714rem;
  line-height: 4rem;
  letter-spacing: -2px;
  margin-bottom: 1rem;
  text-shadow: 3px 4px 7px rgba(81, 67, 21, 0.8);

  @media screen and (max-width: ${MD - 1}px) {
    font-size: 3rem;
    line-height: 4rem;
    letter-spacing: -1px;
  }

  @media screen and (max-width: ${SM - 1}px) {
    font-size: 2rem;
    line-height: 2.5rem;
    letter-spacing: -1px;
  }
`;

const HeroSubTitle = styled.p`
  color: ${SECONDARY_COLOR};
  text-shadow: 3px 4px 7px rgba(81, 67, 21, 0.8);
`;

const BannerImage = styled.img`
  width: 100%;
  cursor: pointer;
  height: 100%;
  object-fit: cover;
  object-position: center center;

  @media screen and (max-width: ${SM - 1}px) {
  }
`;

const DATA: Array<IBanner> = [
  {
    poster: "diwali-sale-banner.png",
    title: "Diwali'23 Sale",
    subtitle: "Store wide discount (Except on Pre-orders, Procurement and Import Items)",
    ctaLink: "",
    ctaText: "",
    ctaVisible: false,
  },
  {
    poster: "if-bkg-min.png",
    title: "Pre-order Iron Flame",
    subtitle: "The Thrilling Sequel To The Number One Global Bestselling Phenomenon Fourth Wing",
    ctaLink: "/books/BK-9405609836",
    ctaText: "Pre-order Now!",
    ctaVisible: true,
  },
  {
    poster: "kog-bkg-min.png",
    title: "King of Greed",
    subtitle: `Ana Haung's Steamy Romance Has 3rd Installment is Finally Out!`,
    ctaLink: "/books/BK-2481984604",
    ctaText: "Buy Now!",
    ctaVisible: true,
  },
  {
    poster: "TWLB - HeroImage - A.png",
    title: "Things We Left Behind",
    subtitle: "Most Anticipated 3rd Installment in Lucy Score's Masterful Knockemout Series",
    ctaLink: "/books/BK-9841269278",
    ctaText: "Buy Now!",
    ctaVisible: true,
  },
  {
    poster: "FourthWIng - HeroBanner - B.png",
    title: "Fourth Wing: Hardback Stenciled Edges Edition",
    subtitle: "New Release & A Worldwide Bestseller",
    ctaLink: "/books/BK-9941526851",
    ctaText: "Buy Now!",
    ctaVisible: true,
  },
  {
    poster: "AGGGTM - HeroBanner - B.png",
    title: "A Good Girl's Guide to Murder: The Collector's Edition!",
    subtitle: "Out on 15th November in Hardback!",
    ctaLink: "/books/BK-2956334839",
    ctaText: "Buy Now!",
    ctaVisible: true,
  },
  {
    poster: "Circe - HeroBanner - B.png",
    title: "Circe: 5th Anniversary Collector's Edition",
    subtitle: "Out on 18th Nov 23",
    ctaLink: "/books/BK-9408385306",
    ctaText: "Buy Now!",
    ctaVisible: true,
  },
  {
    poster: "Shatter Me - HeroBanner - B.png",
    title: "Shatter Me: Collector's Edition",
    subtitle: "Coming Soon",
    ctaLink: "",
    ctaText: "",
    ctaVisible: false,
  }
];

function Arrow(props: any) {
  const disabeld = props.disabled ? " arrow--disabled" : "";
  return (
    <svg
      onClick={props.onClick}
      className={`arrow ${
        props.left ? "arrow--left" : "arrow--right"
      } ${disabeld}`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
    >
      {props.left && (
        <path d="M16.67 0l2.83 2.829-9.339 9.175 9.339 9.167-2.83 2.829-12.17-11.996z" />
      )}
      {!props.left && (
        <path d="M5 3l3.057-3 11.943 12-11.943 12-3.057-3 9-9z" />
      )}
    </svg>
  );
}

const HeroBanner: React.FC<Props> = () => {
  const router = useRouter();
  const loggedIn = useAuth();
  const { height, width } = useViewportSize();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const [refCallback, instanceRef] = useKeenSlider({
    mode: 'free-snap',
    loop: true,
  }, 
  [
    (slider) => {
      let timeout: any;
      let mouseOver = false
      function clearNextTimeout() {
        clearTimeout(timeout)
      }
      function nextTimeout() {
        clearTimeout(timeout)
        if (mouseOver) return
        timeout = setTimeout(() => {
          slider.next()
        }, 3000)
      }
      slider.on("created", () => {
        slider.container.addEventListener("mouseover", () => {
          mouseOver = true
          clearNextTimeout()
        })
        slider.container.addEventListener("mouseout", () => {
          mouseOver = false
          nextTimeout()
        })
        nextTimeout()
      })
      slider.on("dragStarted", clearNextTimeout)
      slider.on("animationEnded", nextTimeout)
      slider.on("updated", nextTimeout)
    },
  ]
  );

  function renderBanner(image: string) {
    return getAssetImage(image, { height: 1080, width: 1920 });
  }

  function handleNavigation(url: string | undefined) {
    url && router.push(url);
  }
  
  return (
    <Hero>
      {/* <div className="custom-container">
        <div className="row">
          <div className="col"> */}
            <div ref={refCallback} className="keen-slider">
              {DATA.map((item, index) => {
                return (
                  <div className="keen-slider__slide" key={item.title}>
                    <BannerImage
                      src={renderBanner(item.poster)}
                      loading={"lazy"}
                      height={720} width={1080}
                      alt={item.title}
                    />
                    <HeroTitleSection>
                      <HeroTitle>{item.title}</HeroTitle>
                      <HeroSubTitle>{item.subtitle}</HeroSubTitle>
                      {item.ctaVisible && (
                        <AppButton
                          variant={"secondary"}
                          onClick={() => handleNavigation(item.ctaLink)}
                        >
                          {item.ctaText}
                        </AppButton>
                      )}
                    </HeroTitleSection>
                  </div>
                );
              })}
            </div>
          {/* </div>
        </div>
      </div> */}
    </Hero>
  );
};

export default HeroBanner;

// import React, {useEffect, useState} from 'react';
// import styled from "styled-components";

// import AppButton from "../form-controls/Button";

// import {LG, MD, PRIMARY_COLOR, SECONDARY_COLOR, SM} from "../../core/_variables";
// import {IBanner} from "../../schemas/banner";
// import {useRouter} from "next/router";
// import {getAssetImage} from "../../core/_imageRendererHelper";
// import useAuth from "../../hooks/useAuth";

// interface Props {
//   banner: IBanner;
// }

// const Hero = styled.section`
//   background-repeat: no-repeat;
//   background-position: center center;
//   background-size: cover;

//   display: flex;
//   align-items: flex-end;
//   padding-bottom: 2rem;
//   position: relative;
//   z-index: 0;

//   height: 80vh;

//  &:after {
//     content: "";
//     display: block;
//     background: rgb(0, 0, 0);
//     background: linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%);
//     left: 0;
//     top: 0;
//     height: 100%;
//     width: 100%;
//     position: absolute;
//   }

//   @media screen and (max-width: ${LG - 1}px) {
//     height: 33vh;
//   }

//   @media screen and (max-width: ${MD - 1}px) {
//     align-items: flex-end;
//     padding-bottom: 4.5rem;
//   }
// `;

// const HeroTitleSection = styled.div`
//   text-align: center;
// `;

// const HeroTitle = styled.h2`
//   color: ${SECONDARY_COLOR};
//   position: relative;
//   font-size: 3.714rem;
//   line-height: 4rem;
//   letter-spacing: -2px;
//   margin-bottom: 1rem;
//   text-shadow: 3px 4px 7px rgba(81,67,21,0.8);

//  @media screen and (max-width: ${MD - 1}px) {
//     font-size: 3rem;
//     line-height: 4rem;
//     letter-spacing: -1px;
//   }

//  @media screen and (max-width: ${SM - 1}px) {
//     font-size: 2rem;
//     line-height: 2.5rem;
//     letter-spacing: -1px;
//   }
// `;

// const HeroSubTitle = styled.p`
//   color: ${SECONDARY_COLOR};
// `;

// const HeroBanner: React.FC<Props> = ({banner}) => {
//   const router = useRouter();
//   const loggedIn = useAuth();

//   function renderBanner(image: string) {
//     return getAssetImage(image, {height: 1280, width: 1920, fit: 'cover'})
//   }

//   function handleNavigation() {
//     // @ts-ignore
//     router.push('/categories');
//   }

//   return (
//       <Hero style={{backgroundImage: `url(${renderBanner(banner.poster)})`}}>
//         <div className="custom-container" style={{zIndex: 1}}>
//           <div className="row">
//             <div className="col-12">
//               <HeroTitleSection>
//                 <HeroTitle>{banner.title}</HeroTitle>
//                 <HeroSubTitle>Novels • Literature • Self-Help</HeroSubTitle>
//                 <div>
//                   <AppButton variant={'secondary'} onClick={handleNavigation}>
//                     {'Explore'}
//                   </AppButton>
//                 </div>
//               </HeroTitleSection>
//             </div>
//           </div>
//         </div>
//       </Hero>
//   )
// };

// export default HeroBanner;
