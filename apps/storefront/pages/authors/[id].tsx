import React from "react";
import {GetStaticPaths, GetStaticProps, InferGetStaticPropsType, NextPage} from "next";
import axios from "axios";
import styled from "styled-components";
import KebabCase from 'lodash/kebabCase'
import Head from "next/head";
import {useRouter} from "next/router";
import {useKeenSlider} from 'keen-slider/react';

import Breadcrumbs from "../../components/elements/Breadcrumbs";
import EmptySectionMessage from "../../components/elements/FailedToLoad";
import ProductCardLandScape from "../../components/cards/ProductCardLandscape";
import CollectionCardSmall from "../../components/cards/CollectionCardSmall";

import {ICollection} from "../../schemas/collection";
import {IBook} from "../../schemas/book";
import {ACCENT_COLOR, BUCKETS_ORIGINS, LG, LIGHTEST_PRIMARY_COLOR, MD, PRIMARY_COLOR, SECONDARY_ACCENT_COLOR, SECONDARY_COLOR, SM} from "../../core/_variables";

import {CategoryTitleSpace, SectionTitle} from "../../components/carousels/Categories";
import {getAuthorImage, getCollectionImage} from "../../core/_imageRendererHelper";
import { IAuthor } from "../../schemas/author";
import { Spoiler } from "@mantine/core";


const BREADCRUMBS_ITEMS = (activeItem: any) => [
  {title: 'Home', href: '/'},
  {title: activeItem.title, isActive: true, href: ''},
];

interface Props {
  author: IAuthor;
}

const CollectionBanner = styled.section`
  height: 33vh;
  position: relative;
  width: 100%;
  
  &:after {
    content: "";
    display: block;
    background: rgb(0, 0, 0);
    background: linear-gradient(to top,rgba(0,0,0,0.3) 0%,transparent 100%);
    left: 0;
    top: 0;
    height: inherit;
    width: 100%;
    position: absolute; 
  }
  
  @media screen and (max-width: ${MD - 1}px) {
    //  height: 70vh;
  }
  
  @media screen and (max-width: ${SM - 1}px) {
    //  height: 50vh;
  }
`;

const CollectionTitleSpace = styled.div`
  margin-top: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`;

const CardImage = styled.img`
    width: 250px;
    height: 250px;
    border-radius: 50%;
    object-fit: contain;
    border: 3px solid ${PRIMARY_COLOR};
    position: absolute;
    left: 0;
    right: 0;
    bottom: -125px;
    margin: auto;
    z-index: 1;
`;

const CollectionTitle = styled.h1`
  color: ${PRIMARY_COLOR};
  text-align: center;
  position: relative;
  letter-spacing: -3px;
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

const AuthorIntro = styled.div`
  margin-bottom: 2.25rem;
  margin-top: 1.25rem;
  white-space: pre-wrap;
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

const ViewAuthor: NextPage<Props> = ({author}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const router = useRouter();
  const [refCallback] = useKeenSlider({
    mode: "free",
    breakpoints: {
      '(min-width: 992px)': {
        slides: {origin: "auto", perView: 7.25, spacing: 12},
      },
      '(max-width: 768px)': {
        slides: {origin: "auto", perView: 4.25, spacing: 12},
      },
      '(max-width: 576px)': {
        slides: {origin: "auto", perView: 2.25, spacing: 12},
      },
    },
  });

  if (router.isFallback) return <EmptySectionMessage title={'Loading...'}/>;

  function renderImageSize(w: number, h: number) {
    return getAuthorImage(author.avatar, {height: h, width: w, fit: 'cover'});
  }

  return (
      <>
        <Head>
          <title>{author?.name} | Pageaters</title>
          <meta name="description" content={author?.intro}/>
          <meta itemProp="name" content={`${author?.name} | Pageaters`}/>
          <meta itemProp="description" content={author?.intro}/>
          <meta itemProp="image" content={`${BUCKETS_ORIGINS.COLLECTIONS}/${author.avatar}`}/>


          <meta name="title" content={`${author?.name} | Pageaters`}/>
          <meta name="description" content={`${author?.intro}`}/>
          <meta name="image" content={`${BUCKETS_ORIGINS.COLLECTIONS}/${author.avatar}`}/>

          <meta name="og:title" content={`${author?.name} | Pageaters`}/>
          <meta name="og:description" content={author?.intro}/>
          <meta name="og:url" content={`${process.env.NEXT_PUBLIC_SITE_URL}/categories/${author.categoryId}`}/>
          <meta name="og:image" content={`${BUCKETS_ORIGINS.COLLECTIONS}/${author.avatar}`}/>

          <meta name="twitter:title" content={`${author.title} | Pageaters`}/>
          <meta name="twitter:description" content={author.intro}/>
          <meta name="twitter:image" content={`${BUCKETS_ORIGINS.COLLECTIONS}/${author.avatar}`}/>
        </Head>

        <CollectionBanner>
          {/* <picture style={{height: 'inherit'}}>
            <source media={`(max-width: ${SM - 1}px)`} type="image/jpeg" srcSet={renderImageSize(768, 512)} height={512}
                    width={768}/>
            <source media={`(max-width: ${MD - 1}px)`} type="image/jpeg" srcSet={renderImageSize(1024, 682)}
                    height={682} width={1024}/>
            <source media={`(max-width: ${LG - 1}px)`} type="image/jpeg" srcSet={renderImageSize(1600, 1066)}
                    height={1066} width={1600}/>
            <CollectionCoverImage src={renderImageSize(1920, 720)} alt={author.title} width={1920}
                                  height={720}/>
          </picture> */}
          <CardImage src={renderImageSize(250, 250)} alt={author?.name} loading="lazy" height={250} width={250}/>
        </CollectionBanner>

        <section className="">
          <div className="custom-container">
            <div className="row">
              <div className="col">
                {/* <Breadcrumbs items={BREADCRUMBS_ITEMS({title: author?.name})}/> */}
                <CollectionTitleSpace>
                    <CollectionTitle>{author?.name}</CollectionTitle>
                    <AuthorIntro>
                      <Spoiler maxHeight={110}
                               styles={{
                                 control: {boxShadow: 'none', fontSize: '1rem', color: LIGHTEST_PRIMARY_COLOR}
                               }}
                               showLabel="Read More"
                               hideLabel="Read Less">
                        <p>{author?.intro}</p>
                      </Spoiler>
                    </AuthorIntro>
                </CollectionTitleSpace>
              </div>
            </div>
          </div>
        </section>
        <section className="mb-25">
          <div className="custom-container">
            <div className="row">
              {
                author.books.map((book: IBook) => {
                  return (
                      <div key={book.bookId} className="col-xxl-2 col-xl-3 col-lg-3 col-md-3 col-6 mb-1">
                        <ProductCardLandScape book={book} analytics={{
                          listName: `${author?.name} Author Profile`,
                          listId: `${KebabCase(author?.name)}-books`
                        }}/>
                      </div>
                  )
                })
              }
            </div>
          </div>
        </section>
      </>
  )
};

export const getStaticPaths: GetStaticPaths = async (context) => {
  const promise$ = await axios.get(`/authors`, {params: {limit: 9, page: 1}});
  const {data} = await promise$.data;

  const paths = data.docs.map((doc: IAuthor) => {
    return {params: {id: doc.authorId}}
  });

  return {
    paths,
    fallback: true
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const id = context?.params?.id;

  const promise$ = await axios.get(`/authors/unique/${id}`);
  const {data} = await promise$.data;

  if (!data) {
    return {
      notFound: true,
    }
  }

  return {
    props: {
      author: data
    },
    revalidate: 1000, // value in seconds | ~ 16 mins
  }
};

export default ViewAuthor;

