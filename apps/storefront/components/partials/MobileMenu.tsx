import React from 'react';
import styled from 'styled-components';
import Link from "next/link";
import {get} from 'lodash';
import {Icon} from "@iconify/react";
import {Badge, Divider, Menu} from "@mantine/core";
import {AUTH_COOKIE, MD} from "../../core/_variables";
import {useRouter} from "next/router";
import useSWR from "swr";
import cookie from "js-cookie";

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

  const {data: person} = useSWR({url: isLoggedIn ? `/auth/me` : null, withCredentials: true});
  const {data: cart} = useSWR({url: isLoggedIn ? `/cart/retrieve` : null, withCredentials: true});

  function navigateToUrl(url: string) {
    router.push(url);
  }

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
            {
              isLoggedIn && (
                  <MobileMenuListItem>
                    <Link href={'/account/wishlist'}>
                      <LinkItem>
                        <Icon icon={'bx:bx-heart'} width={30} height={30}/>
                        <LinkName>Wishlist</LinkName>
                      </LinkItem>
                    </Link>
                  </MobileMenuListItem>
              )
            }
            {
              isLoggedIn && (
                  <MobileMenuListItem>
                    <Link href={'/account/orders'}>
                      <LinkItem>
                        <Icon icon={'ph:shopping-bag-bold'} width={30} height={30}/>
                        <LinkName>Orders</LinkName>
                      </LinkItem>
                    </Link>
                  </MobileMenuListItem>
              )
            }

            <MobileMenuListItem>
              <Link href={'/cart'}>
                <LinkItem>
                  <Badge style={{position: 'absolute', top: '-10px', right: '-20px', padding: '0 8px'}} variant="filled" color="orange">
                    {get(cart, 'data.products', []).length + get(cart, 'data.bundles', []).length}
                  </Badge>
                  <Icon icon={'bx:bx-cart'} width={30} height={30}/>
                  <LinkName>Cart</LinkName>
                </LinkItem>
              </Link>
            </MobileMenuListItem>
            <MobileMenuListItem>
              <Menu withArrow placement={'end'} control={<LinkItem><Icon icon={'bx:grid-alt'} width={30}
                                                                         height={30}/><LinkName>Store</LinkName></LinkItem>}>
                <Menu.Label>Explore Store</Menu.Label>
                <Menu.Item onClick={() => navigateToUrl('/deals')}
                           icon={<Icon icon={'ic:twotone-discount'} width={20} height={20}/>}>Deals &
                  Discounts</Menu.Item>
                <Menu.Item onClick={() => navigateToUrl('/categories')}
                           icon={<Icon icon={'ic:twotone-category'} width={20} height={20}/>}>Categories</Menu.Item>
                <Menu.Item onClick={() => navigateToUrl('/collections')}
                           icon={<Icon icon={'ic:twotone-collections-bookmark'} width={20}
                                       height={20}/>}>Collections</Menu.Item>
                <Menu.Item onClick={() => navigateToUrl('/bundles')}
                           icon={<Icon icon={'ic:twotone-all-inbox'} width={20} height={20}/>}>Bundles</Menu.Item>

                <Divider/>
                <Menu.Label>Help</Menu.Label>
                <Menu.Item onClick={() => navigateToUrl('/contact')}>Contact</Menu.Item>
              </Menu>
            </MobileMenuListItem>
          </MobileMenuList>
        </MobileMenu>
      </>
  )
};

export default AppMobileMenu;
