import React from "react";
import {NextPage} from 'next'

import HeroBanner from "../components/banners/HeroBanner";
import Categories from "../components/carousels/Categories";
import DealsCardLarge from "../components/cards/DealsCardLarge";
import LandscapeBanner from "../components/banners/LandscapeBanner";
import {Icon} from "@iconify/react";
import CollectionCardLarge from "../components/cards/CollectionCardLarge";
import CollectionCardSmall from "../components/cards/CollectionCardSmall";
import ProductCardLandScape from "../components/cards/ProductCardLandscape";
import GiantFullBleedBanner from "../components/banners/GiantFullBleedBanner";
import BundlesCardMedium from "../components/cards/BundlesCardMedium";
import CategoryCardLarge from "../components/cards/CategoryCardLarge";

const BOOK = {
  "bookId": "BK-2036866397",
  "title": "Zero to One",
  "weight": 210,
  "ISBN": "978-0753555194",
  "editorsPick": true,
  "bestSeller": true,
  "poster": "zero-to-one-BfRUi9xUwi-1639591509339.jpg",
  "inventory": 1,
  "currentDiscount": 33,
  "popularity": 0,
  "price": 599,
  "_id": "61ba2f6403f6f15ccc06f4fd",
};

const CATEGORY = {
  categoryId: "CA-5609114898",
  numberOfBooks: 15,
  thumbnail: "fantacy-2bMBXeHBTu-1641323949900.jpg",
  title: "Fantacy",
  _id: "60f1600772a7bf2650dfb53c"
};

const DEAL = {
  categories: ["61ae5b6861bea53c205cb253", "61ae5b0f61bea53c205cb250"],
  createdAt: "2022-02-07T07:27:27.762Z",
  ctaLink: "",
  ctaText: "Learn More",
  deactivatedAt: "",
  dealId: "DE-2667799527",
  description: "",
  isActive: true,
  poster: "10-off-on-mystery-reads-z9LobHD1p5-1644219742374.jpg",
  priority: 0,
  productSets: [],
  title: "10% Off On Mystery Reads",
  updatedAt: "2022-02-08T14:46:05.875Z",
  __v: 0,
  _id: "6200c9dfe5ee323f203a110e",
};

const BANNERS = [
  {
    poster: 'influencer-banner-min_gmogyx.jpg',
    title: 'Influancer Program'
  },
  {
    poster: 'incentives-banner_mjmzhk.jpg',
    title: 'Incentive Program'
  }
];

const HERO_BANNER = {
  poster: 'casual-woman-reading-book-while-drinking-min_e1zmuh.jpg',
  title: 'Incentive Program'
};

const COLLECTION = {
  collectionId: "CL-5985927894",
  createdAt: "2022-01-08T17:38:25.875Z",
  deletedAt: "",
  description: "",
  featuredAuthors: ["61c187ca0c302a490c640aec"],
  isDeleted: false,
  popularity: 0,
  poster: "supercharge-productivity-TgdMCou4Un-1641663425474.jpg",
  priority: 0,
  relatedCategories: ["61ae5b8c61bea53c205cb254"],
  relatedCollections: ["61b728590afa2d6e5407ee7b"],
  tags: ["Productivity"],
  title: "Supercharge Productivity",
  updatedAt: "2022-01-08T17:38:25.875Z",
  __v: 0,
  books: [{
    poster: "eat-that-frog-BU2Muii5e3-1640073491891.jpg",
    title: "Eat That Frog!",
    _id: "61c1897d0c302a490c640aee",
  }],
  _id: "61d9cc113438c44da0247435",
};

const BUNDLE = {
  bundleId: "BL-1489687475",
  bundledBooks: [],
  currentDiscount: 10,
  membersPrice: 1047,
  poster: "fifty-shades-bundle-pPpRoOxxKz-1643389673251.png",
  price: 1047,
  title: "Fifty Shades Bundle",
  _id: "61e5b07207398665d4683670",
};


const Home: NextPage = () => {
  return (
      <>
        <HeroBanner banner={HERO_BANNER}/>
        <section className={'mb-25 py-5'}>
          <Categories/>
        </section>
        <section className="mb-25">
          <div className="custom-container">
            <div className="row">
              {
                [0,0,0,0].map((category, index) => (
                  <div key={index} className="col-xxl-3 col-lg-4 col-md-4 col-6">
                    <CategoryCardLarge category={CATEGORY} />
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
                      <CollectionCardSmall collection={COLLECTION}/>
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
                      <DealsCardLarge deal={DEAL}/>
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
                  BANNERS.map((item, index) => (
                      <div key={index} className="col">
                        <LandscapeBanner banner={item}/>
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
                      <CollectionCardLarge collection={COLLECTION}/>
                    </div>
                ))
              }
            </div>
          </div>
        </section>

        <section className="py-25 mb-25">
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
                        <BundlesCardMedium bundle={BUNDLE}/>
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
                      <ProductCardLandScape book={BOOK}/>
                    </div>
                ))
              }
            </div>
          </div>
        </section>
      </>
  )
};

export default Home
