import React from "react";
import {GetStaticPaths, GetStaticProps, InferGetStaticPropsType, NextPage} from "next";
import axios from "axios";
import {mutate} from "swr";
import Head from "next/head";
import {useRouter} from "next/router";
import {useNotifications} from "@mantine/notifications";
import {Spoiler} from '@mantine/core';
import {Icon} from "@iconify/react";
import styled from "styled-components";

import Breadcrumbs from "../../components/elements/Breadcrumbs";
import PageWrapper from "../../components/elements/PageWrapper";
import EmptySectionMessage from "../../components/elements/FailedToLoad";
import SectionHeading from "../../components/elements/SectionHeading";
import ProductCardLandScape from "../../components/cards/ProductCardLandscape";
import BundlesCardMedium from "../../components/cards/BundlesCardMedium";
import CollectionCardSmall from "../../components/cards/CollectionCardSmall";

import {ACCENT_COLOR, LIGHT_COLOR, PRIMARY_COLOR, PRIMARY_SUCCESS, SECONDARY_COLOR, SM} from "../../core/_variables";
import {getBundleImage} from "../../core/_imageRendererHelper";
import {currencyFormat, returnDiscountedAmount} from "../../core/_helpers";

import {IBundle} from "../../schemas/bundle";
import {IBook} from "../../schemas/book";
import {ICollection} from "../../schemas/collection";

const BREADCRUMBS_ITEMS = (activeItem: any) => [
  {title: 'Home', href: '/'},
  {title: 'Bundles', href: '/bundles'},
  {title: activeItem.title, isActive: true, href: ''},
];

const SITE_FEATURES = [
  {icon: 'carbon:delivery-truck', title: 'Free Delivery', description: 'On Orders Above INR 300'},
  {icon: 'bi:award', title: 'Genuine Books', description: 'No Piracy. No First Copies.'},
  {
    icon: 'grommet-icons:insecure',
    title: 'Secure Payments',
    description: 'Via Debit & Credit Cards, Net Banking, UPIs, COD'
  },
  {icon: 'ep:refresh', title: 'Easy Return & Replacements', description: '7 Days Return Policy. No questions asked.'},
];

const ProductCoverSpace = styled.div`
  display: flex;
  justify-content: center;
`;

const ProductImage = styled.img`
  border-radius: 1.5rem;
  width: 300px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  box-shadow: rgb(0 0 0 / 18%) 0 2px 4px 0;
  
  @media screen and (max-width: ${SM - 1}px) {
     width: 230px;
  }
`;

const TagsSpace = styled.div`
  margin-bottom: 1rem;
  text-align: center;
`;

const TagsList = styled.div`
  margin: 1rem 0 0 0;
  padding: 0;
`;

const Tag = styled.li`
  display: inline-flex;
  border-radius: 1.5rem;
  position: relative;
  color: ${SECONDARY_COLOR};
  font-size: 0.825rem;
  background-color: ${ACCENT_COLOR};
  text-decoration: none;
  zoom: 1;
  line-height: 1;
  padding: 0.75rem 1.25rem;
  margin-left: 0.5rem;
  margin-bottom: 0.5rem;

  &:first-child {
    margin-left: 0;
  }
`;

const ProductInfo = styled.div``;
const ProductTitle = styled.h1`
  font-size: 2rem;
  letter-spacing: 0;
`;

const ProductDescription = styled.div`
  margin-bottom: 1.25rem;
  white-space: pre-wrap;
`;

const ProductSavings = styled.div`
  margin-bottom: 0.25rem;
  font-weight: 600;
  color: ${PRIMARY_SUCCESS};
`;

const ProductPricing = styled.div`
  font-weight: 600;
  font-size: 2rem;
  margin-bottom: 1.25rem;
`;

const Crossed = styled.span`
    margin-right: 0.5rem;
    text-decoration: line-through;
    color: ${LIGHT_COLOR};
`;

const AddToCartSpace = styled.div`
  margin-bottom: 2.5rem;
  display: flex;
`;

const AddToCartButton = styled.button`
  font-size: 1.5rem;
  line-height: 1.5rem;
  background-color: ${PRIMARY_COLOR};
  color: ${SECONDARY_COLOR};
  letter-spacing: -1px;
  padding: 1rem 2.5rem;
  border-radius: 0.5rem;
  font-weight: normal;
`;

const SiteFeatures = styled.div``;

const Feature = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 0.825rem;
`;

const FeatureIcon = styled.span`
  padding: 0.5rem;
  min-width: 3rem;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const FeatureDetails = styled.div`
  display: flex;
  flex-direction: column;
  margin-left: 0.5rem;
`;

const FeatureHeadline = styled.span`
  font-weight: 600;
`;


interface Props {
  bundleDetails: IBundle;
}

const BundleDetails: NextPage<Props> = ({bundleDetails}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const router = useRouter();
  const notif = useNotifications();

  if (router.isFallback) return <PageWrapper><EmptySectionMessage title={'Loading...'}/></PageWrapper>;

  function renderImageSize(w: number, h: number) {
    return getBundleImage(bundleDetails.poster, {height: h, width: w, fit: 'cover'});
  }

  function returnSavedAmount() {
    return Math.floor((bundleDetails.currentDiscount * bundleDetails.price) / 100);
  }

  async function handleAddCart() {
    try {
      await axios.post(`/cart/add/bundle`, {bundle: bundleDetails._id}, {withCredentials: true});
      notif.showNotification({message: 'Bundle Added to Cart', color: 'green', autoClose: 3000});
      updateCart();
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 5000});
    }
  }

  function updateCart() {
    mutate({url: `/cart/retrieve`, withCredentials: true});
  }

  return (
      <>
        <Head>
          <title>{`Buy ${bundleDetails.title} Online at Best Prices in India | Pageaters`}</title>
          <meta name="og:site_name" content="pageaters.com"/>
          <meta name="og:type" content="website"/>
          <meta name="twitter:card" content="summary"/>
          <meta name="twitter:site" content="@pageaters"/>

          <meta name="og:title" content={`Buy ${bundleDetails.title} Online at Best Prices in India | Pageaters`}/>
          <meta name="twitter:title" content={`Buy ${bundleDetails.title} Online at Best Prices in India | Pageaters`}/>

          <meta name="image" content={`${renderImageSize(450, 450)}`}/>
          <meta name="og:image" content={`${renderImageSize(450, 450)}`}/>
          <meta name="twitter:image" content={`${renderImageSize(450, 450)}`}/>

          <meta name="og:description" content={bundleDetails?.description}/>
          <meta name="twitter:description" content={bundleDetails.description}/>
          <meta name="description" content={bundleDetails.description}/>

          <meta name="og:url" content={`${process.env.NEXT_PUBLIC_SITE_URL}/bundles/${bundleDetails.bundleId}`}/>

          <meta name="fb:pages" content="Pageaters-101873422124838"/>
          <meta name="viewport" content="initial-scale=1.0, width=device-width"/>
        </Head>
        <PageWrapper>
          <div className="container">
            <div className="row">
              <div className="col">
                <Breadcrumbs items={BREADCRUMBS_ITEMS({title: bundleDetails?.title})}/>
              </div>
            </div>
          </div>
          <section className={'py-25'}>
            <div className="container">
              <div className="row">
                <div className="col-xxl-4 col-xl-4 col-12">
                  <ProductCoverSpace>
                    <ProductImage src={renderImageSize(450, 450)} alt={bundleDetails?.title} width={300}
                                  height={'auto'}/>
                  </ProductCoverSpace>
                  <TagsSpace>
                    <TagsList>
                      {
                        bundleDetails.tags.map((tag: string, index: number) => <Tag key={index}>{tag}</Tag>)
                      }
                    </TagsList>
                  </TagsSpace>
                </div>

                <div className="col-xxl-8 col-xl-8 col-12">
                  <div>
                    <>
                      <ProductTitle>
                        {bundleDetails.title}
                      </ProductTitle>
                    </>
                    <ProductDescription>
                      <Spoiler maxHeight={110}
                               styles={{
                                 control: {boxShadow: 'none', color: ACCENT_COLOR}
                               }}
                               showLabel="[Show more]"
                               hideLabel="[Hide]">
                        <p>{bundleDetails.description}</p>
                      </Spoiler>
                    </ProductDescription>

                    <ProductSavings>
                      {currencyFormat(returnSavedAmount())} less than buying separately
                    </ProductSavings>

                    <ProductPricing>
                      <Crossed>{currencyFormat(bundleDetails.price)}</Crossed>
                      <span>{currencyFormat(returnDiscountedAmount(bundleDetails.price, bundleDetails.currentDiscount))}</span>
                      <small>&nbsp;(Additional {bundleDetails.currentDiscount}% Off)</small>
                    </ProductPricing>

                    <AddToCartSpace>
                      <AddToCartButton onClick={handleAddCart}>
                        Add to Cart
                      </AddToCartButton>
                    </AddToCartSpace>

                    <div className="row">
                      {
                        SITE_FEATURES.map((feature, index) => {
                          return (
                              <div key={index} className="col-xxl-6 col-xl-6 col-lg-6 col-md-6 col-12">
                                <Feature>
                                  <FeatureIcon>
                                    <Icon className={'text-positive'} icon={feature.icon} height={36} width={36}/>
                                  </FeatureIcon>
                                  <FeatureDetails>
                                    <FeatureHeadline>{feature.title}</FeatureHeadline>
                                    <span>{feature.description}</span>
                                  </FeatureDetails>
                                </Feature>
                              </div>
                          )
                        })
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mb-25">
            <div className="custom-container">
              <div className="row">
                <div className="col">
                  <SectionHeading sectionTitle={'Books in This Bundle'}/>
                </div>
                <div className="row">
                  {
                    bundleDetails.bundledBooks.map((book: IBook) => {
                      return (
                          <div key={book.bookId} className="col-xxl-2 col-xl-3 col-lg-3 col-md-3 col-6">
                            <ProductCardLandScape book={book}/>
                          </div>
                      )
                    })
                  }
                </div>
              </div>
            </div>
          </section>
          {
            bundleDetails.relatedBundles.length > 0 && (
                <section className="mb-25">
                  <div className="custom-container">
                    <div className="row">
                      <div className="col">
                        <SectionHeading sectionTitle={'Suggested Bundles'}/>
                      </div>
                      <div className="row">
                        {
                          bundleDetails.relatedBundles.map((bundle: IBundle) => {
                            return (
                                <div key={bundle.bundleId} className="col-lg-3 col-6">
                                  <BundlesCardMedium bundle={bundle}/>
                                </div>
                            )
                          })
                        }
                      </div>
                    </div>
                  </div>
                </section>
            )
          }
          {
            bundleDetails.relatedCollections.length > 0 && (
                <section className="mb-25">
                  <div className="custom-container">
                    <div className="row">
                      <div className="col">
                        <SectionHeading sectionTitle={'Related Collections'}/>
                      </div>
                      <div className="row">
                        {
                          bundleDetails.relatedCollections.map((collection: ICollection) => {
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
                  </div>
                </section>
            )
          }
        </PageWrapper>
      </>
  )
};

export const getStaticPaths: GetStaticPaths = async (context) => {
  const promise$ = await axios.get(`/bundles`, {params: {limit: 12, page: 1, sortBy: 'priority', sortOrder: 'asc'}});
  const {data} = await promise$.data;

  const paths = data.docs.map((doc: IBundle) => {
    return {params: {id: doc.bundleId}}
  });

  return {
    paths,
    fallback: true
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const id = context?.params?.id;

  const promise$ = await axios.get(`/bundles/unique/${id}`);
  const {data} = await promise$.data;

  return {
    props: {
      bundleDetails: data
    }
  }
};

export default BundleDetails;

