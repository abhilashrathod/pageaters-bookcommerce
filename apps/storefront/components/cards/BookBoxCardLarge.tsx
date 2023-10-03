import React, { useState } from "react";
import styled from "styled-components";
import { useKeenSlider } from "keen-slider/react";
import {range} from 'lodash';
import { getProductImage } from "../../core/_imageRendererHelper";

import { IBook } from "../../schemas/book";

import { LG, MD, PRIMARY_COLOR, SECONDARY_COLOR, SM } from "../../core/_variables";
import { useRouter } from "next/router";

interface Props {
  book: IBook;
}

const MainCardWrapper = styled.div`
  margin-bottom: 1.75rem;
  border-radius: 1rem;
  cursor: pointer;
  border: 1px solid #ccc;
`;
const CardCoverSpace = styled.div`
    position: relative;
`;

const CardImage = styled.img`
  border-top-left-radius: 1rem;
  border-top-right-radius: 1rem;
  width: 100%;
  height: 420px;
  object-fit: cover;
  object-position: center center;
  vertical-align: middle;

  @media screen and (max-width: ${LG - 1}px) {
    width: 100%;
    height: 355px;
  }

  @media screen and (max-width: ${MD - 1}px) {
    width: 100%;
    height: 275px;
  }

  @media screen and (max-width: ${SM - 1}px) {
    width: 100%;
    height: 320px;
  }
`;

const CardContent = styled.div`
  padding: 1.5rem;
  margin-bottom: 2.5rem;

  @media screen and (max-width: ${LG - 1}px) {
    margin-bottom: 1.5rem;
  }

  @media screen and (max-width: ${SM - 1}px) {
    margin-bottom: 1rem;
    padding: 1rem;
  }
`;

const CardTextSpace = styled.div`
  margin-bottom: 4px;
`;

const CardTitle = styled.h4`
  letter-spacing: -1px;
  font-weight: 300;
  font-size: 2rem;
`;

const CardSubTitle = styled.h4`
  font-size: 1rem;
  margin-bottom: 0.1rem;
  letter-spacing: 0;
`;


const TagsSpace = styled.div`
  margin-bottom: 1rem;
  text-align: center;
`;

const TagsList = styled.div`
  margin: 1rem 0 0 0;
  padding: 0;
`;

const Tag = styled.li`
  display: inline-flex;
  border-radius: 1.5rem;
  position: relative;
  color: ${PRIMARY_COLOR};
  border: 1px solid #eee;
  font-size: 0.825rem;
  background-color: ${SECONDARY_COLOR};
  box-shadow: rgb(0 0 0 / 18%) 0 2px 4px 0;
  font-weight:600;
  text-decoration: none;
  zoom: 1;
  line-height: 1;
  padding: 0.75rem 1.25rem;
  margin-left: 0.5rem;
  margin-bottom: 0.5rem;

  &:first-child {
    margin-left: 0;
  }
`;

const BookBoxCardLarge: React.FC<Props> = ({ book }) => {
  const router = useRouter();

  function renderImageSize(image: string, w: number, h: number) {
    return getProductImage(image, { height: h, width: w, fit: "cover" });
  }

  function handleNavigation() {
    router.push(`/books/${book.bookId}`);
  }


  return (
    <MainCardWrapper onClick={handleNavigation}>
      <CardCoverSpace>
        {/* <div ref={sliderRef} className="keen-slider"> */}
          {/* {book.images &&
            book.images.map((image: string) => {
              return (
                <div className="keen-slider__slide" key={image}> */}
                  <CardImage
                    src={renderImageSize(book.poster, 1560, 1170)}
                    loading={"lazy"}
                    alt={book.title}
                    height={1170}
                    width={1560}
                  />
                {/* </div>
              );
            })} */}
        {/* </div> */}
        {/* {loaded && instanceRef.current && (
        <div className="dots" style={{position: 'absolute', left: 0, right: 0, bottom: 0, margin: 'auto'}}>
          {
          [...range(instanceRef.current.track.details.slides.length)].map((idx) => {
            return (
              <button
                key={idx}
                onClick={() => {
                  instanceRef.current?.moveToIdx(idx)
                }}
                className={"dot" + (currentSlide === idx ? " active" : "")}
              ></button>
            )
          })}
        </div>
      )} */}
      </CardCoverSpace>
      <CardContent>
        <CardTextSpace>
          <CardTitle>{book.title}</CardTitle>
        </CardTextSpace>
        <TagsList>
          {book.tags &&
            book.tags.map((tag, index) => (
              <Tag key={index}>{tag}</Tag>
            ))}
        </TagsList>
      </CardContent>
    </MainCardWrapper>
  );
};

export default BookBoxCardLarge;
