import React, {useEffect, useState} from "react";
import {Icon} from "@iconify/react";
import { startCase } from "lodash";

import AppIconButton from "../form-controls/IconButton";

import {ButtonVariants} from "../form-controls/Button";

import {getProductImage} from "../../core/_imageRendererHelper";
import {currencyFormat, returnDiscountedAmount} from "../../core/_helpers";
import {ICartItem} from "../../schemas/cart";

import {
  Availability,
  CartActions,
  CartActionsWrapper,
  CartContent,
  CartImage,
  CartItem,
  CartProductInfo,
  CartProductTitle,
  CartQuantity,
  Crossed
} from "./_shared-styles";
import {useRouter} from "next/router";

interface Props {
  book: ICartItem,
  viewOnly: boolean;
  onDelete?: (id: string) => void;
  onQuantityChange?: (payload: any) => void;
}

const ProductItem = ({book, viewOnly, onDelete, onQuantityChange}: Props) => {
  const [quantity, setQuantity] = useState(book.quantity || 1);
  const router = useRouter();

  function renderImageSize(p: string, w: number, h: number) {
    return getProductImage(p, {height: h, width: w, fit: 'cover'});
  }

  function handleDeleteProduct() {
    // @ts-ignore
    onDelete(book.product._id);
  }

  function handleQuantityChange(e: any) {
    // @ts-ignore
    onQuantityChange({quantity: e.target.value, product: book.product._id});
  }

  function viewProductDetails() {
    router.push(`/books/${book.product.bookId}`);
  }

  useEffect(() => {
    setQuantity(book.quantity);
  }, [book.quantity]);

  return (
      <CartItem>
        <CartContent>
          <div>
            <CartImage onClick={viewProductDetails} src={renderImageSize(book.product.poster, 274, 375)} alt={book.product.title} width={75}
                       height={110}/>
          </div>
          <CartProductInfo>
            <CartProductTitle onClick={viewProductDetails}>{book.product.title} <Availability>{startCase(book.product.availability)}</Availability></CartProductTitle>
            <p>By <strong>{book.product?.author?.name}</strong></p>
            <p>
              {
                book.product.currentDiscount
                    ? <>
                      <Crossed>{currencyFormat(book.price)}</Crossed>
                      <span>{currencyFormat(returnDiscountedAmount(book.price, book.product.currentDiscount))} x {quantity}</span>
                    </>
                    : <span>{currencyFormat(book.product.price)}</span>

              }
              <small className="text-positive">&nbsp;({book.product.currentDiscount} % Off)</small>
            </p>
            {
              !viewOnly && (
                  <CartActionsWrapper>
                    <CartQuantity>
                      Qty:
                      <select name="qty" id="qty" value={quantity} onChange={(e) => handleQuantityChange(e)}>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </CartQuantity>
                    <CartActions>
                      {/*<AppIconButton variant={ButtonVariants.Default} onClick={() => console.log('1')}><Icon*/}
                      {/*    icon="bx:bx-heart" height={18} width={18}/>&nbsp;Wishlist</AppIconButton>*/}
                      <AppIconButton variant={ButtonVariants.Default} onClick={handleDeleteProduct}><Icon
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

export default ProductItem;
