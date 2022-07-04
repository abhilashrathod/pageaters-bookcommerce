import React from 'react';
import {currencyFormat, returnDiscountedAmount} from "../../core/_helpers";
import styled from "styled-components";

import {IBook} from "../../schemas/book";
import {getProductImage} from "../../core/_imageRendererHelper";
import AppButton, {ButtonSizes, ButtonVariants} from "../form-controls/Button";
import {LIGHT_COLOR} from "../../core/_variables";

interface Props {
  book: IBook;
  onItemDelete: (id: string) => void;
  onItemAddCart: (book: IBook) => void;
}

const WishlistWrapper = styled.div`
  border: 1px solid rgb(221, 221, 221);
  border-radius: 1rem;
  padding: 12px 16px 12px 12px;
  margin-bottom: 1rem;
`;

const CardCover = styled.div`
  
`;

const CardImage = styled.img`
  border-radius: 1rem;
  width: 120px;
  height: 160px;
  object-fit: cover;
  box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.16);
`;

const CardContent = styled.div`
  margin-left: 1rem;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  justify-content: space-between;
`;

const CardTitle = styled.div`
  display: flex;
  align-items: center;
  font-size: 1rem;
  line-height: 1.6;
  font-weight: 600;
`;

const CardSubTitle = styled.div`
  display: flex;
  align-items: center;
`;

const Crossed = styled.span`
  margin-right: 0.5rem;
  text-decoration: line-through;
  color: ${LIGHT_COLOR};
`;

const WishlistActionCard: React.FC<Props> = ({book, onItemAddCart, onItemDelete}) => {

  function renderImageSize(w: number, h: number) {
    return getProductImage(book.poster, {height: h, width: w, fit: 'cover'});
  }

  return (
      <>
        <WishlistWrapper>
          <div className="row">
            <div className="col-4">
              <CardCover>
                <CardImage src={renderImageSize(120, 160)} alt={book.title}/>
              </CardCover>
            </div>
            <div className="col-8">
              <CardContent>
                <div>
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
                </div>
                <div>
                  <AppButton onClick={() => onItemAddCart(book)} variant={ButtonVariants.Accent} size={ButtonSizes.Small} styles={{marginRight: '1rem'}}>
                    Add to Cart
                  </AppButton>
                  <AppButton onClick={() => onItemDelete(book._id)} variant={ButtonVariants.Secondary} size={ButtonSizes.Small}>
                    Remove
                  </AppButton>
                </div>
              </CardContent>
            </div>
          </div>
        </WishlistWrapper>
      </>
  )
};

export default WishlistActionCard;
