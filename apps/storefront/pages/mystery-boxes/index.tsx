import React, {forwardRef, useEffect, useState} from "react";
import {NextPage} from "next";
import cookie from "js-cookie";
import {get} from 'lodash';
import {useRouter} from "next/router";

import PageWrapper from "../../components/elements/PageWrapper";

import {
  ACCENT_COLOR,
  AUTH_COOKIE,
  LIGHT_COLOR,
  LIGHTER_PRIMARY_COLOR,
  MD,
  PRIMARY_COLOR,
  PRIMARY_DANGER,
  PRIMARY_SUCCESS,
  SECONDARY_COLOR,
  SM
} from "../../core/_variables";
import Breadcrumbs from "../../components/elements/Breadcrumbs";
import styled from "styled-components";
import {getAssetImage} from "../../core/_imageRendererHelper";
import {Accordion, Alert, Group, Text, Textarea} from "@mantine/core";
import {currencyFormat, returnDiscountedAmount} from "../../core/_helpers";
import useSWR, {mutate} from "swr";
import {IMysteryBox} from "../../schemas/mystery-box";
import {Icon} from "@iconify/react";
import {showNotification} from "@mantine/notifications";
import axios from "axios";
import {addToCart} from "../../core/_analytics";
import SectionHeading from "../../components/elements/SectionHeading";

interface Props {

}

const ProductCoverSpace = styled.div`
  display: flex;
  justify-content: center;
`;

const ProductImage = styled.img`
  border-radius: 1.5rem;
  width: 450px;
  height: auto;
  border: 1px solid rgba(0, 0, 0, 0.2);
  box-shadow: rgb(0 0 0 / 18%) 0 2px 4px 0;
  
  @media screen and (max-width: ${SM - 1}px) {
     width: 230px;
  }
`;

const ProductTitle = styled.h1`
  font-size: 2rem;
  letter-spacing: 0;
  
  @media screen and (max-width: ${SM - 1}px) {
    font-size: 1.5rem;
  }
`;


const ProductDescription = styled.div`
  white-space: pre-wrap;
`;

const ProductPreferences = styled.div`
  margin-bottom: 2.25rem;
  font-weight: 600;
  color: ${PRIMARY_COLOR};
`;

const ProductNotes = styled.div`
  margin-bottom: 2.25rem;  
`;

const ProductPricing = styled.div`
  font-weight: 600;
  font-size: 2rem;
  margin-bottom: 1.25rem;  
  
  @media screen and (max-width: ${SM - 1}px) {
    font-size: 1.5rem;
  }
`;

const Crossed = styled.span`
  margin-right: 0.5rem;
  text-decoration: line-through;
  color: ${LIGHT_COLOR};
`;

const ProductDiscount = styled.span`
  margin-bottom: 0.25rem;
  font-weight: 600;
  font-size: 1rem;
  color: ${PRIMARY_SUCCESS};
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

const AddToCartSpace = styled.div`
  margin-bottom: 2.5rem;
  display: flex;
  align-items: center;
  
  @media screen and (max-width: ${SM - 1}px) {
    justify-content: space-evenly;
  }
`;

const AddToCartButton = styled.button`
  font-size: 1.5rem;
  line-height: 1.536rem;
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
    letter-spacing: -0.5px;
    font-size: 1.2rem;
    padding: 0.825rem 2rem;
    line-height: 1.2rem;
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
  width: 15%;

  &:hover {
    background-color: #eee;
  }

  @media screen and (max-width: ${SM - 1}px) {
    font-size: 1.2rem;
    padding: 0.5rem 1rem;
    width: 33%;
  }
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

const BREADCRUMB_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Mystery Boxes', href: '', isActive: true,},
];

interface ItemProps extends React.ComponentPropsWithoutRef<'div'> {
  label: string;
  description: string;
}

const SelectItem = forwardRef<HTMLDivElement, ItemProps>(
    ({label, description, ...others}: ItemProps, ref) => (
        <div ref={ref} {...others}>
          <Group noWrap>
            <div>
              <Text size="sm">{label}</Text>
              <Text size="xs" color="dimmed">{description}</Text>
            </div>
          </Group>
        </div>
    )
);

const AddToCart = (props: any) => {
  const [quantity, setQuantity] = useState(1);

  function handleAddCart() {
    props.onClick();
  }

  function handleSelection(e: any) {
    setQuantity(Number(e.target.value));
    props.handleBoxSelect(e.target.value);
  }

  return (
      <>
        <QuantitySelectLabel>Box Size</QuantitySelectLabel>
        <QuantitySelection value={quantity} onChange={handleSelection}>
          {
            props.options.map((option: any) => <option key={option._id} value={option.books}>{option.books} Books</option>)
          }
        </QuantitySelection>
        <AddToCartButton onClick={handleAddCart}>Add to Cart</AddToCartButton>
      </>
  )
};

const MysteryBoxes: NextPage<Props> = () => {
  const isLoggedIn = cookie.get(AUTH_COOKIE);
  const router = useRouter();

  const {data, error} = useSWR({
    url: `/mystery-boxes?page=1&limit=6`,
  });

  const [pref, setPref] = useState('');
  const [selectedBox, setSelectedBox] = useState<IMysteryBox | null>(null);
  // preferences
  const [ignoredBooks, setIgnoredBooks] = useState('');
  const [favoriteBooks, setFavoriteBooks] = useState('');
  const [preferredGenres, setPreferredGenres] = useState('');
  const [preferredAuthors, setPreferredAuthors] = useState('');

  function renderImageSize(w: number, h: number) {
    return getAssetImage('categories-1.jpg', {height: h, width: w, fit: 'cover'});
  }

  const boxes = get(data, 'data.docs', []);

  function handleAccordionChange(e: any) {
    setPref(e);
  }

  function handleBoxSelection(e: any) {
    const box = boxes.find((item: any) => item.books.toString() === e.toString());
    setSelectedBox(box);
  }

  async function handleAddToCart() {
    const payload = {
      box: get(selectedBox, '_id', ''),
      preferences: {
        preferredAuthors,
        preferredGenres,
        ignoredBooks,
        favoriteBooks,
      }
    };

    // console.log("payload", payload);
    if (!isLoggedIn) {
      return showNotification({message: 'Please login to continue shopping', color: 'orange', autoClose: 5000});
    }
    try {
      await axios.post(`/cart/add/box`, payload, {withCredentials: true});
      addToCart(selectedBox, 1, 'mystery_box', 'Mystery Box'); // analytics event
      showNotification({message: 'Box Added to Cart', color: 'green', autoClose: 3000});
      updateCart();
    } catch (e: any) {
      showNotification({message: e.message, color: 'red', autoClose: 5000});
    }
  }

  function updateCart() {
    mutate({url: `/cart/retrieve`, withCredentials: true});
  }

  useEffect(() => {
    if (boxes.length > 0 && !selectedBox) {
      setSelectedBox(boxes[0]);
    }
  }, [boxes]);

  return (
      <>
        <PageWrapper>
          <div className="custom-container">
            <div className="row">
              <div className="col">
                <Breadcrumbs items={BREADCRUMB_ITEMS}/>
              </div>
            </div>
          </div>
          <section className={'py-25'}>
            <div className="custom-container">
              <div className="row">
                <div className="col-xxl-4 col-xl-4 col-12">
                  <ProductCoverSpace>
                    <ProductImage src={renderImageSize(500, 500)} alt={'Mystery Box'} width={500} height={'auto'}/>
                  </ProductCoverSpace>
                </div>

                <div className="col-xxl-8 col-xl-8 col-12">
                  <div>
                    <>
                      <ProductTitle>
                        Mystery Box | {selectedBox?.title}
                      </ProductTitle>
                    </>
                    <ProductDescription>
                      <p>{selectedBox?.description}</p>
                    </ProductDescription>

                    <ProductPreferences>
                      <h6>Mystery Box Preferences</h6>
                      <Accordion
                          value={pref}
                          onChange={handleAccordionChange}
                          sx={{maxWidth: 500}}
                          radius="md"
                          chevronPosition="left"
                          defaultValue="ignored"
                          chevron={<Icon icon={'bx:plus'} width={16} height={16}/>}
                          styles={{
                            label: {fontSize: '1rem'},
                            item: {fontSize: '1rem'},
                            chevron: {'&[data-rotate]': {transform: 'rotate(45deg)'}},
                          }}
                      >
                        <Accordion.Item value={'ignored'}>
                          <Accordion.Control>Books you already have (optional)</Accordion.Control>
                          <Accordion.Panel>
                            <Textarea
                                placeholder="So, that we don't add the books which you already have."
                                label=""
                                value={ignoredBooks}
                                onChange={(event) => setIgnoredBooks(event.currentTarget.value)}
                                styles={{
                                  input: {
                                    fontWeight: 400
                                  }
                                }}
                                autosize
                                minRows={3}
                            />
                          </Accordion.Panel>
                        </Accordion.Item>
                        <Accordion.Item value={'books'}>
                          <Accordion.Control>Books you like (optional)</Accordion.Control>
                          <Accordion.Panel>
                            <Textarea
                                placeholder="So, that we can understand your taste and better select the ones you could like. Please add upto 5 books for best results"
                                label=""
                                value={favoriteBooks}
                                onChange={(event) => setFavoriteBooks(event.currentTarget.value)}
                                styles={{
                                  input: {
                                    fontWeight: 400
                                  }
                                }}
                                autosize
                                minRows={3}
                            />
                          </Accordion.Panel>
                        </Accordion.Item>
                        <Accordion.Item value={'genre'}>
                          <Accordion.Control>Your Fav Genre (optional)</Accordion.Control>
                          <Accordion.Panel>
                            <Textarea
                                placeholder="So that we can recommend books based on this or similar"
                                label=""
                                value={preferredGenres}
                                onChange={(event) => setPreferredGenres(event.currentTarget.value)}
                                styles={{
                                  input: {
                                    fontWeight: 400
                                  }
                                }}
                                autosize
                                minRows={3}
                            />
                          </Accordion.Panel>
                        </Accordion.Item>
                        <Accordion.Item value={'authors'}>
                          <Accordion.Control>Your Fav Authors (optional)</Accordion.Control>
                          <Accordion.Panel>
                            <Textarea
                                placeholder="So, that we understand and match you with that author's books or authors similar to them"
                                label=""
                                value={preferredAuthors}
                                onChange={(event) => setPreferredAuthors(event.currentTarget.value)}
                                styles={{
                                  input: {
                                    fontWeight: 400
                                  }
                                }}
                                autosize
                                minRows={3}
                            />
                          </Accordion.Panel>
                        </Accordion.Item>
                      </Accordion>
                    </ProductPreferences>

                    <ProductPricing>
                      <Crossed>{currencyFormat(selectedBox?.price || 0)}</Crossed>
                      <span>{currencyFormat(returnDiscountedAmount(selectedBox?.price || 0, selectedBox?.currentDiscount || 0))}</span>
                      <ProductDiscount>&nbsp;({selectedBox?.currentDiscount}% Off)</ProductDiscount>
                    </ProductPricing>

                    <AddToCartSpace>
                      <AddToCart options={boxes}
                                 handleBoxSelect={handleBoxSelection}
                                 onClick={handleAddToCart}>Add to Cart</AddToCart>
                    </AddToCartSpace>


                    <ProductNotes>
                      <Alert title="Things to Note" color="gray">
                        <p>
                          • We save your preferences as a set of guidelines for better experience. It doesn't necessarily mean that you're going to get the exact books that you mentioned.
                        </p>
                        <p>
                          • Mystery box would consist of pre-owned books that can range from almost new to readable. It would be made sure that your reading experience isn't compromised.
                        </p>
                      </Alert>
                    </ProductNotes>
                  </div>
                </div>
              </div>
            </div>
          </section>
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
                    <Accordion.Item value="1">
                      <Accordion.Control>What is Mystery Box?</Accordion.Control>
                      <Accordion.Panel>
                        <p>
                          Mystery Box is one the best ways to discover new books, push yourself out of your comfirt zone
                          and read books which otherwise you would never read. When you buy our Mystery box you can
                          select whichever many books you want and provide preferences (which are optional). We would
                          curate 5-15 books based on your taste, box them up and they would be on your way. It's like
                          going on a blind date but with books! 😄
                        </p>
                      </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value="2">
                      <Accordion.Control>What would be the quality and condition of the books?</Accordion.Control>
                      <Accordion.Panel>
                        <p>
                          The books which are selected as a part of mystery box are mostly pre-loved books ranging from
                          almost new to slightly used. We would make sure that you get the best possible quality of the
                          books. We also make sure it's integrity and hand-check them before shipping them to you. Rest
                          assured.
                        </p>
                      </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value="3">
                      <Accordion.Control>Can I choose the books I want?</Accordion.Control>
                      <Accordion.Panel>
                        <p>
                          Well, to be honest the whole point of mystery box is that you won't get to choose the books,
                          however, in order to make sure that even if you're not picking your books you would atleast
                          get books based on your preferences(which are optional) so that you atleast get the books you
                          might be interested in. We would include a healthy mix of best written and most loved books by
                          default. But, we would highly appreciate to include as much information as possible in those
                          fields.
                        </p>
                      </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value="4">
                      <Accordion.Control>What are the shipping charges?</Accordion.Control>
                      <Accordion.Panel>
                        <p>
                          Standard shipping policy would apply on the shopping of mystery box. <br/> Free shipping above
                          order value of INR 499
                        </p>
                      </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value="5">
                      <Accordion.Control>Can I replace/return the books I've gotten?</Accordion.Control>
                      <Accordion.Panel>
                        <p>
                          The mystery boxes by nature can't be replaced or returned. Unless, it's an exceptional case.
                        </p>
                      </Accordion.Panel>
                    </Accordion.Item>

                  </Accordion>
                </div>
              </div>
              {/*<div className="row">*/}
              {/*  <div className="col">*/}
              {/*    <div className="col">*/}
              {/*      <AppIconButton variant={ButtonVariants.Secondary} onClick={() => console.log(1)}>*/}
              {/*        some*/}
              {/*      </AppIconButton>*/}
              {/*    </div>*/}
              {/*  </div>*/}
              {/*</div>*/}
            </div>
          </QuestionsSection>
        </PageWrapper>
      </>
  );
};

export default MysteryBoxes;
