import React from 'react';
import cookie from "js-cookie";
import useSWR from "swr";
import {get} from 'lodash';
import {Skeleton} from "@mantine/core";
import styled from "styled-components";

import PageWrapper from "../../../components/elements/PageWrapper";
import PageHeadings from "../../../components/elements/PageHeadings";
import Breadcrumbs from "../../../components/elements/Breadcrumbs";
import EmptySectionMessage from "../../../components/elements/FailedToLoad";
import EmptyMessageWithGraphic from "../../../components/elements/EmptyMessageWithGraphic";
import OrderOverview from "../../../components/interactive-cards/Order";

import {AUTH_COOKIE} from "../../../core/_variables";
import {IOrder} from "../../../schemas/order";

import graphic from "../../../public/illustrations/empty-orders.svg";

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Account', href: '/account'},
  {title: 'Orders', href: '/account/orders', isActive: true},
];

interface Props {
}

const SkeletonWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: stretch;
  margin-bottom: 1.25rem;
`;
const SkeletonThumb = styled.div`
  display: inline-flex;
`;
const SkeletonContent = styled.div`
  width: 100%;
  margin-left: 1rem;    
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
}`;

const OrdersLoading = () => (
    <SkeletonWrapper>
      <SkeletonThumb>
        <Skeleton height={75}/>
      </SkeletonThumb>
      <SkeletonContent>
        <Skeleton height={12} mt={6} width="75%" radius="xl"/>
        <Skeleton height={12} mt={6} width="50%" radius="xl"/>
        <Skeleton height={12} mt={6} width="25%" radius="xl"/>
        <Skeleton height={12} mt={6} width="25%" radius="xl"/>
        <Skeleton height={12} mt={6} width="25%" radius="xl"/>
      </SkeletonContent>
    </SkeletonWrapper>
);

const Orders: React.FC<Props> = () => {
  const isLoggedIn = cookie.get(AUTH_COOKIE);

  const {data, error} = useSWR({url: isLoggedIn ? `/orders/list` : null, withCredentials: true});

  if (error) return <EmptySectionMessage title={'Error while loading orders...'}/>;

  const orders = get(data, 'data', null);

  return (
      <PageWrapper>
        <div className="custom-container">
          <div className="row">
            <div className="col">
              <Breadcrumbs items={BREADCRUMBS_ITEMS}/>
            </div>
          </div>
        </div>
        <section>
          <PageHeadings title={'Orders'}/>
        </section>
        <section>
          <div className="custom-container">
            {
              !orders
                  ? <div className="row">
                    {
                      [0, 0, 0, 0, 0, 0].map((j, i) => (
                          <div key={i} className="col-xl-6 col-12">
                            <OrdersLoading/>
                          </div>
                      ))
                    }
                  </div>
                  :
                  <>
                    {
                      orders.length === 0 &&
                      <EmptyMessageWithGraphic title={'No Orders Yet!'}
                                               illustration={graphic}
                                               illustrationHeight={'250px'}
                                               illustrationWidth={'250px'}/>
                    }
                    <div className="row">
                      {
                        orders.map((order: IOrder) => {
                          return (
                              <div className="col-xl-6 col-12">
                                <OrderOverview key={order.orderId} order={order}/>
                              </div>
                          )
                        })
                      }
                    </div>
                  </>
            }
          </div>
        </section>
      </PageWrapper>
  )
};

export default Orders;
