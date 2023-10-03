import React, {useEffect, useState} from 'react';
import Head from "next/head";
import {useRouter} from "next/router";
import useSWR from "swr";
import {Pagination, Skeleton} from "@mantine/core";
import {parseUrl, stringifyUrl} from "query-string";

import Breadcrumbs from "../../components/elements/Breadcrumbs";
import PageWrapper from "../../components/elements/PageWrapper";
import PageHeadings from "../../components/elements/PageHeadings";
import EmptySectionMessage from "../../components/elements/FailedToLoad";
import CollectionCardLarge from "../../components/cards/CollectionCardLarge";

import {ICollection} from "../../schemas/collection";

interface Props {
}

const PAGE_META = {
  imageUrl: 'https://pageaters-assets.s3.ap-south-1.amazonaws.com/collections-1.jpg',
  description: 'Explore the best collections of books to find your next read at Pageaters',
  title: 'Collections | Pageaters',
  url: `${process.env.NEXT_PUBLIC_SITE_URL}/collections`
};

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Collections', isActive: true, href: ''},
];

const Collections: React.FC<Props> = () => {
  const router = useRouter();

  useEffect(() => {

  }, []);

  const [params, setParams] = useState(() => {
    const {query} = parseUrl(router.asPath);
    return {
      page: Number(query.page) || 1,
      limit: 9,
    };
  });

  const {data, error} = useSWR({url: `/collections`, args: {...params}});

  function handlePageChange(e: any) {
    setParams((prevState) => ({
      ...prevState,
      page: e,
    }));

    const newParams = {
      page: e,
      limit: params.limit,
    };

    redirectWithParams(newParams);
  }

  function redirectWithParams(params: any) {
    const newPathname = stringifyUrl({url: router.pathname, query: {...params}});
    const newAsPath = stringifyUrl({url: router.asPath, query: {...params}});
    router.replace(newPathname, newAsPath);
  }

  if (router.isFallback) return <EmptySectionMessage title={'Loading...'}/>;
  if (error) return <EmptySectionMessage title={'Failed to load data...'}/>;

  return (
      <>
        <Head>
          <title>{PAGE_META.title}</title>
          <meta name="description" content={PAGE_META.description}/>
          <meta itemProp="name" content={PAGE_META.title}/>
          <meta itemProp="description" content={PAGE_META.description}/>
          <meta itemProp="image" content={PAGE_META.imageUrl}/>
          <meta name="og:title" content={PAGE_META.title}/>
          <meta name="og:description" content={PAGE_META.description}/>
          <meta name="og:url" content={PAGE_META.url}/>
          <meta name="og:image" content={PAGE_META.imageUrl}/>
          <meta name="twitter:title" content={PAGE_META.title}/>
          <meta name="twitter:description" content={PAGE_META.description}/>
          <meta name="twitter:image" content={PAGE_META.imageUrl}/>
          <meta name="description" content={PAGE_META.description}/>
          <meta name="image" content={PAGE_META.imageUrl}/>
        </Head>
        <PageWrapper>
          <div className="custom-container">
            <div className="row">
              <div className="col">
                <Breadcrumbs items={BREADCRUMBS_ITEMS}/>
              </div>
            </div>
          </div>

          <section>
            <PageHeadings title={'Collections'}/>
          </section>


          {
            data
                ? (
                    <section className="mb-25">
                      <div className="custom-container">
                        <div className="row">
                          {
                            data?.data?.docs.map((collection: ICollection) => {
                              return (
                                  <div key={collection.collectionId}
                                       className="col-xxl-4 col-xl-4 col-lg-6 col-md-6 col-sm-6 col-12">
                                    <CollectionCardLarge collection={collection}/>
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
                    </section>
                )
                : (
                    <section className="mb-25">
                      <div className="custom-container">
                        <div className="row">
                          {
                            // @ts-ignore
                            [...Array(params.limit).keys()].map((item, index) => (
                                <div key={index} className="col-xxl-4 col-xl-4 col-lg-6 col-md-6 col-sm-6 col-12">
                                  <Skeleton height={520} mb={20} radius="lg"/>
                                </div>
                            ))
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

export default Collections;
