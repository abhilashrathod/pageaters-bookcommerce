import React from 'react';
import styled from 'styled-components'

import Badges from "../elements/Badge";

import {IBook} from "../../schemas/book";
import {LIGHT_COLOR, PRIMARY_COLOR, PRIMARY_DANGER, SECONDARY_COLOR} from "../../core/_variables";
import {currencyFormat, returnDiscountedAmount} from "../../core/_helpers";
import {getProductImage} from "../../core/_imageRendererHelper";
import {useRouter} from "next/router";

import {viewItem} from "../../core/_analytics";
import {ButtonVariants} from "../form-controls/Button";

interface Props {
  book: IBook;
  analytics?: {
    listId: string;
    listName: string;
  }
}

const WrapperDiv = styled.a`
  position: relative;
  display: block;
  cursor: pointer;
`;

const CardCover = styled.div`
  margin-bottom: 0.625rem;
`;

const CardImage = styled.img`
  object-fit: cover;
  width: 100%;
  border-radius: 1rem;
  box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.16);
`;

const CardContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const CardTitle = styled.div`
  display: inline-flex;
  align-items: center;
`;

const CardTags = styled.div`
  font-size: 14px;
  line-height: 18px;
  align-items: center;
  display: inline-flex;
  margin-bottom: 0.25rem;
`;

const CardSubTitle = styled.div`
  display: inline-flex;
  align-items: center;
  font-size: 1rem;
  font-weight: 600; 
  margin-bottom: 0.1rem;
`;

const CartDiscount = styled.div`
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  border-radius: 0.5rem;
  background: ${SECONDARY_COLOR};
  padding: 0.25rem 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.2);
  box-shadow: rgb(0 0 0 / 18%) 0 2px 4px 0;
  font-size: 1rem;
  transition: all 0.5s ease;
  z-index: 1;
  line-height: 1.25rem;
  color: ${PRIMARY_COLOR};
`;

const OutOfStock = styled.div`
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
  border-radius: 0.5rem;
  background: ${PRIMARY_DANGER};
  padding: 0.25rem 0.5rem;
  border: 1px solid rgba(0, 0, 0, 0.2);
  box-shadow: rgb(0 0 0 / 18%) 0 2px 4px 0;
  font-size: 1rem;
  transition: all 0.5s ease;
  line-height: 1.25rem;
  color: ${SECONDARY_COLOR};
`;

const Crossed = styled.span`
    margin-right: 0.5rem;
    text-decoration: line-through;
    color: ${LIGHT_COLOR};
`;

const ProductCardLandScape: React.FC<Props> = ({book, analytics}) => {
  const router = useRouter();

  function renderImageSize(w: number, h: number) {
    return getProductImage(book.poster, {height: h, width: w, fit: 'cover'});
  }

  function handleNavigation() {
    // @ts-ignore // analytics tracking
    viewItem([book], analytics.listId, analytics.listName);
    router.push(`/books/${book.bookId}`);
  }

  return (
      <>
        <WrapperDiv target={'_blank'} onClick={handleNavigation}>
          {(book.inventory > 0 && book.currentDiscount > 0) && <CartDiscount>{book?.currentDiscount}% Off</CartDiscount>}
          {book.inventory <= 0 && <OutOfStock>Out of Stock</OutOfStock>}
          <CardCover>
            <CardImage src={renderImageSize(247, 375)} alt={book?.title} className={book.inventory <= 0 ? 'greyscale': ''} loading="lazy" height={375} width={247}/>
          </CardCover>

          <CardContent>
            <CardTags>
              {book.newRelease && <Badges text={book.newRelease ? 'New Release' : ''} color={ButtonVariants.SecondaryAccent}/>}
              {book.editorsPick && <Badges text={book.editorsPick ? 'Editor\'s Pick' : ''} color={'accent'}/>}
              {book.bestSeller && <Badges text={book.bestSeller ? 'Best Seller' : ''} color={'primary'}/>}
              {book.preOrder && <Badges text={book.preOrder ? 'Pre-order' : ''} color={ButtonVariants.Success}/>}
            </CardTags>
            <CardTitle>
              {book.title}
            </CardTitle>
            <CardSubTitle>
              {
                book.currentDiscount
                    ? <>
                      <Crossed>{currencyFormat(book.price)}</Crossed><span>{currencyFormat(returnDiscountedAmount(book.price, book.currentDiscount))}</span></>
                    : <span>{currencyFormat(book.price)}</span>

              }
            </CardSubTitle>
          </CardContent>
        </WrapperDiv>
      </>
  );
};

export default ProductCardLandScape;
