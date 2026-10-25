import React, { useState } from "react";
import {Icon} from "@iconify/react";
import FsLightbox from "fslightbox-react";

import AppIconButton from "../form-controls/IconButton";
import AppButton, {ButtonVariants} from "../form-controls/Button";

import {getAssetImage} from "../../core/_imageRendererHelper";
import {currencyFormat, returnDiscountedAmount} from "../../core/_helpers";
import {ICartAddon} from "../../schemas/cart";

import {
  CartActions,
  CartActionsWrapperForAddons,
  CartBundleImage,
  CartContent,
  CartItem,
  CartProductInfo,
  CartProductTitle,
  CartQuantity,
  Crossed
} from "./_shared-styles";
import { Button } from "@mantine/core";

interface Props {
  cartAddon: ICartAddon;
  viewOnly: boolean;
  mode: string;
  onDelete?: (id: string) => void;
  onAddonPurchase?: (addObj: any) => void;
  onQuantityChange?: (addObj: any) => void;
}

const CartAddonItem = ({cartAddon, viewOnly, mode, onDelete, onAddonPurchase, onQuantityChange}: Props) => {
  const [quantity, setQuantity] = useState(cartAddon.quantity || 1);
  const [toggler, setToggler] = useState(false);

  function renderImageSize(p: string, w: number, h: number) {
    return getAssetImage(p, {height: h, width: w, fit: 'cover'});
  }

  function handleAddonCart() {
    // @ts-ignore
    onAddonPurchase({ addOn: cartAddon.addOn._id, quantity: quantity});
  }

  function handleDeleteAddon() {
    // @ts-ignore
    onDelete(cartAddon.addOn._id);
  }

  function handleQuantityChange(e: any) {
    setQuantity(e.target.value);

    if (mode === 'update') {
      // @ts-ignore
      onQuantityChange({quantity: e.target.value, addOn: cartAddon.addOn._id});
    }
  }

  return (
      <CartItem>
        <CartContent>
          <div className="image">
          <FsLightbox
            toggler={toggler}
            type={'image'}
            sources={[renderImageSize(cartAddon.addOn.poster, 3024, 3024)]}
          />  
          <CartBundleImage
                src={renderImageSize(cartAddon.addOn.poster, 300, 300)}
                alt={cartAddon.addOn.name}
                onClick={() => setToggler(!toggler)}
                width={300} height={300}/>

            <AppIconButton styles={{marginTop: '0.5rem'}} onClick={() => setToggler(!toggler)} variant={ButtonVariants.Default} size="sm"><Icon icon={'bx:bx-expand'} width={16} height={16} />&nbsp;View Large</AppIconButton>
          </div>
          <CartProductInfo>
            <CartProductTitle>{cartAddon.addOn.name}</CartProductTitle>
            <p>
              {
                cartAddon.addOn.currentDiscount
                    ? <><Crossed>{currencyFormat(cartAddon.addOn.price)}</Crossed><span>{currencyFormat(returnDiscountedAmount(cartAddon.addOn.price, cartAddon.addOn.currentDiscount))}</span></>
                    : <span>{currencyFormat(cartAddon.addOn.price)}</span>
              }
              <small className="text-positive">&nbsp;({cartAddon.addOn.currentDiscount} % Off)</small>
            </p>
            {
              !viewOnly && (
                <CartActionsWrapperForAddons>
                  <CartQuantity>
                    Qty:
                    <select name="qty" id="qty" value={quantity} onChange={(e) => handleQuantityChange(e)}>
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                      <option value={5}>5</option>
                    </select>
                  </CartQuantity>
                  <CartActions style={{justifyContent: 'space-between'}}>
                    {
                      mode === 'create' && (
                        <AppIconButton variant={ButtonVariants.Accent} onClick={handleAddonCart}>
                          <Icon icon="bx:bx-cart" height={18} width={18}/>&nbsp;Add to Cart
                        </AppIconButton>
                      )
                    }
                    
                    {
                      mode === 'update' && (
                        <AppIconButton variant={ButtonVariants.Default} onClick={handleDeleteAddon}>
                          <Icon icon="bx:bx-trash" height={18} width={18}/>&nbsp;Delete
                        </AppIconButton>
                      )
                    }
                  </CartActions>
                </CartActionsWrapperForAddons>
              )
            }
          </CartProductInfo>
        </CartContent>
      </CartItem>
  )
};

export default CartAddonItem;
