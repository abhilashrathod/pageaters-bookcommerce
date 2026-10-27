import React, {useEffect, useState} from 'react';
import Head from "next/head";
import {useRouter} from "next/router";
import styled from 'styled-components';
import useSWR from "swr";
import {Pagination, Skeleton} from "@mantine/core";
import {parseUrl, stringifyUrl} from "query-string";
import {Accordion} from "@mantine/core";

import PageWrapper from "../../components/elements/PageWrapper";
import EmptySectionMessage from "../../components/elements/FailedToLoad";

import BookBoxCardLarge from '../../components/cards/BookBoxCardLarge';
import SectionHeading from '../../components/elements/SectionHeading';

import { IBook } from '../../schemas/book';
import { MD, SM } from '../../core/_variables';

interface Props {
}

const PAGE_META = {
  imageUrl: 'https://pageaters-assets.s3.ap-south-1.amazonaws.com/BookishBoxes-main-hero-banner.jpg',
  description: 'Curated Adventures, Exclusive Treasures',
  title: 'Book Boxes | Pageaters',
  url: `${process.env.NEXT_PUBLIC_SITE_URL}/book-boxes`
};

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Book Boxes', isActive: true, href: ''},
];

const QuestionsSection = styled.section`
  background: #f9f9f9;
  padding: 5rem 0;
  margin: 5rem 0;
  
  @media screen and (max-width: ${MD - 1}px) {
    padding: 3.75rem 0;
    margin: 3.75rem 0;
  }
  
  @media screen and (max-width: ${SM - 1}px) {
    padding: 2.5rem 0;
    margin: 2.5rem 0;
  }
`;

const FAQS = [
  {
    title: 'What is Bookish Boxes?',
    description: `Bookish Boxes is a where we curate exclusive boxes around a specific book theme. Each box contains carefully selected books, custom-designed goodies, and unique treasures inspired by the theme.`
  },
  {
    title: 'How does it work?',
    description: `Bookish boxes are curated on demand and sold as a product, they're not a monthly subscription item, once purcahsed you'll receive a curated box at your doorstep. Inside, you'll find a handpicked gorgeous book, along with themed & exclusive merchandise and surprises.`,
  },
  {
    title: 'What can I expect in a typical box?',
    description: `Each box includes one amazing book & 5-7 carefully selected goodies, along with themed goodies such as bookmarks, art prints, collectibles, and more. The items are tailored to the theme of the month, creating a unique and immersive reading experience.`,
  },
  {
    title: 'Can I choose the book genre or book?',
    description: `We are/will offer a variety of genres and books, but part of the excitement is the surprise! Our expert curators select books that promise great reads and immersive experiences.`,
  },
  {
    title: 'Are the items in the box exclusive?',
    description: `Yes, all of the items in our Bookish Boxes are custom-designed and exclusive to our readers. You won't find them anywhere else!`,
  },
  {
    title: 'Is international shipping available?',
    description: `As of now, we're not offering international shipping`,
  },
  {
    title: 'What is the cost?',
    description: `The cost of each Bookish Box is calculated based on the retail value of the included book, the custom-designed and exclusive goodies, as well as the production and shipping expenses. Since every box features a different book and a unique set of themed items, the pricing may vary from box to box. Rest assured, we strive to offer you an exceptional value for your money, ensuring you get more than what you pay for in every box.`,
  }
]

const BookBoxes: React.FC<Props> = () => {
  const router = useRouter();

  const [params, setParams] = useState(() => {
    const {query} = parseUrl(router.asPath);
    return {
      page: Number(query.page) || 1,
      limit: 9,
    };
  });

  const {data, error} = useSWR({url: `/store-books?type=book_box`, args: {...params}});

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
          {/* <div className="custom-container">
            <div className="row">
              <div className="col">
                <Breadcrumbs items={BREADCRUMBS_ITEMS}/>
              </div>
            </div>
          </div>

          <section>
            <PageHeadings title={'Book Boxes'}/>
          </section> */}

          <section className="py-5">
            <div className="custom-container">
              <div className="row">
                <div className="col">
                  <h1 className="jumbo-1">Introducing <span className="text-accent">Bookish Boxes!</span></h1>
                  <h1 className="display-1">Enjoy the surprise of discovering incredible reads and exclusive treasures in each carefully curated box!</h1>
                </div>
              </div>
            </div>
          </section>


          {
            data
                ? (
                    <section className="mb-25">
                      <div className="custom-container">
                        <div className="row">
                          {
                            data?.data?.docs.map((book: IBook) => {
                              return (
                                  <div key={book.bookId}
                                       className="col-xxl-4 col-xl-4 col-lg-6 col-md-6 col-sm-6 col-12">
                                    <BookBoxCardLarge book={book}/>
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

<QuestionsSection>
            <div className={'container'}>
              <div className="row">
                <div className="col">
                  <SectionHeading sectionTitle={`FAQs`}/>
                </div>
              </div>
              <div className="row">
                <div className="col">
                  <Accordion variant="contained" chevronPosition="left" defaultValue="">
                    {
                      FAQS.map((item: any, index: number) => {
                        return (
                            <Accordion.Item key={index} value={index.toString()}>
                              <Accordion.Control>{item.title}</Accordion.Control>
                              <Accordion.Panel>
                                <p>
                                  {item.description}
                                </p>
                              </Accordion.Panel>
                            </Accordion.Item>
                        )
                      })
                    }
                  </Accordion>
                </div>
              </div>
            </div>
          </QuestionsSection>


        </PageWrapper>
      </>
  )
};

export default BookBoxes;
