import React from "react";
import {Icon} from "@iconify/react";
import {useRouter} from "next/router";
import moment from "moment";

import {getAssetImage, getBundleImage, getProductImage} from "../../core/_imageRendererHelper";
import AppIconButton from "../form-controls/IconButton";
import {ButtonVariants} from "../form-controls/Button";

import {currencyFormat} from "../../core/_helpers";
import {IOrder} from "../../schemas/order";
import styled from "styled-components";
import {LIGHTER_PRIMARY_COLOR, LIGHTEST_PRIMARY_COLOR, ORDER_STAGES, SECONDARY_COLOR, SM} from "../../core/_variables";

interface OrderOverviewProps {
  order: IOrder;
}

const handleBackgroundColor = (color: string) => {
  switch (color) {
    case ORDER_STAGES.PAID:
      return '#2B580C';
    case ORDER_STAGES.CONFIRMED:
      return '#2B580C';
    case ORDER_STAGES.SHIPPED:
      return '#BB3B0E';
    case ORDER_STAGES.FULFILLED:
      return '#FF5F25';
    case ORDER_STAGES.CANCELLED:
      return '#F90716';
    case ORDER_STAGES.RETURNED:
      return '#444444';
    case ORDER_STAGES.REPLACEMENT:
      return '#444444';
    case ORDER_STAGES.RETURNED_IN_PROGRESS:
      return '#E83A14';
    case ORDER_STAGES.REPLACEMENT_IN_PROGRESS:
      return '#E83A14';
    case ORDER_STAGES.REFUNDED:
      return '#001E6C';
    default:
      return SECONDARY_COLOR;
  }
};

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
  color: #FFF;
  background-color: ${({color}) => handleBackgroundColor(color || '')};
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
  
  @media screen and (max-width: ${SM - 1}px) {
    width: 50px;
    height: 50px;
  }
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

  function renderImageSize(w: number, h: number) {
    return getAssetImage('categories-1.jpg', {height: h, width: w, fit: 'cover'});
  }


  function viewDetails() {
    router.push(`/account/orders/${order.orderId}`);
  }

  function handleAction() {
    // transfer to tracking website
    window.open(order.shipmentTrackingId);
  }

  return (
      <OrderWrapper>
        <OrderTitleSpace>
          <OrderTitle>Order #{order.orderId}</OrderTitle>
          <OrderStatus color={order.orderStatus}>{order.orderStatus}</OrderStatus>
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
          {
            order.boxes.map((mysteryBox) => (
                <ProductListItem key={mysteryBox.box._id}>
                  <ProductListImageSpace>
                    <ProductListImage src={renderImageSize(75, 75)} width={75} height={75}
                                      alt={mysteryBox.box.title}/>
                  </ProductListImageSpace>
                </ProductListItem>
            ))
          }
        </ProductList>
        <OrderActions>
          <AppIconButton variant={ButtonVariants.Default} onClick={viewDetails}>
            <Icon icon={'ic:twotone-remove-red-eye'} width={24} height={24}/>&nbsp;View Details
          </AppIconButton>
          {
            order.orderStatus === 'shipped' && (
              <AppIconButton variant={ButtonVariants.Default} onClick={handleAction}>
                <Icon icon={'ph:truck-duotone'} width={24} height={24}/>&nbsp;Track Package
              </AppIconButton>
            )
          }
        </OrderActions>
      </OrderWrapper>
  )
};

export default OrderOverview;
