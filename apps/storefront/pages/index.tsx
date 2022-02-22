import React from "react";
import {NextPage} from 'next'
import {Icon} from "@iconify/react";
import Link from 'next/link';

import HeroBanner from "../components/banners/HeroBanner";
import Categories from "../components/carousels/Categories";
import DealsCardLarge from "../components/cards/DealsCardLarge";
import LandscapeBanner from "../components/banners/LandscapeBanner";
import CollectionCardLarge from "../components/cards/CollectionCardLarge";
import CollectionCardSmall from "../components/cards/CollectionCardSmall";
import ProductCardLandScape from "../components/cards/ProductCardLandscape";
import GiantFullBleedBanner from "../components/banners/GiantFullBleedBanner";
import BundlesCardMedium from "../components/cards/BundlesCardMedium";
import CategoryCardLarge from "../components/cards/CategoryCardLarge";

import {IBanner} from "../schemas/banner";

const Home: NextPage = (props: any) => {
  return (
      <>
        <HeroBanner banner={props.heroBanner}/>
        <section className={'mb-25 py-5'}>
          <Categories/>
        </section>
        <section className="mb-25">
          <div className="custom-container">
            <div className="row">
              {
                [0,0,0,0].map((category, index) => (
                  <div key={index} className="col-xxl-3 col-lg-4 col-md-4 col-6">
                    <span>CategoryCardLarge</span>
                    {/*<CategoryCardLarge category={CATEGORY} />*/}
                  </div>
                ))
              }
            </div>
          </div>
        </section>
        <section className="mb-25">
          <div className="custom-container">
            <div className="row">
              {
                [0, 0, 0].map((coll, index) => (
                    <div key={index} className="col-xxl-4 col-xl-4 col-lg-4 col-md-6 col-sm-6 col-12">
                      <span>CollectionCardSmall</span>
                      {/*<CollectionCardSmall collection={COLLECTION}/>*/}
                    </div>
                ))
              }
            </div>
          </div>
        </section>
        <section className={'mb-25 py-5'}>
          <div className="custom-container">
            <div className="row">
              {
                [0, 0, 0].map((item, index) => (
                    <div key={index} className="col-xxl-4 col-xl-4 col-lg-6 col-sm-6 col-12">
                      <span>DealsCardLarge</span>
                      {/*<DealsCardLarge deal={DEAL}/>*/}
                    </div>
                ))
              }
            </div>
          </div>
        </section>
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
                        <span>LandscapeBanner</span>
                        {/*<LandscapeBanner banner={item}/>*/}
                      </div>
                  ))
                }
              </div>
            </div>
          </div>
        </section>
        <section className="mb-25">
          <div className="custom-container">
            <div className="row">
              <div className="col">

                <div className="section-heading">
                  <h1>
                    Best Collections
                  </h1>

                  <a className="d-flex align-items-center">
                    <span className="line-height-normal me-2">
                      View All
                    </span>
                    <Icon icon={'bx:bx-chevron-right-circle'} height={24} width={24}/>
                  </a>
                </div>
              </div>
            </div>
            <div className="row">
              {
                [0, 0, 0].map((coll, index) => (
                    <div key={index} className="col-xxl-4 col-xl-4 col-lg-4 col-md-6 col-sm-6 col-12">
                      <span>CollectionCardLarge</span>
                      {/*<CollectionCardLarge collection={COLLECTION}/>*/}
                    </div>
                ))
              }
            </div>
          </div>
        </section>
        <section className="py-25 mb-25">
          <span>GiantFullBleedBanner</span>
          <GiantFullBleedBanner banner={{
            title: 'Explore Membership Benefits',
            poster: 'medium-shot-happy-brunette-woman-with-book-min_wu681i.jpg'
          }}/>
        </section>
        <section className="mb-25">
          <div className="custom-container">
            <div className="row">
              <div className="col">
                <div className="section-heading">
                  <h1>
                    Bundles
                  </h1>

                  <a className="d-flex align-items-center">
                    <span className="line-height-normal me-2">
                      View All
                    </span>
                    <Icon icon={'bx:bx-chevron-right-circle'} height={24} width={24}/>
                  </a>
                </div>
              </div>
            </div>
            <div className="row">

              {
                [0, 0, 0, 0].map((bundle, index) => {
                  return (
                      <div key={index} className="col-lg-3 col-6">
                        <span>BundlesCardMedium</span>
                        {/*<BundlesCardMedium bundle={BUNDLE}/>*/}
                      </div>
                  )
                })
              }

            </div>
          </div>
        </section>
        <section className="mb-25">
          <div className="custom-container">
            <div className="row">
              <div className="col">
                <h3>
                  Best Sellers
                </h3>
              </div>
            </div>
            <div className="row">
              {
                [0, 0, 0, 0, 0, 0].map((coll, index) => (
                    <div key={index} className="col-xxl-2 col-xl-3 col-lg-3 col-md-3 col-6">
                      <span>ProductCardLandScape</span>
                      {/*<ProductCardLandScape book={BOOK}/>*/}
                    </div>
                ))
              }
            </div>
          </div>
        </section>
      </>
  )
};

Home.getInitialProps = () => {
  // const res = await fetch('https://api.github.com/repos/vercel/next.js')
  // const json = await res.json()
  const HERO_BANNER = {
    poster: 'https://d2jesamohckae0.cloudfront.net/eyJidWNrZXQiOiJwYWdlYXRlcnMtYXNzZXRzIiwia2V5IjoiY2FzdWFsLXdvbWFuLXJlYWRpbmctYm9vay13aGlsZS1kcmlua2luZy1taW5fZTF6bXVoLmpwZyIsImVkaXRzIjp7InJlc2l6ZSI6eyJoZWlnaHQiOjEyODAsIndpZHRoIjoxOTIwLCJmaXQiOiJjb3ZlciJ9fX0=',
    title: 'Incentive Program'
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

  return { heroBanner: HERO_BANNER, banners: BANNERS };
};

export default Home;
