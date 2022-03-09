import React from 'react';
import PageWrapper from "../../components/elements/PageWrapper";
import PageHeadings from "../../components/elements/PageHeadings";

interface Props {
}

const Checkout: React.FC<Props> = () => {
  return (
      <PageWrapper>
        <section>
          <PageHeadings title={'Checkout'}/>
        </section>
      </PageWrapper>
  )
};

export default Checkout;
