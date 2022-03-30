import React, {useState} from "react";
import {Icon} from "@iconify/react";

import AppIconButton from "../../components/form-controls/IconButton";

import {ButtonVariants} from "../../components/form-controls/Button";

import {getProductImage} from "../../core/_imageRendererHelper";
import {currencyFormat, returnDiscountedAmount} from "../../core/_helpers";
import {ICartItem} from "../../schemas/cart";

import {
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
  onDelete: (id: string) => void;
  onQuantityChange: (payload: any) => void;
}

const ProductItem = ({book, onDelete, onQuantityChange}: Props) => {
  const [quantity, setQuantity] = useState(book.quantity);
  const router = useRouter();
  function renderImageSize(p: string, w: number, h: number) {
    return getProductImage(p, {height: h, width: w, fit: 'cover'});
  }

  function handleDeleteProduct() {
    onDelete(book.product._id);
  }

  function handleQuantityChange(e: any) {
    setQuantity(Number(e.target.value));
    onQuantityChange({quantity: e.target.value, product: book.product._id});
  }

  function viewProductDetails() {
    router.push(`/books/${book.product.bookId}`);
  }

  return (
      <CartItem>
        <CartContent>
          <div className="image">
            <CartImage onClick={viewProductDetails} src={renderImageSize(book.product.poster, 274, 375)} alt={book.product.title} width={75}
                       height={110}/>
          </div>
          <CartProductInfo>
            <CartProductTitle onClick={viewProductDetails}>{book.product.title}</CartProductTitle>
            <p>By <strong>{book.product?.author?.name}</strong></p>
            <p>
              {
                book.product.currentDiscount
                    ? <>
                      <Crossed>{currencyFormat(book.price)}</Crossed>
                      <span>{currencyFormat(returnDiscountedAmount(book.price, book.product.currentDiscount))}</span>
                    </>
                    : <span>{currencyFormat(book.product.price)}</span>

              }
              <small className="text-positive">&nbsp;({book.product.currentDiscount} % Off)</small>
            </p>
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
          </CartProductInfo>
        </CartContent>
      </CartItem>
  )
};

export default ProductItem;
