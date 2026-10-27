import React from "react";
import Link from "next/link";
import {Icon} from "@iconify/react";

import AppIconButton from "../form-controls/IconButton";

import {ButtonVariants} from "../form-controls/Button";

import {getAssetImage} from "../../core/_imageRendererHelper";
import {currencyFormat, returnDiscountedAmount} from "../../core/_helpers";
import {ICartMysteryBox} from "../../schemas/cart";

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
  mysteryBox: ICartMysteryBox;
  viewOnly: boolean;
  onDelete?: (id: string) => void;
}

const MysteryBoxItem = ({mysteryBox, viewOnly, onDelete}: Props) => {

  function renderImageSize(w: number, h: number) {
    return getAssetImage('categories-1.jpg', {height: h, width: w, fit: 'cover'});
  }

  function handleDeleteBox() {
    // @ts-ignore
    onDelete(mysteryBox.box._id);
  }

  return (
      <CartItem>
        <CartContent>
          <div className="image">
            <CartImage
                src={renderImageSize(250, 250)}
                alt={mysteryBox.box.title}
                width={250} height={250}/>
          </div>
          <CartProductInfo>
            <Link href={`/mystery-boxes`} passHref>
              <CartProductTitle>{mysteryBox.box.title}</CartProductTitle>
            </Link>
            <p>
              {
                mysteryBox.box.currentDiscount
                    ? <>
                      <Crossed>{currencyFormat(mysteryBox.box.price)}</Crossed><span>{currencyFormat(returnDiscountedAmount(mysteryBox.box.price, mysteryBox.box.currentDiscount))}</span></>
                    : <span>{currencyFormat(mysteryBox.box.price)}</span>

              }
              <small className="text-positive">&nbsp;({mysteryBox.box.currentDiscount} % Off)</small>
            </p>
            {
              !viewOnly && (
                  <CartActionsWrapper>
                    <CartActions style={{marginLeft: 0}}>
                      <AppIconButton styles={{paddingLeft: 0}} variant={ButtonVariants.Default}
                                     onClick={handleDeleteBox}><Icon
                          icon="bx:bx-trash" height={18} width={18}/>&nbsp;Delete</AppIconButton>
                    </CartActions>
                  </CartActionsWrapper>
              )
            }
          </CartProductInfo>
        </CartContent>
      </CartItem>
  )
};

export default MysteryBoxItem;
