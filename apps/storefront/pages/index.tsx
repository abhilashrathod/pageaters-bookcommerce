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
import Bundles from "../components/carousels/Bundles";
import GiantSquareBanner from "../components/banners/GiantSquareBanner";
import PreOrderBanner from "../components/banners/PreOrderBanner";
// import LandscapeBanner from "../components/banners/LandscapeBanner";
// import FeaturedBooks from "../components/carousels/FeaturedBooks";

import {MD, SM} from "../core/_variables";
import {IBanner} from "../schemas/banner";

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

const META = {
  title: 'Pageaters: An Online Bookstore | Eat New Story Everyday',
  description: 'Pageaters: Online Bookstore. Our original book collection contains only the highest quality books, allowing you to have an exceptional reading experience.',
  image: 'https://res.cloudinary.com/pageaters/image/upload/v1673173795/web-banner_ogzs01.png',
  url: 'https://pageaters.com/',
};

const Home: NextPage = (props: any) => {
  const {data: newArrivalRes, error: newArrivalErr} = useSWR({url: `/product-sets/slug/new-arrivals-xUnVs1`});
  const {data: mostDiscountedRes, error: mostDiscountedErr} = useSWR({url: `/product-sets/slug/most-discounted-cyLclz`});
  const {data: popularRes, error: popularErr} = useSWR({url: `/product-sets/slug/trending-books-boQMVB`});
  const {data: bundlesRes, error: bundlesErr} = useSWR({url: `/bundles?page=1&limit=12&sortBy=priority&sortOrder=asc`});
  const {data: collectionsRes, error: collectionsErr} = useSWR({url: `/collections?page=1&limit=10&sortBy=priority&sortOrder=asc`});

  const newArrivals = get(newArrivalRes, 'data.products', []);
  const mostDiscounted = get(mostDiscountedRes, 'data.products', []);
  const mostPopular = get(popularRes, 'data.products', []);
  const bundles = get(bundlesRes, 'data.docs', []);
  const collections = get(collectionsRes, 'data.docs', []);

  // featured collection data
  const bannerCollectionItem: IBanner = {
    title: 'Best Books of 2022',
    ctaLink: '/collections/CL-1783679685',
    poster: 'the-best-books-of-2022-O852fz1tFK-1671962486958.png',
    bannerId: 'CL-1783679685',
    ctaText: 'Learn More',
    description: 'Which were the best books of 2022?',
    entity: 'collection'
  };

  const discountItem: IBanner = {
    title: 'Holiday Treats and Gift Guide for Christmas Sale!',
    ctaLink: '/deals/DE-2008737169',
    poster: 'diwali-sale-2022-C5iXhgDC6Q-1671958827235.jpg',
    bannerId: 'DE-2008737169',
    ctaText: 'Learn More',
    description: 'Holiday treats for everyone and a helpful gift guide',
    entity: 'asset'
  };

  return (
      <>
        <Head>
          <title>{META.title}</title>
          <meta name="title" content={META.title}/>
          <meta name="description" content={META.description}/>
          <meta property="og:title" content={META.title}/>
          <meta property="og:description" content={META.description}/>
          <meta property="og:image" content={META.image}/>
          <meta property="og:url" content={META.url}/>
          <meta property="twitter:url" content={META.url}/>
          <meta property="twitter:title" content={META.title}/>
          <meta property="twitter:description" content={META.description}/>
          <meta property="twitter:image" content={META.image}/>
        </Head>
        <PageWrapper>
          <section className={'mb-25'}>
            <HeroBanner banner={props.heroBanner}/>
          </section>

          <section className={'mb-25'}>
            <Categories/>
          </section>

          {/*<section className="py-25 mb-25">*/}
          {/*  <div className="custom-container">*/}
          {/*    <div className="row">*/}
          {/*      <div className="col">*/}
          {/*        <h1 className="jumbo-1">*/}
          {/*          Happy Holidays!*/}
          {/*        </h1>*/}
          {/*        <h1 className="display-1">from Pageaters</h1>*/}
          {/*      </div>*/}
          {/*    </div>*/}
          {/*    <div className="row">*/}
          {/*      <div className="col-12 col-xl-6">*/}
          {/*        <LandscapeBanner banner={discountItem}/>*/}
          {/*      </div>*/}
          {/*      <div className="col-12 col-xl-6">*/}
          {/*        <LandscapeBanner banner={bannerCollectionItem}/>*/}
          {/*      </div>*/}
          {/*    </div>*/}
          {/*  </div>*/}
          {/*</section>*/}

          <section className={'mb-25'}>
            <PreOrderBanner/>
          </section>

          {/*<FeaturedCategorySection>*/}
          {/*  <FeaturedCategory/>*/}
          {/*</FeaturedCategorySection>*/}

          <section className={'mb-25'}>
            <ProductSets title={'New Arrivals'} products={newArrivals}/>
          </section>

          {/*<section className={'mb-25'}>*/}
          {/*  <FeaturedDeals/>*/}
          {/*</section>*/}

          <section className={'mb-25'}>
            <Bundles title={'Spectacular Bundles'} bundles={bundles}/>
          </section>

          <section className={'mb-25'}>
            <ProductSets title={'Best Sellers'} products={mostPopular}/>
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
              title: 'Try Mystery Box',
              poster: 'mystery-box-banner.jpg'
            }}/>
          </section>

          <section className={'mb-25'}>
            <ProductSets title={'Most Discounted'} products={mostDiscounted}/>
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
