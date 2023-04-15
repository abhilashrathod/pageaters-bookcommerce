import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useForm } from "@mantine/form";
import { Icon } from "@iconify/react";
import moment from "moment";
import { List, ThemeIcon } from "@mantine/core";
import { get, startCase } from "lodash";
import cookie from "js-cookie";
import useSWR, { mutate } from "swr";
import Head from "next/head";

import PageWrapper from "../../components/elements/PageWrapper";
import EmptySectionMessage from "../../components/elements/FailedToLoad";

import {
  AUTH_COOKIE,
  LIGHTER_PRIMARY_COLOR,
  LIGHTEST_PRIMARY_COLOR,
  PRIMARY_DANGER,
  PRIMARY_SUCCESS,
} from "../../core/_variables";
import Breadcrumbs from "../../components/elements/Breadcrumbs";
import PageHeadings from "../../components/elements/PageHeadings";
import { ICreditTransaction } from "../../schemas/credit-transaction";
import { currencyFormat } from "../../core/_helpers";

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

const StoreCredit: React.FC<Props> = () => {
  const isLoggedIn = cookie.get(AUTH_COOKIE);

  const { data, error } = useSWR({
    url: isLoggedIn ? `/auth/me` : null,
    withCredentials: true,
  });

  const { data: creditRes } = useSWR({
    url: isLoggedIn ? `/store-credit` : null,
    withCredentials: true,
  });

  const { data: creditHistoryRes } = useSWR({
    url: isLoggedIn ? `/store-credit/history` : null,
    withCredentials: true,
  });

  const user = get(data, "data", null);
  const storeCredit = get(creditRes, "data.storeCredit", 0);
  const storeCreditTransactions = get(creditHistoryRes, "data", []);

  function updateUser() {
    mutate({ url: "/auth/me", withCredentials: true });
  }

  function getIcon(action: string) {
    if (action === "DEBIT") {
      return <Icon icon={"bx:left-arrow-alt"} width={24} height={24} />;
    }

    if (action === "CREDIT") {
      return <Icon icon={"bx:right-arrow-alt"} width={24} height={24} />;
    }
  }

  if (error)
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
                {storeCreditTransactions.length > 0 ? (
                  storeCreditTransactions.map(
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
                  <p>No Transaction History</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </PageWrapper>
    </>
  );
};

export default StoreCredit;
