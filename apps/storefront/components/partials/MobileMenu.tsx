import React from 'react';
import styled from 'styled-components';
import Link from "next/link";
import {Icon} from "@iconify/react";
import {Divider, Menu} from "@mantine/core";
import {MD} from "../../core/_variables";

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

  &.active-link {
    color: $accent;
  }
`;

const LinkName = styled.span`
  font-size: 0.75rem;
`;

const AppMobileMenu: React.FC<Props> = () => {
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
              <Link href={'/'}>
                <LinkItem>
                  <Icon icon={'bx:bx-heart'} width={30} height={30}/>
                  <LinkName>Wishlist</LinkName>
                </LinkItem>
              </Link>
            </MobileMenuListItem>
            <MobileMenuListItem>
              <Link href={'/'}>
                <LinkItem>
                  <Icon icon={'ph:shopping-bag-bold'} width={30} height={30}/>
                  <LinkName>Orders</LinkName>
                </LinkItem>
              </Link>
            </MobileMenuListItem>
            <MobileMenuListItem>
              <Link href={'/'}>
                <LinkItem>
                  <Icon icon={'bx:bx-cart'} width={30} height={30}/>
                  <LinkName>Cart</LinkName>
                </LinkItem>
              </Link>
            </MobileMenuListItem>
            <MobileMenuListItem>
              <Menu withArrow placement={'end'} control={<LinkItem><Icon icon={'bx:grid-alt'} width={30}
                                                                         height={30}/><LinkName>Store</LinkName></LinkItem>}>
                <Menu.Label>Explore Store</Menu.Label>
                <Menu.Item icon={<Icon icon={'ic:twotone-discount'} width={20} height={20}/>}>Deals &
                  Discounts</Menu.Item>
                <Menu.Item icon={<Icon icon={'ic:twotone-category'} width={20} height={20}/>}>Categories</Menu.Item>
                <Menu.Item icon={<Icon icon={'ic:twotone-collections-bookmark'} width={20}
                                       height={20}/>}>Collections</Menu.Item>
                <Menu.Item icon={<Icon icon={'ic:twotone-all-inbox'} width={20} height={20}/>}>Bundles</Menu.Item>

                <Divider/>
                <Menu.Label>Help</Menu.Label>
                <Menu.Item>FAQs</Menu.Item>
                <Menu.Item>Contact</Menu.Item>
              </Menu>
            </MobileMenuListItem>
          </MobileMenuList>
        </MobileMenu>
      </>
  )
};

export default AppMobileMenu;
