import React from 'react';
import PageWrapper from "../../components/elements/PageWrapper";
import PageHeadings from "../../components/elements/PageHeadings";
import Breadcrumbs from "../../components/elements/Breadcrumbs";

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Cart', href: '', isActive: true},
];

interface Props {
}

const Cart: React.FC<Props> = () => {
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
          <PageHeadings title={'Cart'}/>
        </section>
      </PageWrapper>
  )
};

export default Cart;
