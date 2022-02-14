import React from "react";
import {NextPage} from 'next'

import HeroBanner from "../components/banners/HeroBanner";
import CategoryLandscapeCard from "../components/cards/CategoryLandscapeCard";
import Categories from "../components/carousels/Categories";
import styled from "styled-components";

const DUMMY = {
  "bookId": "BK-2036866397",
  "title": "Zero to One",
  "weight": 210,
  "ISBN": "978-0753555194",
  "editorsPick": true,
  "bestSeller": true,
  "poster": "zero-to-one-BfRUi9xUwi-1639591509339.jpg",
  "inventory": 1,
  "currentDiscount": 33,
  "popularity": 0,
  "price": 599,
  "_id": "61ba2f6403f6f15ccc06f4fd",
};

const CATEGORY = {
  categoryId: "CA-5609114898",
  numberOfBooks: 15,
  thumbnail: "fantacy-2bMBXeHBTu-1641323949900.jpg",
  title: "Fantacy",
  _id: "60f1600772a7bf2650dfb53c"
};

const Home: NextPage = () => {
  return (
      <>
        <HeroBanner/>
        <section className={'mb-25 py-5'}>
          <Categories />
        </section>
      </>
  )
};

export default Home
