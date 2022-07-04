import React from "react";
import {GetStaticPaths, GetStaticProps, InferGetStaticPropsType, NextPage} from "next";
import axios from "axios";
import styled from "styled-components";
import KebabCase from 'lodash/kebabCase'
import Head from "next/head";
import {useRouter} from "next/router";
import { useKeenSlider } from 'keen-slider/react';

import Breadcrumbs from "../../components/elements/Breadcrumbs";
import EmptySectionMessage from "../../components/elements/FailedToLoad";
import CategoryLandscapeCard from "../../components/cards/CategoryLandscapeCard";
import ProductCardLandScape from "../../components/cards/ProductCardLandscape";
import CollectionCardSmall from "../../components/cards/CollectionCardSmall";

import {ICollection} from "../../schemas/collection";
import {ICategory} from "../../schemas/category";
import {IBook} from "../../schemas/book";
import {BUCKETS_ORIGINS, LG, MD, PRIMARY_COLOR, SECONDARY_COLOR, SM} from "../../core/_variables";

import {CategoryTitleSpace, SectionTitle} from "../../components/carousels/Categories";
import {getCollectionImage} from "../../core/_imageRendererHelper";


const BREADCRUMBS_ITEMS = (activeItem: any) => [
  {title: 'Home', href: '/'},
  {title: 'Collections', href: '/collections'},
  {title: activeItem.title, isActive: true, href: ''},
];

interface Props {
  collectionInfo: ICollection;
}

const CollectionBanner = styled.section`
  height: 80vh;
  position: relative;
  width: 100%;
  
  &:after {
    content: "";
    display: block;
    background: rgb(0, 0, 0);
    background: linear-gradient(to bottom right, rgba(0, 0, 0, 0.3) -25%, transparent 100%);
    left: 0;
    top: 0;
    height: inherit;
    width: 100%;
    position: absolute; 
  }
  
  @media screen and (max-width: ${MD - 1}px) {
     height: 70vh;
  }
  
  @media screen and (max-width: ${SM - 1}px) {
     height: 50vh;
  }
`;

const CollectionTitleSpace = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  bottom: 5%;
  z-index: 1;
  width: 100%;
`;

const CollectionCoverImage = styled.img`
  width: 100%;
  height: inherit;
  object-fit: cover;
`;

const CollectionTitle = styled.h1`
  color: ${SECONDARY_COLOR};
  text-align: center;
  position: relative;
  letter-spacing: -3px;
  text-shadow: 3px 4px 7px rgba(81,67,21,0.8);
  font-size: 3.714rem;
  line-height: 4rem;
  
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

const TagList = styled.div`
  margin: 0;
  padding: 0;
  display: flex;
  justify-content: center;
  flex-direction: row;
  flex-wrap: wrap;
`;

const Tag = styled.span`
  display: inline-flex;
  border-radius: 1.5rem;
  position: relative;
  color: ${PRIMARY_COLOR};
  font-size: 0.825rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  background-color: ${SECONDARY_COLOR};

  text-decoration: none;

  zoom: 1;
  line-height: 1;
  padding: 0.5rem 1rem;
  margin-left: 0.5rem;

  &:first-child {
    margin-left: 0;
  }
`;

const ViewCollection: NextPage<Props> = ({collectionInfo}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const router = useRouter();
  const [refCallback] = useKeenSlider({
    mode: "free",
    breakpoints: {
      '(min-width: 992px)': {
        slides: { origin: "auto", perView: 7.25, spacing: 12 },
      },
      '(max-width: 768px)': {
        slides: { origin: "auto", perView: 4.25, spacing: 12 },
      },
      '(max-width: 576px)': {
        slides: { origin: "auto", perView: 2.25, spacing: 12 },
      },
    },

  });

  if (router.isFallback) return <EmptySectionMessage title={'Loading...'}/>;

  function renderImageSize(w: number, h: number) {
    return getCollectionImage(collectionInfo.poster, {height: h, width: w, fit: 'cover'});
  }

  return (
      <>
        <Head>
          <title>{collectionInfo?.title} | Pageaters</title>
          <meta name="description" content={collectionInfo?.description}/>
          <meta itemProp="name" content={`${collectionInfo?.title} | Pageaters`}/>
          <meta itemProp="description" content={collectionInfo?.description}/>
          <meta itemProp="image" content={`${BUCKETS_ORIGINS.COLLECTIONS}/${collectionInfo.poster}`}/>


          <meta name="title" content={`${collectionInfo?.title} | Pageaters`} />
          <meta name="description" content={`${collectionInfo?.description}`}/>
          <meta name="image" content={`${BUCKETS_ORIGINS.COLLECTIONS}/${collectionInfo.poster}`}/>

          <meta name="og:title" content={`${collectionInfo?.title} | Pageaters`}/>
          <meta name="og:description" content={collectionInfo?.description}/>
          <meta name="og:url" content={`${process.env.NEXT_PUBLIC_SITE_URL}/categories/${collectionInfo.categoryId}`}/>
          <meta name="og:image" content={`${BUCKETS_ORIGINS.COLLECTIONS}/${collectionInfo.poster}`}/>

          <meta name="twitter:title" content={`${collectionInfo.title} | Pageaters`}/>
          <meta name="twitter:description" content={collectionInfo.description}/>
          <meta name="twitter:image" content={`${BUCKETS_ORIGINS.COLLECTIONS}/${collectionInfo.poster}`}/>
        </Head>

        <CollectionBanner>
          <picture style={{height: 'inherit'}}>
            <source media={`(max-width: ${SM - 1}px)`} type="image/jpeg" srcSet={renderImageSize(768, 512)} height={512} width={768}/>
            <source media={`(max-width: ${MD - 1}px)`} type="image/jpeg" srcSet={renderImageSize(1024, 682)} height={682} width={1024}/>
            <source media={`(max-width: ${LG - 1}px)`} type="image/jpeg" srcSet={renderImageSize(1600, 1066)} height={1066} width={1600}/>
            <CollectionCoverImage src={renderImageSize(1920, 720)} alt={collectionInfo.title} width={1920} height={720}/>
          </picture>
          <CollectionTitleSpace>
            <CollectionTitle>{collectionInfo?.title}</CollectionTitle>
            <TagList>
              {
                collectionInfo.tags.map((tag: string, index: number) => <Tag key={index}>{tag}</Tag>)
              }
            </TagList>
          </CollectionTitleSpace>
        </CollectionBanner>

        <div className="custom-container">
          <div className="row">
            <div className="col">
              <div className={'py-25'}>
                <Breadcrumbs items={BREADCRUMBS_ITEMS({title: collectionInfo?.title})}/>
              </div>
            </div>
          </div>
        </div>

        {
          collectionInfo.relatedCategories.length > 0 && (
              <section className="mb-25">
                <div className="custom-container">
                  <div className="row">
                    <div className="col">
                      <CategoryTitleSpace>
                        <SectionTitle>
                          Featured Categories
                        </SectionTitle>
                      </CategoryTitleSpace>
                    </div>
                  </div>
                  <div className="row categories-list-container">
                    {
                      collectionInfo.relatedCategories.map((category: ICategory) => {
                        return (
                            <div key={category.categoryId} className="col-xxl-2 col-xl-2 col-lg-3 col-md-3 col-4">
                              <CategoryLandscapeCard category={category}/>
                            </div>
                        )
                      })
                    }
                  </div>
                </div>
              </section>
          )
        }

        <section className="mb-25">
          <div className="custom-container">
            <div className="row">
              {
                collectionInfo.books.map((book: IBook) => {
                  return (
                      <div key={book.bookId} className="col-xxl-2 col-xl-3 col-lg-3 col-md-3 col-6">
                        <ProductCardLandScape book={book} analytics={{listName: `${collectionInfo?.title} Collection`, listId: `${KebabCase(collectionInfo?.title)}-books`}}/>
                      </div>
                  )
                })
              }
            </div>
          </div>
        </section>

        {
          collectionInfo.relatedCollections.length > 0 && (
              <section className="mb-25">
                <div className="custom-container">
                  <div className="row">
                    <div className="col">
                      <CategoryTitleSpace>
                        <SectionTitle>Related Collections</SectionTitle>
                      </CategoryTitleSpace>
                    </div>
                  </div>
                  <div className="row categories-list-container">
                    {
                      collectionInfo.relatedCollections.map((collection: ICollection) => {
                        return (
                            <div key={collection.collectionId}
                                 className="col-xxl-4 col-xl-4 col-lg-4 col-md-6 col-sm-6 col-12">
                              <CollectionCardSmall collection={collection}/>
                            </div>
                        )
                      })
                    }
                  </div>
                </div>
              </section>
          )
        }

      </>
  )
};

export const getStaticPaths: GetStaticPaths = async (context) => {
  const promise$ = await axios.get(`/collections`, {params: {limit: 9, page: 1}});
  const {data} = await promise$.data;

  const paths = data.docs.map((doc: ICollection) => {
    return {params: {id: doc.collectionId}}
  });

  return {
    paths,
    fallback: true
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const id = context?.params?.id;

  const promise$ = await axios.get(`/collections/unique/${id}`);
  const {data} = await promise$.data;

  return {
    props: {
      collectionInfo: data
    },
    revalidate: 1000, // value in seconds | ~ 16 mins
  }
};

export default ViewCollection;

