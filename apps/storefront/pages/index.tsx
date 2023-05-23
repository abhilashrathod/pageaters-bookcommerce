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
import LandscapeBanner from "../components/banners/LandscapeBanner";
import FeaturedBooks from "../components/carousels/FeaturedBooks";

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
  const {data: firstRowProductsRes, error: firstRowProductsErr} = useSWR({url: `/product-sets/unique/SET-2794870116`});
  const {data: secondRowProductsRes, error: secondRowProductsErr} = useSWR({url: `/product-sets/unique/SET-8402842627`});
  const {data: thirdRowProductsRes, error: thirdRowProductsErr} = useSWR({url: `/product-sets/unique/SET-4310637033`});
  const {data: forthRowProductsRes, error: forthRowProductsErr} = useSWR({url: `/product-sets/unique/SET-6205230899`});
  const {data: fifthRowProductsRes, error: fifthRowProductsErr} = useSWR({url: `/product-sets/unique/SET-1057060109`});
  const {data: sixthRowProductsRes, error: sixthRowProductsErr} = useSWR({url: `/product-sets/unique/SET-3587650210`});
  const {data: seventhRowProductsRes, error: seventhRowProductsErr} = useSWR({url: `/product-sets/unique/SET-8781010649`});

  const {data: bundlesRes, error: bundlesErr} = useSWR({url: `/bundles?page=1&limit=12&sortBy=priority&sortOrder=asc`});
  const {data: collectionsRes, error: collectionsErr} = useSWR({url: `/collections?page=1&limit=10&sortBy=priority&sortOrder=asc`});

  const {title: firstRowTitle, products: firstRowProducts} = get(firstRowProductsRes, 'data', {});
  const {title: secondRowTitle, products: secondRowProducts} = get(secondRowProductsRes, 'data', {});
  const {title: thirdRowTitle, products: thirdRowProducts} = get(thirdRowProductsRes, 'data', {});
  const {title: forthRowTitle, products: forthRowProducts} = get(forthRowProductsRes, 'data', {});
  const {title: fifthRowTitle, products: fifthRowProducts} = get(fifthRowProductsRes, 'data', {});
  const {title: sixthRowTitle, products: sixthRowProducts} = get(sixthRowProductsRes, 'data', {});
  const {title: seventhRowTitle, products: seventhRowProducts} = get(seventhRowProductsRes, 'data', {});

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

          <section className="my-5 py-5">
            <div className="custom-container">
              <div className="row">
                <div className="col">
                  {/*<h1 className="" style={{fontSize: '110px', textAlign: 'center'}}>Turning <span className="text-accent">2</span> Sale!</h1>*/}
                  {/*<h1 className="" style={{textAlign: 'center'}}>Upto 50% Off All Inventory • 23rd May to 30th May</h1>*/}
                  <h1 className="jumbo-1 text-center">Turning <span className="text-accent">2</span> Sale!</h1>
                  <h1 className="display-1 text-center">Upto 50% Off All Inventory From 23rd May to 30th May</h1>
                </div>
              </div>
              {/*<div className="row">*/}
              {/*  <div className="col-12 col-xl-6">*/}
              {/*    <LandscapeBanner banner={discountItem}/>*/}
              {/*  </div>*/}
              {/*  <div className="col-12 col-xl-6">*/}
              {/*    <LandscapeBanner banner={bannerCollectionItem}/>*/}
              {/*  </div>*/}
              {/*</div>*/}
            </div>
          </section>

          <section className={'mb-25'}>
            <Categories/>
          </section>

          <section className={'mb-25'}>
            <PreOrderBanner/>
          </section>

          {/*<FeaturedCategorySection>*/}
          {/*  <FeaturedCategory/>*/}
          {/*</FeaturedCategorySection>*/}

          {
            firstRowProducts && firstRowProducts.length > 0 && (
              <section className={'mb-25'}>
                <ProductSets title={firstRowTitle} products={firstRowProducts}/>
              </section>
            )
          }

          {
            secondRowProducts && secondRowProducts.length > 0 && (
              <section className={'mb-25'}>
                <ProductSets title={secondRowTitle} products={secondRowProducts}/>
              </section>
            )
          }

          {/*<section className={'mb-25'}>*/}
          {/*  <FeaturedDeals/>*/}
          {/*</section>*/}

          <section className={'mb-25'}>
            <Bundles title={'Spectacular Bundles'} bundles={bundles}/>
          </section>

          {
            thirdRowProducts && thirdRowProducts.length > 0 && (
              <section className={'mb-25'}>
                <ProductSets title={thirdRowTitle} products={thirdRowProducts}/>
              </section>
            )
          }

          {
            forthRowProducts && forthRowProducts.length > 0 && (
              <section className={'mb-25'}>
                <ProductSets title={forthRowTitle} products={forthRowProducts}/>
              </section>
            )
          }

          <section className={'mb-25'}>
            <CollectionsCarousel title={'Spotlight Collections'} collections={collections}/>
          </section>

          {
            sixthRowProducts && sixthRowProducts.length > 0 && (
              <section className={'mb-25'}>
                <ProductSets title={sixthRowTitle} products={sixthRowProducts}/>
              </section>
            )
          }


          {
            fifthRowProducts && fifthRowProducts.length > 0 && (
              <section className={'mb-25'}>
                <ProductSets title={fifthRowTitle} products={fifthRowProducts}/>
              </section>
            )
          }

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

          {
            seventhRowProducts && seventhRowProducts.length > 0 && (
              <section className={'mb-25'}>
                <ProductSets title={seventhRowTitle} products={seventhRowProducts}/>
              </section>
            )
          }
        </PageWrapper>
      </>
  )
};

Home.getInitialProps = () => {
  const HERO_BANNER = {
    poster: 'pageaters-clearance-sale-cQIUNKlbry-1684784460743.png',
    title: `Pageaters: India's most loved bookstore!`,
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
