import React from 'react';
import cookie from "js-cookie";
import useSWR from "swr";
import {get} from 'lodash';
import moment from 'moment';
import {Skeleton} from "@mantine/core";
import styled from "styled-components";
import {Icon} from "@iconify/react";
import {useRouter} from "next/router";

import PageWrapper from "../../../components/elements/PageWrapper";
import PageHeadings from "../../../components/elements/PageHeadings";
import Breadcrumbs from "../../../components/elements/Breadcrumbs";
import EmptySectionMessage from "../../../components/elements/FailedToLoad";
import EmptyMessageWithGraphic from "../../../components/elements/EmptyMessageWithGraphic";
import AppIconButton from "../../../components/form-controls/IconButton";
import {ButtonVariants} from "../../../components/form-controls/Button";

import {AUTH_COOKIE, LIGHTER_PRIMARY_COLOR, LIGHTEST_PRIMARY_COLOR, SM} from "../../../core/_variables";
import {IOrder} from "../../../schemas/order";

import {currencyFormat} from "../../../core/_helpers";
import {getBundleImage, getProductImage} from "../../../core/_imageRendererHelper";

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

interface OrderOverviewProps {
  order: IOrder;
}

const OrderWrapper = styled.div`
  padding: 1.5rem;
  margin-bottom: 1.6rem;
  border: 1px solid #ddd;
  border-radius: 1rem;
  transition: all 0.5s ease;
  
  &:hover {
    border: 1px solid ${LIGHTEST_PRIMARY_COLOR};
  }

  @media screen and (max-width: ${SM - 1}px) {
    padding: 0;
    padding-bottom: 0.825rem;
    margin: 0;
    margin-bottom: 0.825rem;
    border: none;
    border-bottom: 1px solid #ddd;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
    
    &:hover {
      border: none;
    }
  }
`;

const OrderTitle = styled.h6`
  margin-bottom: 0;
`;

const OrderTitleSpace = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: .5rem;
`;

const OrderStatus = styled.span`
  text-transform: uppercase;
  border: 1px solid #146356;
  color: #146356;
  background-color: #A3DA8D;
  padding: 0 .5rem;
  border-radius: .2rem;
`;

const AddressContactInfo = styled.span`
  color: ${LIGHTER_PRIMARY_COLOR};
  display: inline-flex;
  font-weight: 600;
  align-items: center;
`;

const ProductList = styled.div`
  display: flex;
  margin-bottom: 1.5rem;
`;
const ProductListItem = styled.div`
  margin-left: -10px;
  
  &:first-child {
    margin-left: 0px;
  }
`;
const ProductListImageSpace = styled.div`
  box-shadow: 0 0 0 4px #fff;
  align-items: center;
  display: flex;
  justify-content: center;
  border-radius: 50%;
`;

const ProductListImage = styled.img`
  border-radius: 50%;
`;

const OrderActions = styled.div`
  display: flex;
  justify-content: center;
  margin: 1rem 0 0 0;
`;

const OrderOverview = ({order}: OrderOverviewProps) => {
  const router = useRouter();

  function returnProductImage(i: string, w: number, h: number) {
    return getProductImage(i, {height: h, fit: 'cover', width: w})
  }

  function returnBundleImage(i: string, w: number, h: number) {
    return getBundleImage(i, {height: h, fit: 'cover', width: w})
  }

  function viewDetails() {
    router.push(`/account/orders/${order.orderId}`);
  }

  return (
      <OrderWrapper>
        <OrderTitleSpace>
          <OrderTitle>Order # {order.orderId}</OrderTitle>
          <OrderStatus>{order.orderStatus}</OrderStatus>
        </OrderTitleSpace>

        <p>
          <AddressContactInfo><Icon icon={'bx:calendar'} width={16}
                                    height={16}/>&nbsp;{moment(order.orderDate).format('DD MMM YYYY')}
          </AddressContactInfo>
          <AddressContactInfo style={{marginLeft: '1rem'}}><Icon icon={'bx:money'} width={16}
                                                                 height={16}/>&nbsp;{currencyFormat(order.total)}
          </AddressContactInfo>
        </p>

        <p>
          <AddressContactInfo><Icon icon={'bx:map'} width={16}
                                    height={16}/>&nbsp;{order.deliveryAddress.fullName} ({order.deliveryAddress.type})</AddressContactInfo>
          <br/>
          {order.deliveryAddress.addressLine1}, {order.deliveryAddress.addressLine2}, {order.deliveryAddress.landmark}
          <br/>
          {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.pinCode}
        </p>

        <div style={{marginBottom: '0.5rem'}}>
          <AddressContactInfo><Icon icon={'bx:shopping-bag'} width={16} height={16}/>&nbsp;{'Order Items'}
          </AddressContactInfo>
        </div>
        <ProductList>
          {
            order.products.map((book) => (
                <ProductListItem key={book.product.bookId}>
                  <ProductListImageSpace>
                    <ProductListImage src={returnProductImage(book.product.poster, 75, 75)} width={75} height={75}
                                      alt={book.product.title}/>
                  </ProductListImageSpace>
                </ProductListItem>
            ))
          }
          {
            order.bundles.map((bundle) => (
                <ProductListItem key={bundle.bundle.bundleId}>
                  <ProductListImageSpace>
                    <ProductListImage src={returnBundleImage(bundle.bundle.poster, 75, 75)} width={75} height={75}
                                      alt={bundle.bundle.title}/>
                  </ProductListImageSpace>
                </ProductListItem>
            ))
          }
        </ProductList>
        <OrderActions>
          <AppIconButton variant={ButtonVariants.Accent} onClick={viewDetails}>
            <Icon icon={'ic:twotone-remove-red-eye'} width={24} height={24}/>&nbsp;View Details
          </AppIconButton>
        </OrderActions>
      </OrderWrapper>
  )
};
const Orders: React.FC<Props> = () => {
  const isLoggedIn = cookie.get(AUTH_COOKIE);

  const {data, error} = useSWR({url: isLoggedIn ? `/orders/list` : null, withCredentials: true});

  if (error) return <EmptySectionMessage title={'Error while loading orders...'}/>;

  const orders = get(data, 'data', null);

  console.log("orders", orders);

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
