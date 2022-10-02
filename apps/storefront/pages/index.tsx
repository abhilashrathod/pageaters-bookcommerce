import React from "react";
import {NextPage} from 'next'
import Head from "next/head";
import useSWR from "swr";
import {get} from 'lodash';
import styled from "styled-components";

import HeroBanner from "../components/banners/HeroBanner";
import Categories from "../components/carousels/Categories";
import CollectionsCarousel from "../components/carousels/Collections";
import PageWrapper from "../components/elements/PageWrapper";
import ProductSets from "../components/carousels/ProductSets";
import FeaturedCategory from "../components/featured/FeaturedCategory";
import Bundles from "../components/carousels/Bundles";
import FeaturedDeals from "../components/featured/FeaturedDeals";
import GiantSquareBanner from "../components/banners/GiantSquareBanner";
import PreOrderBanner from "../components/banners/PreOrderBanner";

import {MD, SM} from "../core/_variables";

const FeaturedCategorySection = styled.section`
  background: #f2f2f2;
  padding: 5rem 0;
  margin: 0 0 5rem 0;
  
  @media screen and (max-width: ${MD - 1}px) {
    padding: 3.75rem 0;
    margin: 3.75rem 0;
  }
  
  @media screen and (max-width: ${SM - 1}px) {
    padding: 2.5rem 0;
    margin: 2.5rem 0;
  }
`;

const PreOrderSection = styled.section`
  background: #000;
  padding: 7.5rem 0;
  margin: 5rem 0 0 0;
  
  @media screen and (max-width: ${MD - 1}px) {
    padding: 4.5rem 0 0.1rem 0;
    margin: 3.75rem 0;
  }
  
  @media screen and (max-width: ${SM - 1}px) {
    padding: 4rem 0 0.1rem 0;
    margin: 2.5rem 0;
  }
`;

const Home: NextPage = (props: any) => {
  const {data: newArrivalRes, error: newArrivalErr} = useSWR({url: `/product-sets/slug/new-arrivals-xUnVs1`});
  const {data: mostDiscountedRes, error: mostDiscountedErr} = useSWR({url: `/product-sets/slug/most-discounted-cyLclz`});
  const {data: popularRes, error: popularErr} = useSWR({url: `/product-sets/slug/trending-books-boQMVB`});
  const {data: bundlesRes, error: bundlesErr} = useSWR({url: `/bundles?page=1&limit=8&sortBy=priority&sortOrder=asc`});
  const {data: collectionsRes, error: collectionsErr} = useSWR({url: `/collections?page=1&limit=6&sortBy=priority&sortOrder=asc`});

  const newArrivals = get(newArrivalRes, 'data.products', []);
  const mostDiscounted = get(mostDiscountedRes, 'data.products', []);
  const mostPopular = get(popularRes, 'data.products', []);
  const bundles = get(bundlesRes, 'data.docs', []);
  const collections = get(collectionsRes, 'data.docs', []);

  return (
      <>
        <Head>
          <title>Pageaters: Online shopping site for Buying, Selling or Renting Books in India</title>
          <meta name="title" content="Pageaters: Online shopping site for Buying, Selling or Renting Books in India"/>
          <meta name="description"
                content="Pageaters is an online shopping site for books. Buy new books, Rent books for first time ever or sell your second hand books."/>

          <meta property="og:title"
                content="Pageaters: Online shopping site for Buying, Selling or Renting Books in India"/>
          <meta property="og:description"
                content="Pageaters is an online shopping site for books. Buy new books, Rent books for first time ever or sell your second hand books. "/>
          <meta property="og:image"
                content="https://res.cloudinary.com/pageaters/image/upload/v1624257111/pageaters-poster_ohufa0.png"/>
          <meta property="og:url" content="http://pageaters.com/"/>

          <meta property="twitter:url" content="http://pageaters.com"/>
          <meta property="twitter:title"
                content="Pageaters: Online shopping site for Buying, Selling or Renting Books in India"/>
          <meta property="twitter:description"
                content="Pageaters is an online shopping site for books. Buy new books, Rent books for first time ever or sell your second hand books. "/>
          <meta property="twitter:image"
                content="https://res.cloudinary.com/pageaters/image/upload/v1624257111/pageaters-poster_ohufa0.png"/>
        </Head>
        <PageWrapper>
          <section className={'mb-25'}>
            <HeroBanner banner={props.heroBanner}/>
          </section>

          <section className={'mb-25'}>
            <Categories/>
          </section>

          <PreOrderSection>
            <section className={'mb-25'}>
              <PreOrderBanner />
            </section>
          </PreOrderSection>

          <FeaturedCategorySection>
            <FeaturedCategory/>
          </FeaturedCategorySection>

          <section className={'mb-25'}>
            <ProductSets title={'New Arrivals'} products={newArrivals}/>
          </section>

          <section className={'mb-25'}>
            <FeaturedDeals/>
          </section>

          {/*
          <section className="py-25 mb-25">
            <div className="custom-container">
              <div className="row">
                <div className="col">
                  <h1 className="display-1">Programs to Help You</h1>
                  <h1 className="jumbo-1">
                    Earn from Pageaters
                  </h1>
                </div>
                <div className="row">
                  {
                    props.banners.map((item: IBanner, index: number) => (
                        <div key={index} className="col">
                          <LandscapeBanner banner={item}/>
                        </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </section>
          */}

          <section className={'mb-25'}>
            <Bundles title={'Spectecular Bundles'} bundles={bundles}/>
          </section>

          <section className={'mb-25'}>
            <ProductSets title={'Most Discounted'} products={mostDiscounted}/>
          </section>

          <section className={'mb-25'}>
            <CollectionsCarousel title={'Spotlight Collections'} collections={collections}/>
          </section>

          <section className="mb-25">
            {/*<GiantFullBleedBanner banner={{*/}
            {/*  title: 'Explore Membership Benefits',*/}
            {/*  poster: 'medium-shot-happy-brunette-woman-with-book-min_wu681i.jpg'*/}
            {/*}}/>*/}
            <GiantSquareBanner banner={{
              title: 'Explore Membership Benefits',
              poster: 'Membership-graphic.png'
            }}/>
          </section>

          <section className={'mb-25'}>
            <ProductSets title={'Best Sellers'} products={mostPopular}/>
          </section>
        </PageWrapper>
      </>
  )
};

Home.getInitialProps = () => {
  const HERO_BANNER = {
    poster: 'girl-is-reading-book-cafe.jpg',
    title: 'A Bookstore you never knew you needed',
    ctaLink: '/auth/register'
  };

  const BANNERS = [
    {
      poster: 'https://d2jesamohckae0.cloudfront.net/eyJidWNrZXQiOiJwYWdlYXRlcnMtYXNzZXRzIiwia2V5IjoiaW5mbHVlbmNlci1iYW5uZXItbWluX2dtb2d5eC5qcGciLCJlZGl0cyI6eyJyZXNpemUiOnsiaGVpZ2h0IjozNTAsIndpZHRoIjo3NzYsImZpdCI6ImNvdmVyIn19fQ==',
      title: 'Influancer Program'
    },
    {
      poster: 'https://d2jesamohckae0.cloudfront.net/eyJidWNrZXQiOiJwYWdlYXRlcnMtYXNzZXRzIiwia2V5IjoiaW5jZW50aXZlcy1iYW5uZXJfbWptemhrLmpwZyIsImVkaXRzIjp7InJlc2l6ZSI6eyJoZWlnaHQiOjM1MCwid2lkdGgiOjc3NiwiZml0IjoiY292ZXIifX19',
      title: 'Incentive Program'
    }
  ];

  return {heroBanner: HERO_BANNER, banners: BANNERS};
};

export default Home;
