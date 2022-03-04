import React, {useState} from 'react';
import Head from "next/head";
import {useRouter} from "next/router";
import useSWR from "swr";
import {Pagination, Skeleton} from "@mantine/core";
import {parseUrl, stringifyUrl} from "query-string";

import Breadcrumbs from "../../components/elements/Breadcrumbs";
import PageWrapper from "../../components/elements/PageWrapper";
import PageHeadings from "../../components/elements/PageHeadings";
import EmptySectionMessage from "../../components/elements/FailedToLoad";
import BundlesCardMedium from "../../components/cards/BundlesCardMedium";

import {IBundle} from "../../schemas/bundle";

interface Props {
}

const PAGE_META = {
  imageUrl: 'https://pageaters-assets.s3.ap-south-1.amazonaws.com/categories-1.jpg',
  description: 'Explore the latest best deals on book bundles that are high in value and low in price at Pageaters',
  title: 'Bundles | Pageaters',
  url: `${process.env.NEXT_PUBLIC_SITE_URL}/bundles`
};

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Bundles', isActive: true, href: ''},
];

const Bundles: React.FC<Props> = () => {
  const router = useRouter();

  const [params, setParams] = useState(() => {
    const {query} = parseUrl(router.asPath);
    return {
      page: Number(query.page) || 1,
      limit: 12,
      sortBy: 'priority',
      sortOrder: 'asc'
    };
  });

  const {data, error} = useSWR({url: `${process.env.NEXT_PUBLIC_BASE_PATH}/bundles`, args: {...params}});

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
          <meta name="viewport" content="initial-scale=1.0, width=device-width"/>
          <meta name="og:site_name" content="pageaters.com"/>
          <meta name="og:type" content="website"/>
          <meta name="twitter:card" content="summary"/>
          <meta name="twitter:site" content="@pageaters"/>
          <meta name="og:title" content={PAGE_META.title}/>
          <meta name="og:description" content={PAGE_META.description}/>
          <meta name="og:url" content={PAGE_META.url}/>
          <meta name="og:image" content={PAGE_META.imageUrl}/>
          <meta name="twitter:title" content={PAGE_META.title}/>
          <meta name="twitter:description" content={PAGE_META.description}/>
          <meta name="twitter:image" content={PAGE_META.imageUrl}/>
          <meta name="fb:pages" content="Pageaters-101873422124838"/>
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
            <PageHeadings title={'Bundles'}/>
          </section>


          {
            data
                ? (
                    <section className="mb-25">
                      <div className="custom-container">
                        <div className="row">
                          {
                            data?.docs.map((bundle: IBundle) => {
                              return (
                                  <div key={bundle.bundleId} className="col-xxl-3 col-lg-4 col-md-4 col-6">
                                    <BundlesCardMedium bundle={bundle}/>
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
                                <div key={index} className="col-xxl-3 col-lg-4 col-md-4 col-6">
                                  <Skeleton height={384} mb={20} radius="lg"/>
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

export default Bundles;
