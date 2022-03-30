import styled from "styled-components";
import React, {useEffect, useState} from "react";
import {sumBy, get, isString} from "lodash";
import {ICartBundle, ICartItem} from "../../schemas/cart";
import {currencyFormat} from "../../core/_helpers";

const BillItemList = styled.ul`
  margin-bottom: 1rem;
`;

const BillingListItem = styled.li`
  position: relative;
  display: flex;
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  border-width: 0 0 1px;
  margin: 0;
  line-height: 24px;
  justify-content: space-between;
  
  &:last-child {
    border: none;
  }
`;

interface Props {
  cart: any;
  shippingCharges?: any;
}

const CartBreakdown = ({cart, shippingCharges}: Props) => {

  const [total, setTotal] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [toBePaid, setToBePaid] = useState(0);
  const [shipping, setShipping] = useState(shippingCharges);

  useEffect(() => {
    let discountedAmount = 0, productTotal = 0, bundleTotal = 0;

    productTotal = sumBy(cart.products, (book: ICartItem) => (book.price * book.quantity));
    bundleTotal = sumBy(cart.bundles, (bundle: ICartBundle) => (bundle.bundle.price));

    for (const cartItem of cart.products) {
      discountedAmount = discountedAmount + ((cartItem.quantity * cartItem.price) - cartItem.productTotal);
    }

    for (const bundleItem of cart.bundles) {
      discountedAmount = discountedAmount + ((bundleItem.quantity * bundleItem.bundle.price) - bundleItem.total);
    }

    setDiscountAmount(discountedAmount);
    setTotal(productTotal + bundleTotal);
    setToBePaid(cart?.subTotal);
  }, [cart]);

  return (
      <BillItemList>
        <BillingListItem>
          <span>Total MRP:</span>
          <span className="text-bold">{currencyFormat(total)}</span>
        </BillingListItem>
        <BillingListItem>
          <span>Savings:</span>
          <span className="text-bold">{currencyFormat(discountAmount)}</span>
        </BillingListItem>
        <BillingListItem>
          <span>Subtotal:</span>
          <span className="text-bold">{currencyFormat(toBePaid)}</span>
        </BillingListItem>
        <BillingListItem>
          <span>Shipping:</span>
          <span className="text-bold">{isString(shipping) ? shipping : currencyFormat(shipping)}</span>
        </BillingListItem>
        <BillingListItem>
          <h6>Subtotal:</h6>
          <h6 className="text-bold">{currencyFormat(cart?.subTotal)}</h6>
        </BillingListItem>
      </BillItemList>
  )
};

export default CartBreakdown;
