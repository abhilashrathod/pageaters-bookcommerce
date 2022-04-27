import React, {useState} from "react";
import {GetStaticPaths, GetStaticProps, InferGetStaticPropsType, NextPage} from "next";
import axios from "axios";
import useSWR, {mutate} from "swr";
import Head from "next/head";
import {useRouter} from "next/router";
import {Alert, Spoiler} from '@mantine/core';
import {useClipboard} from "@mantine/hooks";
import {useNotifications} from "@mantine/notifications";
import {Icon} from "@iconify/react";
import styled from "styled-components";
import cookie from "js-cookie";

import Breadcrumbs from "../../components/elements/Breadcrumbs";
import PageWrapper from "../../components/elements/PageWrapper";
import EmptySectionMessage from "../../components/elements/FailedToLoad";
import SectionHeading from "../../components/elements/SectionHeading";
import ProductCardLandScape from "../../components/cards/ProductCardLandscape";
import BundlesCardMedium from "../../components/cards/BundlesCardMedium";
import CollectionCardSmall from "../../components/cards/CollectionCardSmall";
import {ButtonVariants} from "../../components/form-controls/Button";
import AppIconButton from "../../components/form-controls/IconButton";
import Badges from "../../components/elements/Badge";

import {
  ACCENT_COLOR,
  AUTH_COOKIE,
  LIGHT_COLOR,
  LIGHTER_PRIMARY_COLOR,
  LIGHTEST_PRIMARY_COLOR,
  PRIMARY_DANGER,
  PRIMARY_SUCCESS,
  SECONDARY_COLOR,
  SM
} from "../../core/_variables";
import {getProductImage} from "../../core/_imageRendererHelper";
import {currencyFormat, returnDiscountedAmount, returnReadingHours} from "../../core/_helpers";

import {IBundle} from "../../schemas/bundle";
import {IBook} from "../../schemas/book";
import {ICollection} from "../../schemas/collection";
import {ICategory} from "../../schemas/category";

import useAuth from "../../hooks/useAuth";


const BREADCRUMBS_ITEMS = (activeItem: any) => [
  {title: 'Home', href: '/'},
  {title: activeItem.title, isActive: true, href: '/'},
];

const SITE_FEATURES = [
  {icon: 'carbon:delivery-truck', title: 'Free Delivery', description: 'On Orders Above INR 300'},
  {icon: 'bi:award', title: 'Genuine Books', description: 'No Piracy. No First Copies.'},
  {
    icon: 'grommet-icons:insecure',
    title: 'Secure Payments',
    description: 'Debit & Credit Cards, Net Banking, UPIs, Wallets'
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
  margin-bottom: 0;
`;

const ProductDescription = styled.div`
  margin-bottom: 1.25rem;
  white-space: pre-wrap;
`;

const ProductSavings = styled.span`
  margin-bottom: 0.25rem;
  font-weight: 600;
  font-size: 1rem;
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

const ProductButton = styled.button`
  font-size: 1.5rem;
  line-height: 1.5rem;
  background-color: ${ACCENT_COLOR};
  color: ${SECONDARY_COLOR};
  letter-spacing: -1px;
  padding: 1rem 2.5rem;
  border-radius: 0.5rem;
  font-weight: normal;
  margin-left: 1.25rem;
  box-shadow: 0 2px 10px 0 rgb(0 0 0 / 16%);
  
  &:hover {
    color: ${SECONDARY_COLOR};
    background: ${LIGHTER_PRIMARY_COLOR};
  }
  
  @media screen and (max-width: ${SM - 1}px) {
    margin-left: 0.5rem;
    font-size: 1.2rem;
    padding: 0.825rem 2rem;
    line-height: 1.2rem;
  }
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

const SuggestionButtons = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
`;

const ProductAuthor = styled.div`
  margin-bottom: 0.25rem;
`;

const SubtitleText = styled.span`
  color: ${LIGHTER_PRIMARY_COLOR};
`;
const AuthorText = styled.span`
  color: ${ACCENT_COLOR};  
`;

const ProductBadges = styled.div`
  margin-bottom: 1.25rem;
`;

const QuantitySelectLabel = styled.label`
  display: inline-flex;
  align-items: center;
  font-size: 1.5rem;
  margin-right: 0.825rem;
  margin-bottom: 0;
  
  @media screen and (max-width: ${SM - 1}px) {
   margin-right: 0.5rem;
   font-size: 1.2rem;
  }  
`;

const OutOfStockLabel = styled.label`
  display: inline-flex;
  align-items: center;
  font-size: 1.5rem;
  color: ${PRIMARY_DANGER};
  margin-right: 0.825rem;
  margin-bottom: 0;
  
  @media screen and (max-width: ${SM - 1}px) {
   margin-right: 0.5rem;
   font-size: 1.2rem;
  }
`;

const QuantitySelection = styled.select`
  font-size: 1.5rem;
  line-height: 1.5rem;
  border: 2px solid #222;
  letter-spacing: -1px;
  padding: 0.85rem 1.3rem;
  border-radius: 0.5rem;
  margin: 0;
  width: 10%;

  &:hover {
    background-color: #eee;
  }

  @media screen and (max-width: ${SM - 1}px) {
    font-size: 1.2rem;
    padding: 0.5rem 1rem;
    width: 20%;
  }
`;

const ProductCategories = styled.div`
  margin-bottom: 1.25rem;
`;

const CategoryName = styled.span`
  color: ${ACCENT_COLOR};
  font-weight: 600;
  cursor: pointer;
  margin-left: 0.5rem;
`;

const ProductDetailSpec = styled.div`
  display: flex;
  flex-direction: row;
`;
const SpecIcon = styled.div`
  min-width: 3.25rem;
  display: inline-flex;
  justify-content: center;
  align-items: center;
`;
const SpecContent = styled.div`
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
`;
const SpecProp = styled.span`
  font-size: 0.825rem;
`;
const SpecValue = styled.span`
  font-weight: 600;
`;

interface Props {
  book: IBook;
}

interface SpecProps {
  icon: string;
  prop: string;
  value: string | number | undefined;
}

const ProductSpecification = ({icon, prop, value}: SpecProps) => {
  return (
      <ProductDetailSpec>
        <SpecIcon>
          <Icon icon={icon} height={36} width={36}/>
        </SpecIcon>
        <SpecContent>
          <SpecProp>
            {prop}
          </SpecProp>
          <SpecValue>
            {value}
          </SpecValue>
        </SpecContent>
      </ProductDetailSpec>
  )
};

const AddToCart = ({product}: any) => {
  const isLoggedIn = cookie.get(AUTH_COOKIE);

  const [quantity, setQuantity] = useState(1);
  const notif = useNotifications();

  async function handleAddCart() {
    if (!isLoggedIn) {
      return notif.showNotification({message: 'Please login to continue shopping', color: 'orange', autoClose: 5000});
    }
    try {
      await axios.post(`/cart/add`, {quantity, product}, {withCredentials: true});
      notif.showNotification({message: 'Book Added to Cart', color: 'green', autoClose: 3000});
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
        <QuantitySelectLabel>Quantity</QuantitySelectLabel>
        <QuantitySelection value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}>
          <option value={1}>1</option>
          <option value={2}>2</option>
        </QuantitySelection>
        <ProductButton onClick={handleAddCart}>Add to Cart</ProductButton>
      </>
  )
};

const NotifyMe = ({product}: any) => {
  const notif = useNotifications();

  async function handleNotify() {
    try {
      await axios.post(`/stock-alerts`, {product}, {withCredentials: true});
      notif.showNotification({message: 'We will notify you when it is back', color: 'green', autoClose: 3000});
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 5000});
    }
  }

  return (
      <>
        <OutOfStockLabel>Out of Stock</OutOfStockLabel>
        <ProductButton onClick={handleNotify}>Notify Me</ProductButton>
      </>
  )
};

const BookWishlist = ({product}: any) => {
  const auth = useAuth();
  const notif = useNotifications();

  const {data} = useSWR({url: auth ? `/favorites/${product}` : null, withCredentials: true});

  async function toggleWishlist() {
    if (data?.data) {
      removeFromWishlist();
    } else {
      addToWishlist();
    }
  }

  async function addToWishlist() {
    try {
      await axios.post(`/favorites`, {product}, {withCredentials: true});
      notif.showNotification({message: 'Book Added to Wishlist', color: 'green', autoClose: 3000});
      mutate({url: `/favorites/${product}`, withCredentials: true});
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 5000});
    }
  }

  async function removeFromWishlist() {
    try {
      await axios.delete(`/favorites/${product}`, {withCredentials: true});
      notif.showNotification({message: 'Book Removed from Wishlist', color: 'green', autoClose: 3000});
      mutate({url: `/favorites/${product}`, withCredentials: true});
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 5000});
    }
  }

  return (
      <AppIconButton variant={data?.data ? ButtonVariants.Danger : ButtonVariants.Secondary} onClick={toggleWishlist}>
        <Icon icon={'bx:bx-heart'} width={18} height={18}/>&nbsp; {data?.data ? 'Wishlisted' : 'Wishlist'}
      </AppIconButton>
  )
};

const BookDetails: NextPage<Props> = ({book}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const router = useRouter();
  const auth = useAuth();
  const clipboard = useClipboard({timeout: 500});

  if (router.isFallback) return <PageWrapper><EmptySectionMessage title={'Loading...'}/></PageWrapper>;

  function renderImageSize(w: number, h: number) {
    return getProductImage(book.poster, {height: h, width: w, fit: 'cover'});
  }

  function share() {
    clipboard.copy(`${process.env.NEXT_PUBLIC_SITE_URL}/books/${book.bookId}`);
  }

  return (
      <>
        <Head>
          <title>{`Buy ${book.title} ${book.tagline} Book Online at Best Prices in India | Pageaters`}</title>

          <meta name="og:site_name" content="pageaters.com"/>
          <meta name="og:type" content="website"/>
          <meta name="twitter:card" content="summary"/>
          <meta name="twitter:site" content="@pageaters"/>

          <meta name="og:title"
                content={`Buy ${book.title} ${book.tagline} Book Online at Best Prices in India | Pageaters`}/>
          <meta name="twitter:title"
                content={`Buy ${book.title} ${book.tagline} Book Online at Best Prices in India | Pageaters`}/>

          <meta name="image" content={`${renderImageSize(300, 450)}`}/>
          <meta name="og:image" content={`${renderImageSize(300, 450)}`}/>
          <meta name="twitter:image" content={`${renderImageSize(300, 450)}`}/>

          <meta name="og:description" content={book.description}/>
          <meta name="twitter:description" content={book.description}/>
          <meta name="description" content={book.description}/>

          <meta name="og:url" content={`${process.env.NEXT_PUBLIC_SITE_URL}/books/${book.bookId}`}/>

          <meta name="fb:pages" content="Pageaters-101873422124838"/>
          <meta name="viewport" content="initial-scale=1.0, width=device-width"/>

          <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "http://schema.org",
                  "@type": 'Product',
                  name: `${book.title} - ${book.tagline}`,
                  description: book.description,
                  url: `${process.env.NEXT_PUBLIC_SITE_URL}/books/${book.bookId}`,
                  image: [renderImageSize(300, 450)],
                  sku: book.bookId,
                  brand: {
                    "@type": "Brand",
                    "name": book.publisher
                  },
                  offers: {
                    "@type": "AggregateOffer",
                    offerCount: 1,
                    lowPrice: returnDiscountedAmount(book.price, book.currentDiscount),
                    highPrice: book.price,
                    priceCurrency: "INR"
                  }
                }),
              }}
          />
        </Head>
        <PageWrapper>
          <div className="container">
            <div className="row">
              <div className="col">
                <Breadcrumbs items={BREADCRUMBS_ITEMS({title: book.title})}/>
              </div>
            </div>
          </div>
          <section className={'py-25'}>
            <div className="container">
              <div className="row">
                <div className="col-xxl-4 col-xl-4 col-12">
                  <ProductCoverSpace>
                    <ProductImage src={renderImageSize(300, 450)} alt={book.title} width={300} height={'auto'}/>
                  </ProductCoverSpace>
                  <TagsSpace>
                    <TagsList>
                      {
                        book.tags.map((tag: string, index: number) => <Tag key={index}>{tag}</Tag>)
                      }
                    </TagsList>
                  </TagsSpace>
                  <SuggestionButtons>
                    {auth && <BookWishlist product={book._id}/>}
                    <AppIconButton variant={clipboard.copied ? ButtonVariants.Accent : ButtonVariants.Secondary}
                                   onClick={share}>
                      <Icon icon={'bx:share-alt'} width={18} height={18}/>&nbsp;{clipboard.copied ? 'Link Copied' : 'Share'}
                    </AppIconButton>
                  </SuggestionButtons>
                </div>

                <div className="col-xxl-8 col-xl-8 col-12">
                  <div>
                    <ProductTitle>
                      {book.title} {book.tagline && `(${book.tagline})`}
                    </ProductTitle>
                    <ProductAuthor>
                      <h6>
                        <SubtitleText>by&nbsp;</SubtitleText>
                        <AuthorText>{book?.author?.name}</AuthorText>
                      </h6>
                    </ProductAuthor>
                    <ProductBadges>
                      {book.editorsPick && <Badges text={book.editorsPick ? 'Editor\'s Pick' : ''} color={'accent'}/>}
                      {book.bestSeller && <Badges text={book.bestSeller ? 'Best Seller' : ''} color={'primary'}/>}
                    </ProductBadges>

                    <ProductDescription>
                      <Spoiler maxHeight={110}
                               styles={{
                                 control: {boxShadow: 'none', fontSize: '1rem', color: LIGHTEST_PRIMARY_COLOR}
                               }}
                               showLabel="[Read more]"
                               hideLabel="[Read Less]">
                        <p>{book.description}</p>
                      </Spoiler>
                    </ProductDescription>

                    <ProductPricing>
                      {book.currentDiscount > 0 && <Crossed>{currencyFormat(book.price)}</Crossed>}

                      {
                        book.currentDiscount > 0
                            ? <span>{currencyFormat(returnDiscountedAmount(book.price, book.currentDiscount))}</span>
                            : <span>{currencyFormat(book.price)}</span>
                      }

                      {book.currentDiscount > 0 && <ProductSavings>&nbsp;({book.currentDiscount}% Off)</ProductSavings>}
                    </ProductPricing>

                    <AddToCartSpace>
                      {
                        book.inventory > 0
                            ? <AddToCart product={book._id}/>
                            : <NotifyMe product={book._id}/>
                      }
                    </AddToCartSpace>

                    <ProductCategories>
                      <Alert title="Shipping" color="gray">
                        Standard Shipping: 3-5 Days
                      </Alert>
                    </ProductCategories>

                    <ProductCategories>
                      <span>Categories:</span>
                      {
                        book.categories.map((category: ICategory) => <CategoryName
                            onClick={() => router.push(`/categories/${category.categoryId}`)}
                            key={category._id}>{category.title}</CategoryName>)
                      }
                    </ProductCategories>

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
                  <SectionHeading sectionTitle={'Book Specifications'}/>
                </div>
              </div>
              <div className="row">
                <div className="col-xxl-3 col-xl-3 col-6">
                  <ProductSpecification
                      value={book.version}
                      prop={'Version'}
                      icon={'iconoir:remove-page'}/>
                </div>
                <div className="col-xxl-3 col-xl-3 col-6">
                  <ProductSpecification
                      value={`${book.pages} Pages | ${returnReadingHours(book.pages)}`}
                      prop={'Pages'}
                      icon={'ant-design:copy-outlined'}/>
                </div>
                <div className="col-xxl-3 col-xl-3 col-6">
                  <ProductSpecification
                      value={book.readingLevel}
                      prop={'Reading Level'}
                      icon={'ant-design:read-outlined'}/>
                </div>
                <div className="col-xxl-3 col-xl-3 col-6">
                  <ProductSpecification
                      value={book.language}
                      prop={'Language'}
                      icon={'carbon:translate'}/>
                </div>
                <div className="col-xxl-3 col-xl-3 col-6">
                  <ProductSpecification
                      value={book.ISBN}
                      prop={'ISBN'}
                      icon={'eva:hash-fill'}/>
                </div>
                <div className="col-xxl-3 col-xl-3 col-6">
                  <ProductSpecification
                      value={book.publisher}
                      prop={'Publication'}
                      icon={'clarity:building-line'}/>
                </div>
                <div className="col-xxl-3 col-xl-3 col-6">
                  <ProductSpecification
                      value={book.publicationYear}
                      prop={'Publication Year'}
                      icon={'ant-design:calendar-twotone'}/>
                </div>
                <div className="col-xxl-3 col-xl-3 col-6">
                  <ProductSpecification
                      value={`${book.dimensions + ' CM'} | ${book.weight + ' GRAMS'}`}
                      prop={'Specs'}
                      icon={'radix-icons:dimensions'}/>
                </div>
              </div>
            </div>
          </section>
          {
            book.relatedBooks.length > 0 && (
                <section className="mb-25">
                  <div className="custom-container">
                    <div className="row">
                      <div className="col">
                        <SectionHeading sectionTitle={'Related Books'}/>
                      </div>
                      <div className="row">
                        {
                          book.relatedBooks.map((book: IBook) => {
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
            )
          }
          {
            book.relatedBundles.length > 0 && (
                <section className="mb-25">
                  <div className="custom-container">
                    <div className="row">
                      <div className="col">
                        <SectionHeading sectionTitle={'Suggested Bundles'}/>
                      </div>
                      <div className="row">
                        {
                          book.relatedBundles.map((bundle: IBundle) => {
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
            book.relatedCollections.length > 0 && (
                <section className="mb-25">
                  <div className="custom-container">
                    <div className="row">
                      <div className="col">
                        <SectionHeading sectionTitle={'Related Collections'}/>
                      </div>
                      <div className="row">
                        {
                          book.relatedCollections.map((collection: ICollection) => {
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
  const promise$ = await axios.get(`/store-books`, {
    params: {
      limit: 100,
      page: 1,
      sortBy: 'priority',
      sortOrder: 'asc'
    }
  });
  const {data} = await promise$.data;

  const paths = data.docs.map((doc: IBook) => {
    return {params: {id: doc.bookId}}
  });

  return {
    paths,
    fallback: true
  };
};

export const getStaticProps: GetStaticProps = async (context) => {
  const id = context?.params?.id;

  const promise$ = await axios.get(`/store-books/unique/${id}`);
  const {data} = await promise$.data;

  return {
    props: {
      book: data
    }
  }
};

export default BookDetails;

