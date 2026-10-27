import React, {useState} from "react";
import styled from "styled-components";
import {Pagination, Accordion, Skeleton} from "@mantine/core";
import { Icon } from "@iconify/react";
import moment from "moment";
import { get, startCase } from "lodash";
import cookie from "js-cookie";
import useSWR, { mutate } from "swr";
import Head from "next/head";
import Link from "next/link";

import PageWrapper from "../../components/elements/PageWrapper";
import EmptySectionMessage from "../../components/elements/FailedToLoad";
import EmptyMessageWithGraphic from "../../components/elements/EmptyMessageWithGraphic";
import SectionHeading from "../../components/elements/SectionHeading";
import Breadcrumbs from "../../components/elements/Breadcrumbs";
import PageHeadings from "../../components/elements/PageHeadings";

import TransactionHistory from "../../public/illustrations/transaction-history.svg";

import {
  ACCENT_COLOR,
  AUTH_COOKIE,
  LIGHTEST_PRIMARY_COLOR,
  MD,
  PRIMARY_DANGER,
  PRIMARY_SUCCESS,
  SM,
} from "../../core/_variables";
import { currencyFormat } from "../../core/_helpers";

import { ICreditTransaction } from "../../schemas/credit-transaction";
import {parseUrl} from "query-string";
import {func} from "prop-types";


const BREADCRUMBS_ITEMS = [
  { title: "Home", href: "/" },
  { title: "Account", href: "/account" },
  { title: "Store Credit", href: "/account/store-credit", isActive: true },
];

interface Props {}

const TransactionListItem = styled.div`
  background-color: #fff;
  position: relative;
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 1em 0.5em;
  list-style: none; // Remove arrow
  &::-webkit-details-marker {
    display: none; // Remove arrow
  }

  &:hover {
    background-color: #f2f5f9;
  }
`;

const IconSpace = styled.div`
  width: 4rem;
  height: 4rem;
  border-radius: 10px;
  background-color: ${({ color }) =>
    color === "DEBIT" ? PRIMARY_DANGER : PRIMARY_SUCCESS};
  display: flex;
  color: #fff;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  margin-right: 1.25em;
`;

const ContentSpace = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  align-items: center;
`;

const Info = styled.div`
  display: flex;
  flex-direction: column;
`;
const Amount = styled.div`
  font-weight: 600;
  margin-left: auto;
`;

const InfoTitle = styled.span`
  font-weight: 600;
`;
const InfoDescription = styled.span`
  color: ${LIGHTEST_PRIMARY_COLOR};
  font-size: 0.825rem;
`;

const StoreCreditAmount = styled.div`
  height: 400px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 3rem;
  color: #ff5f25;
  border-radius: 1.5rem;
  margin-bottom: 1.4rem;
  background-color: rgba(255, 95, 37, 0.1);
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

const LoadingItem = () => (
    <div className="row">
      <div className="col-xxl-1 col-xl-2 col-3"><Skeleton height={60} mb={20} radius={"md"} /></div>
      <div className="col-xxl-10 col-xl-10 col-9">
        <Skeleton height={7} mb={5} width="75%" radius="xl"/>
        <Skeleton height={7} mb={5} width="50%" radius="xl"/>
      </div>
    </div>
);
const StoreCredit: React.FC<Props> = () => {
  const isLoggedIn = cookie.get(AUTH_COOKIE);
  const [params, setParams] = useState(() => {
    return {
      page: 1,
      limit: 10,
    };
  });

  const { data: authRes, error: authErr } = useSWR({ url: isLoggedIn ? `/auth/me` : null, withCredentials: true });
  const { data: creditRes, error: creditErr } = useSWR({ url: isLoggedIn ? `/store-credit` : null, withCredentials: true });
  const { data: creditTransactionsRes, error: creditTransactionsErr } = useSWR({ url: isLoggedIn ? `/store-credit/history?page=${params.page}&limit=${params.limit}` : null, withCredentials: true });

  const user = get(authRes, "data", null);
  const storeCredit = get(creditRes, "data.storeCredit", 0);
  const storeCreditTransactions = get(creditTransactionsRes, "data", null);

  function updateUser() {
    mutate({ url: "/auth/me", withCredentials: true });
  }

  function handlePageChange(e: any) {
    setParams((prevState) => ({
      ...prevState,
      page: e,
    }));
  }

  function getIcon(action: string) {
    if (action === "DEBIT") {
      return <Icon icon={"bx:left-arrow-alt"} width={24} height={24} />;
    }

    if (action === "CREDIT") {
      return <Icon icon={"bx:right-arrow-alt"} width={24} height={24} />;
    }
  }

  if (creditErr || creditTransactionsErr)
    return (
      <PageWrapper>
        <EmptySectionMessage title={"Error while loading account info..."} />
      </PageWrapper>
    );

  return (
    <>
      <Head>
        <title>Store Credit | Pageaters</title>
      </Head>
      <PageWrapper>
        <div className="custom-container">
          <div className="row">
            <div className="col">
              <Breadcrumbs items={BREADCRUMBS_ITEMS} />
            </div>
          </div>
        </div>
        <section>
          <PageHeadings title={"Store Credit"} />
        </section>
        <section>
          <div className="custom-container">
            <div className="row">
              <div className="col-xxl-4 col-xl-4 col-12">
                <StoreCreditAmount>
                  {currencyFormat(storeCredit)}
                </StoreCreditAmount>
              </div>
              <div className="col-xxl-8 col-xl-8 col-12">
                <h6>Transaction History</h6>
                {
                  storeCreditTransactions ?
                      (
                          <>
                            {storeCreditTransactions?.docs.length > 0 ? (
                                storeCreditTransactions?.docs.map(
                                    (creditItem: ICreditTransaction, index: number) => {
                                      return (
                                          <TransactionListItem key={creditItem._id}>
                                            <IconSpace color={creditItem.action}>
                                              {getIcon(creditItem.action)}
                                            </IconSpace>
                                            <ContentSpace>
                                              <Info>
                                                <InfoTitle>
                                                  {creditItem.creditId} |{" "}
                                                  {startCase(creditItem.action)}
                                                </InfoTitle>
                                                <InfoDescription>
                                                  {moment(creditItem.createdAt).format(
                                                      "DD/MM/YYYY HH:mm"
                                                  )}
                                                </InfoDescription>
                                              </Info>
                                              <Amount>
                                                {creditItem.action === "DEBIT" ? "-" : "+"}{" "}
                                                {currencyFormat(creditItem.amount)}
                                              </Amount>
                                            </ContentSpace>
                                          </TransactionListItem>
                                      );
                                    }
                                )
                            ) : (
                                <EmptyMessageWithGraphic illustration={TransactionHistory} illustrationHeight="100px" illustrationWidth="100px" title="No Transaction History" />
                            )}
                          </>
                      )
                      : [0,0,0,0,0].map((i, index) => <LoadingItem key={index} />)
                }



                <div className="row py-25">
                  <div className="col">
                    <Pagination style={{justifyContent: 'center'}}
                                total={storeCreditTransactions?.totalPages}
                                color="dark" size="lg" radius="xl"
                                page={params.page}
                                onChange={handlePageChange}/>
                  </div>
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
                      <Accordion.Control>What is store credit?</Accordion.Control>
                      <Accordion.Panel>
                        <p>
                          Store credit is a credit that can be applied towards a future purchase on our website.
                        </p>
                      </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value="2">
                      <Accordion.Control>How do I earn store credit?</Accordion.Control>
                      <Accordion.Panel>
                        <p>
                        Store credit can be earned through promotions, referrals, and other activities. 
                        For example, you can post an unboxing video of the package that you received from us and tag and mention us in the post. 
                        We can provide 5% value of your order upto INR 100 as a store credit. This can be claimed via our instagram handle. 
                        Referrals is not possible because our team is working on it. In near future, it will also be accessible. 
                        </p>
                      </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value="3">
                      <Accordion.Control>How do I use my store credit?</Accordion.Control>
                      <Accordion.Panel>
                        <p>
                        You can use your store credit by entering the credit amount however much you want from your available balance at checkout.
                        The credit will be applied to your order total.
                        </p>
                      </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value="4">
                      <Accordion.Control>How long is my store credit valid?</Accordion.Control>
                      <Accordion.Panel>
                        <p>
                          Store credit doesn&apos;t expire.
                        </p>
                      </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value="5">
                      <Accordion.Control>Can I transfer my store credit to someone else?</Accordion.Control>
                      <Accordion.Panel>
                        <p>
                          Store credit is non-transferable and can only be used by the account holder who earned it.
                        </p>
                      </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value="6">
                      <Accordion.Control>What happens if I return an item purchased with store credit?</Accordion.Control>
                      <Accordion.Panel>
                        <p>
                        If you return an item that was purchased with store credit, the credit will be returned to your account and can be used towards a future purchase.
                        </p>
                      </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value="7">
                      <Accordion.Control>Can I use store credit to purchase gift cards?</Accordion.Control>
                      <Accordion.Panel>
                        <p>
                        Store credit cannot be used to purchase gift cards.
                        </p>
                      </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value="8">
                      <Accordion.Control>What happens to my store credit if my account is closed?</Accordion.Control>
                      <Accordion.Panel>
                        <p>
                        If your account is closed, any remaining store credit will be forfeited.
                        </p>
                      </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value="9">
                      <Accordion.Control>Can I redeem store credit for cash?</Accordion.Control>
                      <Accordion.Panel>
                        <p>
                        Store credit cannot be redeemed for cash and has no cash value.
                        </p>
                      </Accordion.Panel>
                    </Accordion.Item>

                  </Accordion>
                </div>
              </div>
              <div className="row">
                <div className="col">
                   <p className="py-25">
                    Read additional Terms and Conditions for store credit system <Link href={'/store-credit'}><a style={{color: ACCENT_COLOR}}>here</a></Link>.
                  </p>
                </div>
              </div>
            </div>
          </QuestionsSection>
      </PageWrapper>
    </>
  );
};

export default StoreCredit;
