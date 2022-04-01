import styled from "styled-components";
import React, {useEffect, useState} from "react";
import {get, isString, sumBy} from "lodash";
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
  shippingCharges: number | string;
  orderTotal: number;
}

const CartBreakdown = ({cart, shippingCharges, orderTotal}: Props) => {

  const [retailTotal, setRetailTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [toBePaid, setToBePaid] = useState(0);
  const [shipping, setShipping] = useState(0);

  useEffect(() => {
    if (cart) {
      let discountedAmount = 0;
      let productTotal = sumBy(cart.products, (book: ICartItem) => (book.price * book.quantity));
      let bundleTotal = sumBy(cart.bundles, (bundle: ICartBundle) => (bundle.bundle.price));


      for (const cartItem of cart.products) {
        discountedAmount = discountedAmount + ((cartItem.quantity * cartItem.price) - cartItem.productTotal);
      }

      for (const bundleItem of cart.bundles) {
        discountedAmount = discountedAmount + ((bundleItem.quantity * bundleItem.bundle.price) - bundleItem.total);
      }

      setDiscountAmount(discountedAmount);
      setRetailTotal(productTotal + bundleTotal);
      setToBePaid(cart.subTotal);
      setTotal(orderTotal);
    }
  }, [cart]);

  useEffect(() => {
    if (orderTotal) {
      setTotal(orderTotal);
    }
  }, [orderTotal]);

  useEffect(() => {
    let shippingInfo = isString(shippingCharges) ? shippingCharges : currencyFormat(shippingCharges);
    // @ts-ignore
    setShipping(shippingInfo);
  }, [shippingCharges]);

  return (
      <BillItemList>
        <BillingListItem>
          <span>Total MRP:</span>
          <span className="text-bold">{currencyFormat(retailTotal)}</span>
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
          <span className="text-bold">{shipping}</span>
        </BillingListItem>
        <BillingListItem>
          <h6>Total:</h6>
          <h6 className="text-bold">{currencyFormat(total)}</h6>
        </BillingListItem>
      </BillItemList>
  )
};

export default CartBreakdown;
