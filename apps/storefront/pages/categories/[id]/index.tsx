import React from 'react';
import {GetStaticPaths, GetStaticProps, InferGetStaticPropsType, NextPage} from "next";
import {useRouter} from "next/router";
import Head from "next/head";
import axios from "axios";
import {get} from 'lodash';
import {Center} from "@mantine/core";
import useSWR from "swr";

import Breadcrumbs from "../../../components/elements/Breadcrumbs";
import PageWrapper from "../../../components/elements/PageWrapper";
import PageHeadings from "../../../components/elements/PageHeadings";
import ProductSets from "../../../components/carousels/ProductSets";
import Bundles from "../../../components/carousels/Bundles";
import CollectionGallery from "../../../components/carousels/CollectionWithBooks";
import DealsCarousel from "../../../components/carousels/DealsCarousel";
import AppButton, {ButtonVariants} from "../../../components/form-controls/Button";

import {ICategory} from "../../../schemas/category";
import {ICollection} from "../../../schemas/collection";

import {BUCKETS_ORIGINS} from "../../../core/_variables";

interface Props {
  categoryDetails: ICategory;
}

const BREADCRUMBS_ITEMS = (activeItem: any) => [
  {title: 'Home', href: '/'},
  {title: 'Categories', href: '/categories'},
  {title: activeItem.title, isActive: true, href: ''},
];

const CategoryHome: NextPage<Props> = ({categoryDetails}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const router = useRouter();

  const {data: collectionsRes, error: collectionsErr} = useSWR({url: `/collections?page=1&limit=6&sortBy=priority&sortOrder=asc&category=${categoryDetails?._id}`});
  const {data: bundlesRes, error: bundlesErr} = useSWR({url: `/bundles?page=1&limit=6&sortBy=priority&sortOrder=asc&category=${categoryDetails?._id}`});
  const {data: discountsRes, error: discountsErr} = useSWR({url: `/deals?limit=10&page=1&sortBy=priority&sortOrder=asc&category=${categoryDetails?._id}`});
  const {data: productsRes, error: productsErr} = useSWR({url: `/categories/${categoryDetails?._id}/overview?page=1&limit=15&sortOrder=desc`});

  const collections = get(collectionsRes, 'data.docs', []);
  const bundles = get(bundlesRes, 'data.docs', []);
  const discounts = get(discountsRes, 'data.docs', []);

  const trending = get(productsRes, 'data.trending', []);
  const newArrivals = get(productsRes, 'data.newArrivals', []);
  const mostDiscounted = get(productsRes, 'data.mostDiscounted', []);

  function navigateToCatalog() {
    router.push(`/categories/${categoryDetails.categoryId}/catalog`)
  }

  return (
      <>
      <Head>
        <title>{categoryDetails?.title} | Pageaters</title>
        <meta name="description" content={categoryDetails?.description}/>
        <meta itemProp="name" content={`${categoryDetails?.title} | Pageaters`}/>
        <meta itemProp="description" content={categoryDetails?.description}/>
        <meta itemProp="image" content={`${BUCKETS_ORIGINS.CATEGORIES}/${categoryDetails?.thumbnail}`}/>

        <meta name="og:title" content={`${categoryDetails?.title} | Pageaters`}/>
        <meta name="og:description" content={categoryDetails?.description}/>
        <meta name="og:url" content={`${process.env.NEXT_PUBLIC_SITE_URL}/categories/${categoryDetails?.categoryId}`}/>
        <meta name="og:image" content={`${BUCKETS_ORIGINS.CATEGORIES}/${categoryDetails?.thumbnail}`}/>
        <meta name="twitter:title" content={`${categoryDetails?.title} | Pageaters`}/>
        <meta name="twitter:description" content={categoryDetails?.description}/>
        <meta name="twitter:image" content={`${BUCKETS_ORIGINS.CATEGORIES}/${categoryDetails?.thumbnail}`}/>
        <meta name="description" content={categoryDetails?.description}/>
        <meta name="image" content={`${BUCKETS_ORIGINS.CATEGORIES}/${categoryDetails?.thumbnail}`}/>
      </Head>
      <PageWrapper>
        <div className="custom-container">
          <div className="row">
            <div className="col">
              <Breadcrumbs items={BREADCRUMBS_ITEMS({title: categoryDetails?.title})}/>
            </div>
          </div>
        </div>
        <section>
          <PageHeadings title={categoryDetails?.title}/>
        </section>
        <section className={'mb-25'}>
          <ProductSets title={'Trending Books'} products={trending}/>
        </section>
        <section className={'mb-25'}>
          <ProductSets title={'Most Discounted'} products={mostDiscounted}/>
        </section>
        {
          discounts.length > 0 && (
              <section className={'mb-25'}>
                <DealsCarousel title={'Featured Deals'} deals={discounts}/>
              </section>
          )
        }
        <section className={'mb-25'}>
          <ProductSets title={'New Arrivals'} products={newArrivals}/>
        </section>
        {
          bundles.length > 0 && (
              <section className={'mb-25'}>
                <Bundles title={`Best Bundles in ${categoryDetails?.title}`} bundles={bundles}/>
              </section>
          )
        }
        {
          collections.map((collection: ICollection) => <section key={collection.collectionId} className={'mb-25'}>
            <CollectionGallery
                collection={collection}/></section>)
        }
        <section className={'mb-25'}>
          <Center>
            <AppButton variant={ButtonVariants.Default} onClick={navigateToCatalog}>Explore All Books</AppButton>
          </Center>
        </section>
      </PageWrapper>
      </>
  )
};


export const getStaticPaths: GetStaticPaths = async (context) => {
  const promise$ = await axios.get(`/categories`, {params: {limit: 25, page: 1}});
  const {data} = await promise$.data;

  const paths = data.docs.map((doc: ICategory) => {
    return {params: {id: doc.categoryId}}
  });

  return {
    paths,
    fallback: true
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const id = context?.params?.id;

  const promise$ = await axios.get(`/categories/unique/${id}`);
  const {data} = await promise$.data;

  return {
    props: {
      categoryDetails: data,
    },
    revalidate: 1000, // value in seconds | ~ 16 mins
  }
};

export default CategoryHome;
