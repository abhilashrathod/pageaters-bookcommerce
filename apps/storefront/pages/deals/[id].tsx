import React from "react";
import {GetStaticPaths, GetStaticProps, InferGetStaticPropsType, NextPage} from "next";
import axios from "axios";
import styled from "styled-components";
import Head from "next/head";
import KebabCase from 'lodash/kebabCase'
import {useRouter} from "next/router";

import Breadcrumbs from "../../components/elements/Breadcrumbs";
import PageWrapper from "../../components/elements/PageWrapper";
import PageHeadings from "../../components/elements/PageHeadings";
import EmptySectionMessage from "../../components/elements/FailedToLoad";
import ProductCardLandScape from "../../components/cards/ProductCardLandscape";

import {IDeal, ISetItem} from "../../schemas/deal";
import {IProductItem} from "../../schemas/product-set";

import {ACCENT_COLOR, BUCKETS_ORIGINS, SM} from "../../core/_variables";

const BREADCRUMBS_ITEMS = (activeItem: any) => [
  {title: 'Home', href: '/'},
  {title: 'Deals & Discounts', href: '/deals'},
  {title: activeItem.title, isActive: true, href: ''},
];

interface Props {
  dealInfo: IDeal;
}

const DealSectionHeadingSpace = styled.div`
  margin: 2.5rem 0 3.5rem 0;
`;

const DealHeading = styled.h5`
  text-align: center;
  position: relative;
  
  &::after {
    content: " ";
    position: absolute;
    width: 5%;
    left: 47.5%;
    height: 1px;
    bottom: -15px;
    border-bottom: 5px solid ${ACCENT_COLOR};
    text-align: center;
    border-radius: 5px;
    
    @media screen and (max-width: ${SM - 1}px) {      
      width: 20%;
      left: 40%;
    }
  }
`;

const ViewDeal: NextPage<Props> = ({dealInfo}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const router = useRouter();

  if (router.isFallback) return <EmptySectionMessage title={'Loading...'}/>;

  return (
      <>
        <Head>
          <title>{dealInfo?.title} | Pageaters</title>
          <meta name="description" content={dealInfo.description}/>
          <meta itemProp="name" content={`${dealInfo?.title} | Pageaters`}/>
          <meta itemProp="description" content={dealInfo.description}/>
          <meta itemProp="image" content={`${BUCKETS_ORIGINS.ASSETS}/${dealInfo.thumbnail}`}/>
          <meta name="og:title" content={`${dealInfo?.title} | Pageaters`}/>
          <meta name="og:description" content={dealInfo?.description}/>
          <meta name="og:url" content={`${process.env.NEXT_PUBLIC_SITE_URL}/categories/${dealInfo.categoryId}`}/>
          <meta name="og:image" content={`${BUCKETS_ORIGINS.ASSETS}/${dealInfo.poster}`}/>
          <meta name="twitter:title" content={`${dealInfo.title} | Pageaters`}/>
          <meta name="twitter:description" content={dealInfo.description}/>
          <meta name="twitter:image" content={`${BUCKETS_ORIGINS.ASSETS}/${dealInfo.thumbnail}`}/>
          <meta name="description" content={dealInfo.description}/>
          <meta name="image" content={`${BUCKETS_ORIGINS.ASSETS}/${dealInfo.thumbnail}`}/>
        </Head>
        <PageWrapper>
          <div className="custom-container">
            <div className="row">
              <div className="col">
                <Breadcrumbs items={BREADCRUMBS_ITEMS({title: dealInfo?.title})}/>
              </div>
            </div>
          </div>
          <section>
            <PageHeadings title={dealInfo?.title}/>
          </section>

          {
            dealInfo.productSets.map((productSet: ISetItem) => {
              return (
                  <section key={productSet._id} className="mb-25">
                    <div className="custom-container">
                      <div className="row">
                        <div className="col-12">
                          <DealSectionHeadingSpace>
                            <DealHeading>
                              {productSet.set.title}
                            </DealHeading>
                          </DealSectionHeadingSpace>
                        </div>
                      </div>
                      <div className="row">
                        {
                          productSet.set.products.map((productItem: IProductItem) => {
                            return (
                                <div key={productItem.product.bookId}
                                     className="col-xxl-2 col-xl-3 col-lg-3 col-md-3 col-6">
                                  <ProductCardLandScape book={productItem.product} analytics={{listName: `Deal ${dealInfo?.title}`, listId: `${KebabCase(dealInfo?.title)}-deal-books`}} />
                                </div>
                            )
                          })
                        }
                      </div>
                    </div>
                  </section>
              )
            })
          }
        </PageWrapper>
      </>
  )
};

export const getStaticPaths: GetStaticPaths = async (context) => {
  const promise$ = await axios.get(`/deals`, {params: {limit: 9, page: 1}});
  const {data} = await promise$.data;

  const paths = data.docs.map((doc: IDeal) => {
    return {params: {id: doc.dealId}}
  });

  return {
    paths,
    fallback: true
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const id = context?.params?.id;

  const promise$ = await axios.get(`/deals/unique/${id}`);
  const {data} = await promise$.data;

  return {
    props: {
      dealInfo: data
    },
    revalidate: 1000, // value in seconds | ~ 16 mins
  }
};

export default ViewDeal;

