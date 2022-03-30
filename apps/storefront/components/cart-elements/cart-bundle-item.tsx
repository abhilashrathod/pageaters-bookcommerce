import React from "react";
import Link from "next/link";
import {Icon} from "@iconify/react";

import AppIconButton from "../form-controls/IconButton";

import {ButtonVariants} from "../form-controls/Button";

import {getBundleImage} from "../../core/_imageRendererHelper";
import {currencyFormat, returnDiscountedAmount} from "../../core/_helpers";
import {ICartBundle} from "../../schemas/cart";

import {
  CartActions,
  CartActionsWrapper,
  CartContent,
  CartImage,
  CartItem,
  CartProductInfo,
  CartProductTitle,
  Crossed
} from "./_shared-styles";

interface Props {
  cartBundle: ICartBundle;
  onDelete: (id: string) => void;
}

const BundleItem = ({onDelete, cartBundle}: Props) => {

  function renderImageSize(p: string, w: number, h: number) {
    return getBundleImage(p, {height: h, width: w, fit: 'cover'});
  }

  function handleDeleteBundle() {
    onDelete(cartBundle.bundle._id);
  }

  return (
      <CartItem>
        <CartContent>
          <div className="image">
            <Link href={`/bundles/${cartBundle.bundle.bundleId}`}><CartImage
                src={renderImageSize(cartBundle.bundle.poster, 300, 300)}
                alt={cartBundle.bundle.title}
                width={300} height={300}/></Link>
          </div>
          <CartProductInfo>
            <Link
                href={`/bundles/${cartBundle.bundle.bundleId}`}><CartProductTitle>{cartBundle.bundle.title}</CartProductTitle></Link>
            <p>
              {
                cartBundle.bundle.currentDiscount
                    ? <>
                      <Crossed>{currencyFormat(cartBundle.bundle.price)}</Crossed><span>{currencyFormat(returnDiscountedAmount(cartBundle.bundle.price, cartBundle.bundle.currentDiscount))}</span></>
                    : <span>{currencyFormat(cartBundle.bundle.price)}</span>

              }
              <small className="text-positive">&nbsp;(Extra {cartBundle.bundle.currentDiscount} % Off)</small>
            </p>
            <CartActionsWrapper>
              <CartActions style={{marginLeft: 0}}>
                <AppIconButton styles={{paddingLeft: 0}} variant={ButtonVariants.Default} onClick={handleDeleteBundle}><Icon
                    icon="bx:bx-trash" height={18} width={18}/>&nbsp;Delete</AppIconButton>
              </CartActions>
            </CartActionsWrapper>
          </CartProductInfo>
        </CartContent>
      </CartItem>
  )
};

export default BundleItem;
