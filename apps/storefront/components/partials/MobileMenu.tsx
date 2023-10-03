import React from 'react';
import styled from 'styled-components';
import Link from "next/link";
import {get} from 'lodash';
import {Icon} from "@iconify/react";
import {Badge, Menu} from "@mantine/core";
import {useRouter} from "next/router";
import useSWR from "swr";
import cookie from "js-cookie";
import axios from "axios";

import {AUTH_COOKIE, MD} from "../../core/_variables";

interface Props {
}


const MobileMenu = styled.div`
  position: fixed;
  left: 0;
  bottom: 0;
  background: rgba(255,255,255,0.9);
  width: 100%;
  border-top: 1px solid #ccc;
  z-index: 12;
  display: none;
  
  @media screen and (max-width: ${MD - 1}px) {
    display: block;
  }
`;

const MobileMenuList = styled.ul`
  display:flex;
  justify-content: space-evenly;
  list-style: none;
`;

const MobileMenuListItem = styled.li`
  padding: 0.825rem;
  display: inline-flex;
  margin: 0;
`;

const LinkItem = styled.a`
  flex-direction: column;
  align-items: center;
  position: relative;

  &.active-link {
    color: $accent;
  }
`;

const LinkName = styled.span`
  font-size: 0.75rem;
`;

const AppMobileMenu: React.FC<Props> = () => {
  const router = useRouter();
  const isLoggedIn = cookie.get(AUTH_COOKIE);

  const {data: userRes} = useSWR({url: isLoggedIn ? `/auth/me` : null, withCredentials: true});
  const {data: cart} = useSWR({url: isLoggedIn ? `/cart/retrieve` : null, withCredentials: true});

  function navigateToUrl(url: string) {
    router.push(url);
  }

  async function logout() {
    try {
      await axios.post(`/auth/logout`, {}, {withCredentials: true});
      cookie.remove(AUTH_COOKIE);

      router.replace('/');
    } catch (e) {
      console.error(e);
    }
  }

  const person = get(userRes, 'data', null);
  const cartCount = get(cart, 'data.products', []).length + get(cart, 'data.bundles', []).length + get(cart, 'data.mysteryBoxes', []).length;

  return (
      <>
        <MobileMenu>
          <MobileMenuList>
            <MobileMenuListItem>
              <Link href={'/'}>
                <LinkItem>
                  <Icon icon={'bx:bx-home-smile'} width={30} height={30}/>
                  <LinkName>Home</LinkName>
                </LinkItem>
              </Link>
            </MobileMenuListItem>
            <MobileMenuListItem>
              <Link href={'/cart'}>
                <LinkItem>
                  {
                    cartCount > 0 && (
                        <Badge style={{position: 'absolute', top: '-10px', right: '-20px', padding: '0 8px'}} variant="filled"
                               color="orange">
                          {cartCount}
                        </Badge>
                    )
                  }
                  <Icon icon={'bx:bx-cart'} width={30} height={30}/>
                  <LinkName>Cart</LinkName>
                </LinkItem>
              </Link>
            </MobileMenuListItem>
            {
              isLoggedIn && (
                  <MobileMenuListItem>
                    <Menu width={180} withArrow>
                      <Menu.Target>
                        <LinkItem><Icon icon={'bx:bx-user-circle'} width={30} height={30}/><LinkName>Account</LinkName></LinkItem>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Label>Hello, {person?.fullName ? person?.fullName : 'Reader'}!</Menu.Label>
                        <Menu.Item onClick={() => navigateToUrl('/account/orders')} icon={<Icon icon={'ph:shopping-bag-bold'} width={20} height={20}/>}>Orders</Menu.Item>
                        <Menu.Item onClick={() => navigateToUrl('/account/wishlist')} icon={<Icon icon={'bx:bx-heart'} width={20} height={20}/>}>Wishlist</Menu.Item>
                        <Menu.Item onClick={() => navigateToUrl('/account')} icon={<Icon icon={'bx:user-pin'} width={20} height={20}/>}>Account</Menu.Item>
                        <Menu.Item onClick={logout} icon={<Icon icon={'bx:log-out'} width={20} height={20}/>}>Logout</Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </MobileMenuListItem>
              )
            }
            {
              !isLoggedIn && (
                  <MobileMenuListItem>
                    <Link href={`/auth/login?redirect=${router.asPath}`}>
                      <LinkItem>
                        <Icon icon={'bx:bx-user-circle'} width={30} height={30}/>
                        <LinkName>Sign In</LinkName>
                      </LinkItem>
                    </Link>
                  </MobileMenuListItem>
              )
            }
            <MobileMenuListItem>
              <Menu position="top-end" width={200} withArrow>
                <Menu.Target>
                  <LinkItem><Icon icon={'bx:grid-alt'} width={30} height={30}/><LinkName>Store</LinkName></LinkItem>
                </Menu.Target>
                <Menu.Dropdown>
                <Menu.Label>Explore Store</Menu.Label>
                {/*<Menu.Item onClick={() => navigateToUrl('/deals')} icon={<Icon icon={'ic:twotone-discount'} width={20} height={20}/>}>Deals & Discounts</Menu.Item>*/}
                  <Menu.Item onClick={() => navigateToUrl('/book-boxes')} icon={<Icon icon={'icon-park-twotone:dropbox'} width={20} height={20}/>}>Bookish Box</Menu.Item>
                <Menu.Item onClick={() => navigateToUrl('/categories')} icon={<Icon icon={'ic:twotone-category'} width={20} height={20}/>}>Categories</Menu.Item>
                <Menu.Item onClick={() => navigateToUrl('/collections')} icon={<Icon icon={'ic:twotone-collections-bookmark'} width={20} height={20}/>}>Collections</Menu.Item>
                <Menu.Item onClick={() => navigateToUrl('/bundles')} icon={<Icon icon={'ic:twotone-all-inbox'} width={20} height={20}/>}>Bundles</Menu.Item>
                <Menu.Divider />
                <Menu.Label>Help</Menu.Label>
                <Menu.Item onClick={() => navigateToUrl('/contact')}>Contact</Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </MobileMenuListItem>
          </MobileMenuList>
        </MobileMenu>
      </>
  )
};

export default AppMobileMenu;
