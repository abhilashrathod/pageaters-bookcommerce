import React from 'react';
import useSWR, {mutate} from "swr";
import {Skeleton} from "@mantine/core";
import axios from "axios";
import {useNotifications} from "@mantine/notifications";
import cookie from "js-cookie";
import {get} from 'lodash';

import PageWrapper from "../../components/elements/PageWrapper";
import PageHeadings from "../../components/elements/PageHeadings";
import Breadcrumbs from "../../components/elements/Breadcrumbs";
import EmptyMessageWithGraphic from "../../components/elements/EmptyMessageWithGraphic";
import EmptySectionMessage from "../../components/elements/FailedToLoad";
import WishlistActionCard from "../../components/interactive-cards/Wishlist";

import {AUTH_COOKIE} from "../../core/_variables";

import {IBook} from "../../schemas/book";

import graphic from "../../public/illustrations/wishlist.svg";
import Head from "next/head";

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Account', href: '/account'},
  {title: 'Wishlist', href: '/account/wishlist', isActive: true},
];

interface Props {
}

const Wishlist: React.FC<Props> = () => {
  const isLoggedIn = cookie.get(AUTH_COOKIE);
  const notif = useNotifications();

  const {data, error} = useSWR({url: isLoggedIn ? `/favorites` : null, withCredentials: true});

  if (error) return <PageWrapper><EmptySectionMessage title={'Error while loading wishlist...'}/></PageWrapper>;

  const wishlist = get(data, 'data.wishlist', null);

  async function handleDelete(id: string) {
    try {
      await axios.delete(`/favorites/${id}`, {withCredentials: true});
      notif.showNotification({message: 'Book removed from wishlist', color: 'green', autoClose: 3000});

      updateWishlist();
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  async function handleAddCart(id: string) {
    try {
      await axios.post(`/cart/add`, {quantity: 1, product: id}, {withCredentials: true});
      await axios.delete(`/favorites/${id}`, {withCredentials: true});

      notif.showNotification({message: 'Book added to the cart', color: 'green', autoClose: 3000});

      updateWishlist();
      updateCart();
    } catch (e: any) {
      notif.showNotification({message: e.message, color: 'red', autoClose: 3000});
    }
  }

  function updateWishlist() {
    mutate({url: `/favorites`, withCredentials: true});
  }

  function updateCart() {
    mutate({url: `/cart/retrieve`, withCredentials: true});
  }

  return (
      <>
      <Head>
        <title>Orders | Pageaters</title>
      </Head>
      <PageWrapper>
        <div className="custom-container">
          <div className="row">
            <div className="col">
              <Breadcrumbs items={BREADCRUMBS_ITEMS}/>
            </div>
          </div>
        </div>
        <section>
          <PageHeadings title={'Wishlist'}/>
        </section>
        <section>
          <div className="custom-container">
            {
              !wishlist
                  ? <div className="row">
                    {
                      [0, 0, 0, 0].map((j, i) => (
                          <div key={i} className="col-xxl-3 col-xl-3 col-lg-4 col-md-6 col-12">
                            <Skeleton height={160} radius="lg" mb={'lg'}/>
                          </div>
                      ))
                    }
                  </div>
                  :
                  <>
                    {
                      wishlist.length === 0 &&
                      <EmptyMessageWithGraphic title={'Start Adding Books Here!'}
                                               illustration={graphic}
                                               illustrationHeight={'250px'}
                                               illustrationWidth={'250px'}/>
                    }
                    <div className="row">
                      {
                        wishlist.map((item: IBook) => {
                          return (
                              <div key={item._id} className="col-xxl-3 col-xl-3 col-lg-4 col-md-6 col-12">
                                <WishlistActionCard book={item} onItemAddCart={handleAddCart}
                                                    onItemDelete={handleDelete}/>
                              </div>
                          )
                        })
                      }
                    </div>
                  </>
            }
          </div>
        </section>
      </PageWrapper>
      </>
  )
};

export default Wishlist;
