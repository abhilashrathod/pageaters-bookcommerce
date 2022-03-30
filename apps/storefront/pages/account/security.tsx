import React from 'react';
import styled from 'styled-components';

import PageWrapper from "../../components/elements/PageWrapper";
import Breadcrumbs from "../../components/elements/Breadcrumbs";
import PageHeadings from "../../components/elements/PageHeadings";

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Account', href: '/account'},
  {title: 'Security', href: '/account/security', isActive: true},
];


interface Props {
}

const Security: React.FC<Props> = () => {
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
          <PageHeadings title={'Security'}/>
        </section>
      </PageWrapper>
  )
};

export default Security;
