import styled from "styled-components";
import React, {useEffect, useState} from "react";
import {get, isString, sumBy} from "lodash";
import {ICartBundle, ICartItem, ICartMysteryBox} from "../../schemas/cart";
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
  giftCharges?: number | undefined;
}

const CartBreakdown = ({cart, shippingCharges, orderTotal, giftCharges}: Props) => {

  const [retailTotal, setRetailTotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [toBePaid, setToBePaid] = useState(0);
  const [gift, setGift] = useState(0);
  const [shipping, setShipping] = useState(0);

  useEffect(() => {
    if (cart) {
      let discountedAmount = 0;
      let giftValue = 0;
      let productTotal = sumBy(cart.products, (book: ICartItem) => (book.price * book.quantity));
      let bundleTotal = sumBy(cart.bundles, (bundle: ICartBundle) => (bundle.bundle.price));
      let mysteryBoxTotal = sumBy(cart.mysteryBoxes, (box: ICartMysteryBox) => (box.box.price));


      for (const cartItem of cart.products) {
        discountedAmount = discountedAmount + ((cartItem.quantity * cartItem.price) - cartItem.productTotal);
      }

      for (const bundleItem of cart.bundles) {
        discountedAmount = discountedAmount + ((bundleItem.quantity * bundleItem.bundle.price) - bundleItem.total);
      }

      for (const boxItem of cart.mysteryBoxes) {
        discountedAmount = discountedAmount + ((boxItem.quantity * boxItem.box.price) - boxItem.total);
      }

      console.log("giftCharges", giftCharges);

      if (giftCharges) {
        setGift(giftCharges);
        giftValue = giftCharges;
      }

      const totalOrderValue = productTotal + bundleTotal + mysteryBoxTotal + giftValue;


      setDiscountAmount(discountedAmount);
      setRetailTotal(productTotal + bundleTotal + mysteryBoxTotal);
      setToBePaid(cart.subTotal);
      setTotal((giftValue && giftValue > 0) ? (orderTotal + giftValue) : orderTotal);
    }
  }, [cart, giftCharges]);

  useEffect(() => {
    if (orderTotal) {
      setTotal(orderTotal);
    }
  }, [orderTotal]);

  // useEffect(() => {
  //   if (giftCharges) {
  //     setGift(giftCharges);
  //     setTotal((preState) => preState + giftCharges);
  //   }
  // }, [giftCharges]);

  useEffect(() => {
    let shippingInfo = isString(shippingCharges) ? shippingCharges : currencyFormat(shippingCharges);
    // @ts-ignore
    setShipping(shippingInfo);
  }, [shippingCharges]);

  console.log("giftCharges", giftCharges);

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
        {
          (giftCharges && giftCharges > 0) && (
              <BillingListItem>
                <span>Gift Wrapping:</span>
                <span className="text-bold">{currencyFormat(gift)}</span>
              </BillingListItem>
          )
        }
        <BillingListItem>
          <h6>Total:</h6>
          <h6 className="text-bold">{currencyFormat(total)}</h6>
        </BillingListItem>
      </BillItemList>
  )
};

export default CartBreakdown;
