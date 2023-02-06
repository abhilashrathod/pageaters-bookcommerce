import React from "react";
import {NextPage} from "next";
import styled from "styled-components";
import Head from "next/head";
import {Icon} from "@iconify/react";

import PageWrapper from "../components/elements/PageWrapper";

import {getAssetImage} from "../core/_imageRendererHelper";
import {ACCENT_COLOR, LG, MD, SECONDARY_ACCENT_COLOR, SM} from "../core/_variables";

const Accent = styled.span`
  color: ${SECONDARY_ACCENT_COLOR};
`;

const MissionStatement = styled.div`
  height: calc(100vh - 5rem);
  display: flex;
  justify-content: space-around;
  flex-direction: column;                  
`;

const ContentSpace = styled.div`
  padding: 7.5rem 5rem 7.5rem 5.714rem;
  display: flex;
  height: 100vh;
  flex-direction: column;
  justify-content: center;
  background: ${ACCENT_COLOR};
  color: #FFF;
  
  @media screen and (max-width: ${LG - 1}px) and (min-width: ${MD - 1}px) {
    padding: 2.5rem;
    height: 70vh;
  }
  
  @media screen and (max-width: ${MD - 1}px) {
    padding: 5rem 2.5rem;
    height: auto;
  }
  
  @media screen and (max-width: ${SM - 1}px) {
    padding: 5rem 1rem;
    height: auto;
  }
`;

const HeroSpace = styled.div`
  display: flex;
  min-height: 100%;
  align-items: stretch;
`;

const HeroImage = styled.img`
  height: 100vh;
  object-fit: cover;
  width: 100%;
  object-position: center center;
  
  @media screen and (max-width: ${LG - 1}px) and (min-width: ${MD - 1}px) {
   height: 70vh;
  }
  
  @media screen and (max-width: ${MD - 1}px) {
    height: 40vh;
  }
`;

const BenefitsSection = styled.div`
  margin: 2.5rem 0;
  padding: 10rem 0;
  
  @media screen and (max-width: ${MD - 1}px) {
    margin: 1.5rem 0;
    padding: 5rem 0;
  }
`;

const BenefitsTitleSpace = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
  
  @media screen and (max-width: ${MD - 1}px) {
    padding-bottom: 5rem;
  }
`;

const Tagline = styled.div`
  background: linear-gradient(to right, #F09819, #FF512F);
  padding: 5rem;
  border-radius: 1.5rem;
  height: 25rem;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-evenly;
  margin: 5rem 0 10rem 0;
  
  @media screen and (max-width: ${MD - 1}px) {
    padding: 2.5rem;
    height: auto;
  }
`;

const About: NextPage = () => {

  function renderImageSize(i: string, w: number, h: number) {
    return getAssetImage(i, {height: h, width: w, fit: 'cover'});
  }

  return (
      <>
        <Head>
          <title>About Us | Pageaters</title>
          <script type="application/ld+json"
                  dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                      "@context": "https://schema.org",
                      "@type": "Organization",
                      url: process.env.NEXT_PUBLIC_SITE_URL,
                      logo: "https://res.cloudinary.com/pageaters/image/upload/v1624876170/design-4_qps5su.png"
                    }),
                  }}
          />
        </Head>
        <PageWrapper>
          <section>
            <div className="custom-container">
              <div className="row">
                <div className="col-xxl-9 col-12">
                  <MissionStatement>
                    <div>
                      <h1>Our mission is to give readers <Accent>the best reading experience</Accent> of their lives.</h1>
                    </div>
                  </MissionStatement>
                </div>
              </div>
            </div>
          </section>
          <section>
            <div className="container-fluid g-0">
              <div className="row g-0">
                <div className="order-last order-lg-first order-xl-first order-xxl-first col-12 col-xl-6 col-xxl-6">
                  <ContentSpace>
                    <h2>Our Story</h2>
                    <h6> We&apos;re a group of quirky bookworms who wants to provide the best reading experience for
                      other bookworms. So we started Pageaters, an online bookstore that offers affordable reading plans
                      and
                      books. We want you to enjoy the books you love while growing as a person, without having to
                      compromise your wallet! </h6>

                    <h6> We strive to provide the best reading experience at affordable prices so that people can have
                      fun, learn and grow. Reading might get costly because of the value they provide so we&apos;re providing
                      affordable reading solutions to help readers grow. We&apos;re proving a monthly reading plan so that
                      readers
                      would pay one fee and read anything they want.</h6>

                    <h6> We believe in the power of words and passion for leisure reading. We hope that our passion
                      helps
                      you find your next favorite book!</h6>
                  </ContentSpace>
                </div>
                <div className="order-first order-lg-last order-xl-last order-xxl-last col-12 col-xl-6 col-xxl-6">
                  <HeroSpace>
                    <picture style={{width: '100%'}}>
                      <source media={`(max-width: ${SM - 1}px)`} type="image/jpeg"
                              srcSet={renderImageSize('team-cheering.jpg', 375, 450)} height={450}
                              width={375}/>
                      <source media={`(max-width: ${MD - 1}px)`} type="image/jpeg"
                              srcSet={renderImageSize('team-cheering.jpg', 768, 600)} height={768}
                              width={600}/>
                      <source media={`(max-width: ${LG - 1}px)`} type="image/jpeg"
                              srcSet={renderImageSize('team-cheering.jpg', 1024, 800)} height={800}
                              width={1024}/>
                      <HeroImage src={renderImageSize('team-cheering.jpg', 1920, 1280)}
                                 alt="login-banner"/>
                    </picture>
                  </HeroSpace>
                </div>
              </div>
            </div>
          </section>
          <BenefitsSection>
            <div className="custom-container">
              <div className="row">
                <div className="col-xxl-3 col-xl-3 col-12">
                  <BenefitsTitleSpace>
                    <h3>Us vs Them</h3>
                  </BenefitsTitleSpace>
                </div>
                <div className="col-xxl-3 col-xl-3 col-12">
                  <div>
                    <span><Icon icon={'ph:books-duotone'} width={48} height={48}/></span>
                    <p><strong>Educate about books</strong><br/> We educate our readers and guide them about books
                      rather
                      then cold selling.
                    </p>
                  </div>
                </div>
                <div className="col-xxl-3 col-xl-3 col-12">
                  <div>
                    <span><Icon icon={'ph:storefront-duotone'} width={48} height={48}/></span>
                    <p><strong>A lot more than purchases</strong><br/> Pageaters is more than a site. Buy, rent, rewards
                      and membership and so much more.
                    </p>
                  </div>
                </div>
                <div className="col-xxl-3 col-xl-3 col-12">
                  <div>
                    <span><Icon icon={'ph:heart-duotone'} width={48} height={48}/></span>
                    <p><strong>It&apos;s a personal experience</strong><br/> We treat you as our bookish friend rather than
                      just
                      a buyer and committed towards best reading experience.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </BenefitsSection>
          <section>
            <div className="container">
              <div className="row">
                <Tagline>
                  <h1 style={{color: '#FFF'}}>Eat new story everyday</h1>
                </Tagline>
              </div>
            </div>
          </section>
        </PageWrapper>
      </>
  )
};

export default About;
