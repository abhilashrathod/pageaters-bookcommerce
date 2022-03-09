import React from 'react';
import PageWrapper from "../../components/elements/PageWrapper";
import PageHeadings from "../../components/elements/PageHeadings";
import Breadcrumbs from "../../components/elements/Breadcrumbs";

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Account', href: '/account'},
  {title: 'Wishlist', href: '/account/wishlist', isActive: true},
];

interface Props {
}

const Wishlist: React.FC<Props> = () => {
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
          <PageHeadings title={'Wishlist'}/>
        </section>
      </PageWrapper>
  )
};

export default Wishlist;
