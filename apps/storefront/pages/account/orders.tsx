import React from 'react';

import useSWR from "swr";

import PageWrapper from "../../components/elements/PageWrapper";
import PageHeadings from "../../components/elements/PageHeadings";
import Breadcrumbs from "../../components/elements/Breadcrumbs";

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Account', href: '/account'},
  {title: 'Orders', href: '/account/orders', isActive: true},
];

interface Props {
}

const Orders: React.FC<Props> = () => {
  const {data, error} = useSWR({url: `/orders/list`, withCredentials: true});

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
          <PageHeadings title={'Orders'}/>
        </section>
        <section>

        </section>
      </PageWrapper>
  )
};

export default Orders;
