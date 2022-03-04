import React, {forwardRef, useEffect, useState} from 'react';
import styled from "styled-components";
import useSWR from "swr";
import cookie from "js-cookie";
import axios from "axios";
import classNames from 'classnames';
import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from "next/router";
import {Icon} from '@iconify/react';
import {useDebouncedValue} from "@mantine/hooks";
import {Autocomplete, Avatar, Divider, Group, Menu, Text} from '@mantine/core';

import {useUser} from "../../contexts/user.context";

import logo from '../../public/images/brand-logo.svg';
import {AUTH_COOKIE, FULL_PAGE, LG, MD, PRIMARY_COLOR, SECONDARY_COLOR, SM} from "../../core/_variables";
import {getProductImage} from "../../core/_imageRendererHelper";

import {IBook} from "../../schemas/book";

interface Props {
}

const AppHeaderSpace = styled.header`
  color: ${SECONDARY_COLOR};
  width: 100%;
  display: flex;
  flex-flow: row wrap;
  margin: 0;
  padding: 0;
  
  top: 0;
  left: 0;
  z-index: 9;
  
  box-shadow: 0px 0px 6px 0px rgba(0, 0, 0, 0.2);
  background: ${SECONDARY_COLOR};
  
  position: absolute;
  
  &.fixed {
    position: fixed;
    opacity: 0;
    visibility: hidden;
    transform: translate(0, -200px);
    box-shadow: 0px 0px 6px 0px rgba(0, 0, 0, 0.2) !important;
    background: ${SECONDARY_COLOR} !important;
  
    button {
      color: ${PRIMARY_COLOR} !important;
    }
  }

  &.in-view {
    opacity: 1;
    visibility: visible;
    transition: all 0.3s ease;
    transform: translate(0, 0);
  }
  
  &.transparent {
    background: transparent;
    box-shadow: none; 
    
    button {
      color: ${SECONDARY_COLOR}
    }
  }
`;

const LogoSpace = styled.div`
  text-transform: uppercase;
  font-weight: bold;
  display: inline-flex;
  flex: 1;
  
   @media screen and (max-width: ${MD - 1}px) {      
    display: none;  
  }
`;

const BackSpace = styled.div`
  display: none;
      
  @media screen and (max-width: ${MD - 1}px) {      
    flex: 1;
    display: inline-flex;      
  }
`;

const Nav = styled.nav`
  justify-content: flex-end;
  display: flex;
  flex: 2 auto;
  
  @media screen and (max-width: ${SM - 1}px) {      
    flex: 9;
  }
`;

const NavList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: row;
  width: 100%;
  justify-content: flex-end;
  
  li {
    display: inline-flex;
    align-items: center;
    padding: 0 0.5rem;
    margin: 0;
  
    &:last-child {
      margin-right: 0;
    }
  }
`;

const SearchSection = styled.li`
  width: 50%;
  
  @media screen and (max-width: ${MD - 1}px) {
    width: 75%;
    margin-right: 0;
  }

  @media screen and (max-width: ${SM - 1}px) {
    width: 100%;
    margin-right: 0;
  }
`;

const ProfileSection = styled.li``;

const CartSection = styled.li`
  display: none !important;
  
  @media screen and (min-width: ${LG - 1}px) {      
    display: block !important; 
  }
`;

const HamburgerSection = styled.li`
  display: none !important;
  
  @media screen and (min-width: ${LG - 1}px) {      
    display: block !important; 
  }  
`;

const AppSmallIconButton = styled.button`
  box-shadow: none;
  padding: 0.25rem 0.5rem;
`;

const HeaderContainerStyles = {
  display: 'flex',
  flexFlow: 'row wrap',
  alignItems: 'center',
  padding: '10px 0',
};

const AutoCompleteItem = forwardRef<HTMLDivElement, any>(({description, id, value, image, ...others}: any, ref) =>
    <div ref={ref} {...others}>
      <Group noWrap>
        <Avatar src={image}/>
        <div>
          <Text>{value}</Text>
          <Text size="xs" color="dimmed">
            {description}
          </Text>
        </div>
      </Group>
    </div>
);


const AppHeader: React.FC<Props> = () => {
  const router = useRouter();
  const {user, setUser} = useUser();

  const [sticky, setSticky] = useState(false);
  const [transparent, setTransparent] = useState(false);
  const [search, setSearch] = useState('');

  const [searchDebounced] = useDebouncedValue(search, 1000);

  useEffect(() => {
    const auth = cookie.get(AUTH_COOKIE);
    if (auth) {
      getMe();
    }
  }, []);

  const getMe = async () => {
    try {
      const response$ = await axios.get(`/auth/me`, {withCredentials: true});
      const data = await response$.data;

      setUser(data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const logout = async () => {
    try {
      await axios.post(`/auth/logout`, {}, {withCredentials: true});
      setUser(undefined);
      cookie.remove(AUTH_COOKIE);
      router.replace('/');
    } catch (e) {
      console.error(e);
    }
  };

  const {data, error} = useSWR({
    url: `${process.env.NEXT_PUBLIC_BASE_PATH}/store-books/search`,
    args: {q: searchDebounced}
  });

  useEffect(() => {
    const currentPath = router.asPath;
    if (FULL_PAGE.includes(currentPath)) {
      setTransparent(true);
    } else {
      setTransparent(false);
    }
  }, [router]);

  function transformData(arr: any) {
    return arr.map((item: IBook) => {
      return {
        value: item.title,
        id: item.bookId,
        image: getProductImage(item.poster, {height: 64, fit: 'cover', width: 64})
      }
    })
  }

  function handleSearchSelection(e: any) {
    router.push(`/books/${e.id}`);
  }

  return (
      <>
        <AppHeaderSpace id={'header'}
                        className={classNames({'fixed in-view': sticky, 'transparent': transparent})}>
          <div className="custom-container" style={HeaderContainerStyles}>
            <LogoSpace>
              <Link href={'/'}>
                <a><Image src={logo} alt="pageaters-logo" height={44} width={42}/></a>
              </Link>
            </LogoSpace>
            <BackSpace>
              <AppSmallIconButton onClick={() => router.back()}>
                <a>
                  <Icon icon="bx:bx-chevron-left-circle" height={30} width={30}/>
                </a>
              </AppSmallIconButton>
            </BackSpace>
            <Nav>
              <NavList>
                <SearchSection>
                  <Autocomplete
                      placeholder="What are you reading next?"
                      radius="xl"
                      size="sm"
                      value={search}
                      onItemSubmit={handleSearchSelection}
                      onChange={setSearch}
                      style={{width: '100%'}}
                      itemComponent={AutoCompleteItem}
                      data={data ? transformData(data.data) : []}
                  />
                </SearchSection>
                <HamburgerSection>
                  <Menu withArrow placement={'end'} control={<AppSmallIconButton><Icon icon={'bx:grid-alt'} width={30}
                                                                                       height={30}/></AppSmallIconButton>}>
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
                </HamburgerSection>
                <ProfileSection>
                  {
                    !user
                        ? <AppSmallIconButton
                            onClick={() => router.push(`/auth/login?redirect=${router.asPath}`)}><Icon
                            icon={'bx:bx-user-circle'} width={30} height={30}/></AppSmallIconButton>
                        : (
                            <Menu withArrow placement={'end'}
                                  control={<AppSmallIconButton><Icon icon={'bx:bx-user-circle'} width={30}
                                                                     height={30}/></AppSmallIconButton>}>
                              <Menu.Label>Hello, {user ? user.fullName : 'Reader'}!</Menu.Label>
                              <Menu.Item onClick={() => router.push('/account/orders')}
                                         icon={<Icon icon={'ph:shopping-bag-bold'} width={20}
                                                     height={20}/>}>Orders</Menu.Item>
                              <Menu.Item onClick={() => router.push('/account/orders')}
                                         icon={<Icon icon={'bx:bx-heart'} width={20} height={20}/>}>Wishlist</Menu.Item>
                              <Menu.Item onClick={() => router.push('/account/orders')}
                                         icon={<Icon icon={'bx:user-pin'} width={20} height={20}/>}>Account</Menu.Item>
                              <Menu.Item onClick={logout}
                                         icon={<Icon icon={'bx:log-out'} width={20} height={20}/>}>Logout</Menu.Item>
                            </Menu>
                        )
                  }
                </ProfileSection>
                <CartSection>
                  <AppSmallIconButton>
                    <Icon icon={'bx:bx-cart'} width={30} height={30}/>
                  </AppSmallIconButton>
                </CartSection>
              </NavList>
            </Nav>
          </div>
        </AppHeaderSpace>
      </>
  )
};

export default AppHeader;
