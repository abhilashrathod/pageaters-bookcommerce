import React from "react";
import {NextPage} from 'next'
import Head from "next/head";
import useSWR from "swr";
import {Skeleton} from "@mantine/core";

import HeroBanner from "../components/banners/HeroBanner";
import Categories from "../components/carousels/Categories";
import GiantFullBleedBanner from "../components/banners/GiantFullBleedBanner";
import DealsCardLarge from "../components/cards/DealsCardLarge";
import SectionHeading from "../components/elements/SectionHeading";
import ProductCardLandScape from "../components/cards/ProductCardLandscape";
import LandscapeBanner from "../components/banners/LandscapeBanner";
import CollectionCardSmall from "../components/cards/CollectionCardSmall";
import BundlesCardMedium from "../components/cards/BundlesCardMedium";
import EmptySectionMessage from "../components/elements/FailedToLoad";

import {IBanner} from "../schemas/banner";
import {IDeal} from "../schemas/deal";
import {IBook} from "../schemas/book";
import {ICollection} from "../schemas/collection";
import {IBundle} from "../schemas/bundle";


const DealsSection = () => {
  const {data, error} = useSWR({
    url: `/deals`,
    args: {page: 1, limit: 3, sortBy: 'priority', sortOrder: 'asc'}
  });

  if (error) return <EmptySectionMessage title={'Failed to load data...'}/>;

  return (
      <div className="custom-container">
        <div className="row">
          <div className="col">
            <SectionHeading sectionTitle={'Best Deals'}
                            navigateButtonProps={{buttonText: 'View All', buttonNavigationUrl: '/deals'}}/>
          </div>
        </div>
        <div className="row">
          {
            data
                ? data?.data?.docs.map((item: IDeal) => (
                    <div key={item.dealId} className="col-xxl-4 col-xl-4 col-lg-6 col-sm-6 col-12">
                      <DealsCardLarge deal={item}/>
                    </div>
                ))
                : [0, 0, 0].map((item: any, index) => (
                    <div key={index} className="col-xxl-4 col-xl-4 col-lg-6 col-sm-6 col-12">
                      <Skeleton height={520} radius="lg"/>
                    </div>
                ))
          }
        </div>
      </div>
  )
};

const BestSellers = () => {
  const {data, error} = useSWR({
    url: `/store-books`,
    args: {page: 1, limit: 6, sortBy: 'currentDiscount', sortOrder: 'desc'}
  });

  if (error) return <EmptySectionMessage title={'Failed to load data...'}/>;

  return (
      <div className="custom-container">
        <div className="row">
          <div className="col">
            <SectionHeading sectionTitle={'Most Discounted'}/>
          </div>
        </div>
        <div className="row">
          {
            data
                ? data?.data?.docs.map((item: IBook) => (
                    <div key={item.bookId} className="col-xxl-2 col-xl-3 col-lg-3 col-md-3 col-6">
                      <ProductCardLandScape book={item}/>
                    </div>
                ))
                : [0, 0, 0, 0, 0, 0].map((item: any, index) => (
                    <div key={index} className="col-xxl-2 col-xl-3 col-lg-3 col-md-3 col-6">
                      <Skeleton height={320} radius="lg"/>
                    </div>
                ))
          }
        </div>
      </div>
  )
};

const NewArrivals = () => {
  const {data, error} = useSWR({
    url: `/store-books`,
    args: {page: 1, limit: 6, sortBy: 'createdAt', sortOrder: 'desc'}
  });

  if (error) return <EmptySectionMessage title={'Failed to load data...'}/>;

  return (
      <div className="custom-container">
        <div className="row">
          <div className="col">
            <SectionHeading sectionTitle={'New Arrivals!'}/>
          </div>
        </div>
        <div className="row">
          {
            data
                ? data?.data?.docs.map((item: IBook) => (
                    <div key={item.bookId} className="col-xxl-2 col-xl-3 col-lg-3 col-md-3 col-6">
                      <ProductCardLandScape book={item}/>
                    </div>
                ))
                : [0, 0, 0, 0, 0, 0].map((item: any, index) => (
                    <div key={index} className="col-xxl-2 col-xl-3 col-lg-3 col-md-3 col-6">
                      <Skeleton height={320} radius="lg"/>
                    </div>
                ))
          }
        </div>
      </div>
  )
};

const MostPopular = () => {
  const {data, error} = useSWR({
    url: `/store-books`,
    args: {page: 1, limit: 6, sortBy: 'popularity', sortOrder: 'desc'}
  });

  if (error) return <EmptySectionMessage title={'Failed to load data...'}/>;

  return (
      <div className="custom-container">
        <div className="row">
          <div className="col">
            <SectionHeading sectionTitle={'Most Popular'}/>
          </div>
        </div>
        <div className="row">
          {
            data
                ? data?.data?.docs.map((item: IBook) => (
                    <div key={item.bookId} className="col-xxl-2 col-xl-3 col-lg-3 col-md-3 col-6">
                      <ProductCardLandScape book={item}/>
                    </div>
                ))
                : [0, 0, 0, 0, 0, 0].map((item: any, index) => (
                    <div key={index} className="col-xxl-2 col-xl-3 col-lg-3 col-md-3 col-6">
                      <Skeleton height={320} radius="lg"/>
                    </div>
                ))
          }
        </div>
      </div>
  )
};

const CollectionsSection = () => {
  const {data, error} = useSWR({
    url: `/collections`,
    args: {page: 1, limit: 3, sortBy: 'priority', sortOrder: 'asc'}
  });

  if (error) return <EmptySectionMessage title={'Failed to load data...'}/>;

  return (
      <div className="custom-container">
        <div className="row">
          <div className="col">
            <SectionHeading sectionTitle={'Spotlight Collections'}
                            navigateButtonProps={{buttonText: 'View All', buttonNavigationUrl: '/collections'}}/>
          </div>
        </div>
        <div className="row">
          {
            data
                ? data?.data?.docs.map((item: ICollection) => (
                    <div key={item.collectionId} className="col-xxl-4 col-xl-4 col-lg-4 col-md-6 col-sm-6 col-12">
                      <CollectionCardSmall collection={item}/>
                    </div>
                ))
                : [0, 0, 0].map((item: any, index) => (
                    <div key={index} className="col-xxl-4 col-xl-4 col-lg-4 col-md-6 col-sm-6 col-12">
                      <Skeleton height={350} radius="lg"/>
                    </div>
                ))
          }
        </div>
      </div>
  )
};

const BundlesSection = () => {
  const {data, error} = useSWR({
    url: `/bundles`,
    args: {page: 1, limit: 4, sortBy: 'priority', sortOrder: 'asc'}
  });

  if (error) return <EmptySectionMessage title={'Failed to load data...'}/>;

  return (
      <div className="custom-container">
        <div className="row">
          <div className="col">
            <SectionHeading sectionTitle={'Spectacular Bundles'}
                            navigateButtonProps={{buttonText: 'View All', buttonNavigationUrl: '/bundles'}}/>
          </div>
        </div>
        <div className="row">
          {
            data
                ? data?.data?.docs.map((item: IBundle) => (
                    <div key={item.bundleId} className="col-lg-3 col-6">
                      <BundlesCardMedium bundle={item}/>
                    </div>
                ))
                : [0, 0, 0, 0].map((item: any, index) => (
                    <div key={index} className="col-lg-3 col-6">
                      <Skeleton height={385} radius="lg"/>
                    </div>
                ))
          }
        </div>
      </div>
  )
};

const Home: NextPage = (props: any) => {
  return (
      <>
        <Head>
          <title>Pageaters: Online shopping site for Buying, Selling or Renting Books in India</title>
          <meta name="title" content="Pageaters: Online shopping site for Buying, Selling or Renting Books in India"/>
          <meta name="description" content="Pageaters is an online shopping site for books. Buy new books, Rent books for first time ever or sell your second hand books."/>

          <meta property="og:title" content="Pageaters: Online shopping site for Buying, Selling or Renting Books in India"/>
          <meta property="og:description" content="Pageaters is an online shopping site for books. Buy new books, Rent books for first time ever or sell your second hand books. "/>
          <meta property="og:image" content="https://res.cloudinary.com/pageaters/image/upload/v1624257111/pageaters-poster_ohufa0.png"/>
          <meta property="og:url" content="http://pageaters.com/"/>

          <meta property="twitter:url" content="http://pageaters.com"/>
          <meta property="twitter:title" content="Pageaters: Online shopping site for Buying, Selling or Renting Books in India"/>
          <meta property="twitter:description" content="Pageaters is an online shopping site for books. Buy new books, Rent books for first time ever or sell your second hand books. "/>
          <meta property="twitter:image" content="https://res.cloudinary.com/pageaters/image/upload/v1624257111/pageaters-poster_ohufa0.png"/>
        </Head>
        <section className={'mb-25'}>
          <HeroBanner banner={props.heroBanner}/>
        </section>

        <section className={'mb-25'}>
          <Categories/>
        </section>

        <section className={'mb-25'}>
          <BestSellers/>
        </section>

        <section className={'mb-25'}>
          <DealsSection/>
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
          <BundlesSection/>
        </section>

        <section className={'mb-25'}>
          <MostPopular/>
        </section>

        <section className={'mb-25'}>
          <CollectionsSection/>
        </section>

        <section className="py-25 mb-25">
          <GiantFullBleedBanner banner={{
            title: 'Explore Membership Benefits',
            poster: 'medium-shot-happy-brunette-woman-with-book-min_wu681i.jpg'
          }}/>
        </section>

        <section className={'mb-25'}>
          <NewArrivals/>
        </section>
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
