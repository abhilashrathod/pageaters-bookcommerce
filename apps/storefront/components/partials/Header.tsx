import React, {forwardRef, useEffect, useState} from 'react';
import {Autocomplete, Avatar, Badge, Divider, Drawer, Group, Menu, Text} from '@mantine/core';
import useSWR from "swr";
import {useDebouncedValue} from "@mantine/hooks";
import styled from "styled-components";
import cookie from "js-cookie";
import axios from "axios";
import Link from 'next/link';
import {useRouter} from "next/router";
import {Icon} from '@iconify/react';
import {get} from 'lodash';

import {getProductImage} from "../../core/_imageRendererHelper";
// import logo from '../../public/images/brand-logo.svg';
import {AUTH_COOKIE, HORIZONTAL_LOGO, MD, SECONDARY_COLOR, SM} from "../../core/_variables";

import {IBook} from "../../schemas/book";
import {searchStore} from "../../core/_analytics";

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
  
  position: fixed;
`;

const LogoSpace = styled.div`
  text-transform: uppercase;
  font-weight: bold;
  display: inline-flex;
  flex: 1;  
  
  @media screen and (max-width: ${SM - 1}px) {      
    flex: 5;
  }
`;

const MainHeaderLogo = styled.img`
  width: 150px;
  height: auto;
`;

const Nav = styled.nav`
  justify-content: flex-end;
  display: flex;
  flex: 2 auto;
  
  @media screen and (max-width: ${SM - 1}px) {      
    flex: 5;
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
    justify-content: center;
    padding: 0 0.5rem;
    margin: 0;
  
    &:last-child {
      margin-right: 0;
    }
    
    @media screen and (max-width: ${SM - 1}px) {
      padding: 0;
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
    display: none !important;
  }
`;

const SearchMobileSection = styled.li`
  display: none !important;

  @media screen and (max-width: ${SM - 1}px) {
    display: inline-flex !important;
  }
`;


const ProfileSection = styled.li`
  display: none !important;
  
  @media screen and (min-width: ${MD - 1}px) {      
    display: inline-flex !important; 
  }
`;

const CartSection = styled.li`
  display: none !important;
  position: relative;
  
  @media screen and (min-width: ${MD - 1}px) {      
    display: block !important; 
  }
`;

const HamburgerSection = styled.li`
  display: none !important;
  
  @media screen and (min-width: ${MD - 1}px) {      
    display: block !important; 
  }  
`;

const AppSmallIconButton = styled.button`
  box-shadow: none;
  padding: 0.25rem 0.5rem;
`;

const HeaderContainer = styled.div`
  display: flex;
  flex-flow: row wrap;
  align-items: center;
  padding: 10px 0;
`;

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
  const isLoggedIn = cookie.get(AUTH_COOKIE);

  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const {data: cart} = useSWR({url: isLoggedIn ? `/cart/retrieve` : null, withCredentials: true});
  const {data: userRes} = useSWR({url: isLoggedIn ? `/auth/me` : null, withCredentials: true});

  const [searchDebounced] = useDebouncedValue(search, 1000);

  const logout = async () => {
    try {
      await axios.post(`/auth/logout`, {}, {withCredentials: true});
      cookie.remove(AUTH_COOKIE);

      router.replace('/');
    } catch (e) {
      console.error(e);
    }
  };

  const {data, error} = useSWR({
    url: `/store-books/search`,
    args: {q: searchDebounced}
  });

  useEffect(() => {
    if (searchDebounced) {
      searchStore(searchDebounced);
    }
  }, [searchDebounced]);

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
    setSearch('');
    handleToggleSearch();
  }

  function navigateToUrl(url: string) {
    router.push(url);
  }

  function handleToggleSearch() {
    setShowSearch((prevState) => !prevState)
  }

  const person = get(userRes, 'data', null);
  const cartCount = get(cart, 'data.products', []).length + get(cart, 'data.bundles', []).length;

  return (
      <>
        <AppHeaderSpace id={'header'}>
          <div className="custom-container">
            <HeaderContainer>
              <LogoSpace>
                <Link href={'/'}>
                  <a><MainHeaderLogo src={HORIZONTAL_LOGO} alt="pageaters-logo" width={150}/></a>
                </Link>
              </LogoSpace>
              <Nav>
                <NavList>
                  <SearchMobileSection>
                    <AppSmallIconButton onClick={handleToggleSearch}>
                      <Icon icon={'bx:search'} width={30} height={30} rotate={'90deg'}/>
                    </AppSmallIconButton>
                  </SearchMobileSection>
                  <SearchSection>
                    <Drawer
                        overlayOpacity={0.55}
                        overlayBlur={3}
                        opened={showSearch}
                        position="top"
                        padding={'sm'}
                        title={<MainHeaderLogo src={HORIZONTAL_LOGO} alt="pageaters-logo" width={150}/>}
                        size={'full'}
                        transition="slide-down"
                        transitionDuration={250}
                        onClose={handleToggleSearch}
                    >
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
                          data-autofocus
                      />
                    </Drawer>
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
                        data-autofocus
                    />
                  </SearchSection>
                  <HamburgerSection>
                    <Menu withArrow placement={'end'} control={<AppSmallIconButton><Icon icon={'bx:grid-alt'} width={30}
                                                                                         height={30}/></AppSmallIconButton>}>
                      <Menu.Label>Explore Store</Menu.Label>
                      <Menu.Item onClick={() => navigateToUrl('/deals')}
                                 icon={<Icon icon={'ic:twotone-discount'} width={20} height={20}/>}>Deals &
                        Discounts</Menu.Item>
                      <Menu.Item onClick={() => navigateToUrl('/categories')}
                                 icon={<Icon icon={'ic:twotone-category'} width={20}
                                             height={20}/>}>Categories</Menu.Item>
                      <Menu.Item onClick={() => navigateToUrl('/collections')}
                                 icon={<Icon icon={'ic:twotone-collections-bookmark'} width={20}
                                             height={20}/>}>Collections</Menu.Item>
                      <Menu.Item onClick={() => navigateToUrl('/bundles')}
                                 icon={<Icon icon={'ic:twotone-all-inbox'} width={20} height={20}/>}>Bundles</Menu.Item>
                      <Divider/>
                      <Menu.Label>Help</Menu.Label>
                      <Menu.Item>Contact</Menu.Item>
                    </Menu>
                  </HamburgerSection>
                  <ProfileSection>
                    {
                      !person
                          ? <AppSmallIconButton onClick={() => router.push(`/auth/login?redirect=${router.asPath}`)}>
                            <Icon icon={'bx:bx-user-circle'} width={30} height={30}/>
                          </AppSmallIconButton>
                          : (
                              <Menu withArrow placement={'end'} control={<AppSmallIconButton>
                                <Icon icon={'bx:bx-user-circle'} width={30} height={30}/>
                              </AppSmallIconButton>}>
                                <Menu.Label>Hello, {person.fullName ? person.fullName : 'Reader'}!</Menu.Label>
                                <Menu.Item onClick={() => navigateToUrl('/account/orders')}
                                           icon={<Icon icon={'ph:shopping-bag-bold'} width={20}
                                                       height={20}/>}>Orders</Menu.Item>
                                <Menu.Item onClick={() => navigateToUrl('/account/wishlist')}
                                           icon={<Icon icon={'bx:bx-heart'} width={20} height={20}/>}>Wishlist</Menu.Item>
                                <Menu.Item onClick={() => navigateToUrl('/account')}
                                           icon={<Icon icon={'bx:user-pin'} width={20} height={20}/>}>Account</Menu.Item>
                                <Menu.Item onClick={logout}
                                           icon={<Icon icon={'bx:log-out'} width={20} height={20}/>}>Logout</Menu.Item>
                              </Menu>
                          )
                    }
                  </ProfileSection>
                  <CartSection>
                    {
                      cartCount > 0 && (
                          <Badge style={{position: 'absolute', top: 0, right: 0, padding: '0 6px'}} variant="filled"
                                 color="orange">
                            {cartCount}
                          </Badge>
                      )
                    }
                    <AppSmallIconButton onClick={() => navigateToUrl('/cart')}>
                      <Icon icon={'bx:bx-cart'} width={30} height={30}/>
                    </AppSmallIconButton>
                  </CartSection>
                </NavList>
              </Nav>
            </HeaderContainer>
          </div>
        </AppHeaderSpace>
      </>
  )
};

export default AppHeader;
