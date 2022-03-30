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
import DealsCardLarge from "../../components/cards/DealsCardLarge";

import {IDeal} from "../../schemas/deal";

interface Props {
}

const PAGE_META = {
  imageUrl: 'https://pageaters-assets.s3.ap-south-1.amazonaws.com/categories-1.jpg',
  description: 'Explore the latest best deals, discounts and holiday treats at Pageaters',
  title: 'Best Deals, Discounts & Holiday Treats | Pageaters',
  url: `${process.env.NEXT_PUBLIC_SITE_URL}/deals`
};

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Deals', isActive: true, href: ''},
];

const Deals: React.FC<Props> = () => {
  const router = useRouter();

  const [params, setParams] = useState(() => {
    const {query} = parseUrl(router.asPath);
    return {
      page: Number(query.page) || 1,
      limit: 9,
    };
  });

  const {data, error} = useSWR({url: `/deals`, args: {...params}});

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
            <PageHeadings title={'Deals & Discounts'}/>
          </section>


          {
            data
                ? (
                    <section className="mb-25">
                      <div className="custom-container">
                        <div className="row">
                          {
                            data?.data?.docs.map((deal: IDeal) => {
                              return (
                                  <div key={deal.dealId} className="col-xxl-4 col-xl-4 col-lg-6 col-sm-6col-12">
                                    <DealsCardLarge deal={deal}/>
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
                                <div key={index} className="col-xxl-4 col-xl-4 col-lg-6 col-sm-6 col-12">
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

export default Deals;
