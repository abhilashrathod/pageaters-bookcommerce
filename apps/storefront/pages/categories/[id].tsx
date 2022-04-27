import React, {useState} from "react";
import {GetStaticPaths, GetStaticProps, InferGetStaticPropsType, NextPage} from "next";
import axios from "axios";
import {parseUrl, stringifyUrl} from 'query-string';
import Head from "next/head";
import {useRouter} from "next/router";
import useSWR from "swr";

import {Pagination, Skeleton} from "@mantine/core";
import Breadcrumbs from "../../components/elements/Breadcrumbs";
import PageWrapper from "../../components/elements/PageWrapper";
import PageHeadings from "../../components/elements/PageHeadings";
import ProductCardLandScape from "../../components/cards/ProductCardLandscape";
import EmptySectionMessage from "../../components/elements/FailedToLoad";

import {ICategory} from "../../schemas/category";
import {IBook} from "../../schemas/book";
import {BUCKETS_ORIGINS, CATEGORY_SORT_OPTIONS} from "../../core/_variables";

const BREADCRUMBS_ITEMS = (activeItem: any) => [
  {title: 'Home', href: '/'},
  {title: 'Categories', href: '/categories'},
  {title: activeItem.title, isActive: true, href: ''},
];

interface Props {
  categoryDetails: ICategory;
}

const FILTER_OPTIONS = {
  showFilters: true,
  filterOptions: CATEGORY_SORT_OPTIONS,
  defaultFilter: CATEGORY_SORT_OPTIONS[0],
};

const CategoryDetails: NextPage<Props> = ({categoryDetails}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const router = useRouter();

  const [params, setParams] = useState(() => {
    const {query} = parseUrl(router.asPath);
    return {
      page: Number(query.page) || 1,
      limit: 12,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc'
    };
  });

  const {data, error} = useSWR({
    url: `/categories/${categoryDetails?._id}/products`,
    args: params
  });

  function handleFilterSelection(e: any) {
    const [field, sortValue] = e.split('|');

    const newParams = {
      page: 1,
      limit: params.limit,
      sortBy: field,
      sortOrder: sortValue,
    };

    setParams((prevState) => ({
      ...prevState,
      page: 1,
      sortBy: field,
      sortOrder: sortValue,
    }));

    redirectWithParams(newParams);
  }

  function handlePageChange(e: any) {
    setParams((prevState) => ({
      ...prevState,
      page: e,
    }));

    const newParams = {
      page: e,
      limit: params.limit,
      sortBy: params.sortBy || '',
      sortOrder: params.sortOrder || '',
    };

    redirectWithParams(newParams);
  }

  function redirectWithParams(params: any) {
    const newPathname = stringifyUrl({url: router.pathname, query: {...params}});
    const newAsPath = stringifyUrl({url: router.asPath, query: {...params}});
    router.replace(newPathname, newAsPath);
  }

  if (router.isFallback) return <PageWrapper><EmptySectionMessage title={'Loading...'} /></PageWrapper>;
  if (error) return <PageWrapper><EmptySectionMessage title={'Failed to load data...'}/></PageWrapper>;

  return (
      <>
        <Head>
          <title>{categoryDetails?.title} | Pageaters</title>
          <meta name="og:site_name" content="pageaters.com"/>
          <meta name="og:type" content="website"/>
          <meta name="twitter:card" content="summary"/>
          <meta name="twitter:site" content="@pageaters"/>
          <meta name="og:title" content={`${categoryDetails?.title} | Pageaters`}/>
          <meta name="og:description" content={categoryDetails?.description}/>
          <meta name="og:url" content={`${process.env.NEXT_PUBLIC_SITE_URL}/categories/${categoryDetails.categoryId}`}/>
          <meta name="og:image" content={`${BUCKETS_ORIGINS.CATEGORIES}/${categoryDetails.thumbnail}`}/>
          <meta name="twitter:title" content={`${categoryDetails.title} | Pageaters`}/>
          <meta name="twitter:description" content={categoryDetails.description}/>
          <meta name="twitter:image" content={`${BUCKETS_ORIGINS.CATEGORIES}/${categoryDetails.thumbnail}`}/>
          <meta name="fb:pages" content="Pageaters-101873422124838"/>
          <meta name="description" content={categoryDetails.description}/>
          <meta name="image" content={`${BUCKETS_ORIGINS.CATEGORIES}/${categoryDetails.thumbnail}`}/>
          <meta name="viewport" content="initial-scale=1.0, width=device-width"/>
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
            <PageHeadings title={categoryDetails?.title} {...FILTER_OPTIONS} onFilterSelect={handleFilterSelection}/>
          </section>

          {
            data
                ? (<section>
                  <div className="custom-container">
                    <div className="row">
                      {
                        data?.data?.docs.map((item: IBook) => {
                          return (
                              <div key={item.bookId} className="col-xxl-2 col-xl-3 col-lg-3 col-md-3 col-6">
                                <ProductCardLandScape book={item}/>
                              </div>
                          )
                        })
                      }
                    </div>
                    <div className="row py-25">
                      <div className="col">
                        <Pagination style={{justifyContent: 'center'}}
                                    total={data?.data?.totalPages}
                                    color="dark" size="lg" radius="xl"
                                    page={params.page}
                                    onChange={handlePageChange}/>
                      </div>
                    </div>
                  </div>
                </section>)
                : (
                    <section>
                      <div className="custom-container">
                        <div className="row">
                          {
                            [0, 0, 0, 0, 0, 0].map((item, index) => {
                              return (
                                  <div key={index} className="col-xxl-2 col-xl-3 col-lg-3 col-md-3 col-6">
                                    <Skeleton height={300} radius="lg"/>
                                    <Skeleton height={10} width="100%" mt={10} radius="sm"/>
                                    <Skeleton height={10} width="100%" mt={10} radius="sm"/>
                                  </div>
                              )
                            })
                          }
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
      categoryDetails: data
    },
    revalidate: 1000, // value in seconds | ~ 16 mins
  }
};

export default CategoryDetails;

