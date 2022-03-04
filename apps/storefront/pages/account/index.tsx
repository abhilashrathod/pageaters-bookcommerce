import React from 'react';
import styled from 'styled-components';
import Breadcrumbs from "../../components/elements/Breadcrumbs";
import PageHeadings from "../../components/elements/PageHeadings";
import PageWrapper from "../../components/elements/PageWrapper";
import {useUser} from "../../contexts/user.context";

interface Props {
}

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Account', href: '/account', isActive: true},
];

const Account: React.FC<Props> = () => {
  const {user} = useUser();
  return (
      <PageWrapper>
        <div className="custom-container">
          <div className="row">
            <div className="col">
              <Breadcrumbs items={BREADCRUMBS_ITEMS}/>
            </div>
          </div>
        </div>
        <section>
          <PageHeadings title={`Hello, ${user ? user.fullName : ''}`}/>
        </section>
      </PageWrapper>
  )
};

export default Account;
