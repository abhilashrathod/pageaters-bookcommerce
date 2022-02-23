import React from 'react';
import Head from "next/head";
import Breadcrumbs from "../../components/elements/Breadcrumbs";
import PageWrapper from "../../components/elements/PageWrapper";
import PageHeadings from "../../components/elements/PageHeadings";
import {useRouter} from "next/router";
import useSWR from "swr";
import CategoryCardLarge from "../../components/cards/CategoryCardLarge";
import {ICategory} from "../../schemas/category";
import {Skeleton} from "@mantine/core";

interface Props {
}

const PAGE_META = {
  imageUrl: 'https://pageaters-assets.s3.ap-south-1.amazonaws.com/categories-1.jpg',
  description: 'Explore the latest best sellers, award winners, new releases, and coming soon books at Pageaters',
  title: 'Categories | Pageaters',
  url: `${process.env.NEXT_PUBLIC_SITE_URL}/categories`
};

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Categories', isActive: true, href: ''},
];

const Categories: React.FC<Props> = () => {
  const router = useRouter();

  const {data, error} = useSWR({url: `${process.env.NEXT_PUBLIC_BASE_PATH}/categories`, args: {page: 1, limit: 25}});

  if (error) return <div>failed to load</div>;

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
            <PageHeadings title={'Categories'}/>
          </section>

          <section className="mb-25">
            <div className="custom-container">
              <div className="row">
                {
                  data
                      ? data?.data?.docs.map((category: ICategory) => {
                        return (
                            <div key={category.categoryId} className="col-xxl-3 col-lg-4 col-md-4 col-6">
                              <CategoryCardLarge category={category}/>
                            </div>
                        )
                      })
                      : [0, 0, 0, 0, 0, 0, 0, 0].map((item, index) => (
                          <div key={index} className="col-xxl-3 col-lg-4 col-md-4 col-6">
                            <Skeleton height={400} radius="lg" mb={25}/>
                          </div>
                      ))
                }
              </div>
            </div>
          </section>
        </PageWrapper>
      </>
  )
};

export default Categories;
