import React from "react";
import {NextPage} from "next";
import Head from "next/head";

import PageWrapper from "../components/elements/PageWrapper";
import Breadcrumbs from "../components/elements/Breadcrumbs";
import PageHeadings from "../components/elements/PageHeadings";

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Shipping Policy', isActive: true, href: ''},
];


const Shipping: NextPage = () => {
  return (
      <>
        <Head>
          <title>Shipping Policy | Pageaters</title>
        </Head>
        <PageWrapper>
          <div className="custom-container">
            <div className="row">
              <div className="col">
                <Breadcrumbs items={BREADCRUMBS_ITEMS}/>
              </div>
            </div>
          </div>
          <section>
            <PageHeadings title={`Shipping Policy`}/>
          </section>
          <section>
            <div className="custom-container">
              <div className="row">
                <div className="col">

                  <h6>How does the delivery process work?</h6>
                  <p>Once our system processes your order, your products are inspected thoroughly to ensure they are in
                    a perfect condition.
                    After they pass through the final round of quality check, they are packed and handed over to our
                    trusted delivery partner.
                    Our delivery partners then bring the package to you at the earliest possiblity. In case, they are
                    unable to reach your provided address or at a suitable time, they will contact you to resolve the
                    issue.
                  </p>

                  <h6>How are items packaged?</h6>
                  <p>
                    We package our products in environment friendly bags which are adhering to government norms of
                    sustainable packaging, which are covered in a protective plastic layer. Each individual product is
                    packaged in bubble wrap to prevent them from bending and scratching. <br/>
                    We believe that the best reading experience comes from the best quality shipping and packing, so
                    that you feel like book is just picked up from the shelf!<br/>
                  </p>

                  <h6>
                    My order has been shipped. Now how can I track it?
                  </h6>
                  <p>
                    Once your order has been dispatched, you will receive an email with the details of the tracking
                    number
                    and the courier company that is processing your order.
                    You can track the status of your package 24 hours after your order is dispatched from our warehouse.
                    Following are some our trusted courier partners: <br/>

                    • EKart - https://ekartlogistics.com <br/>
                    • Kerry Indev Express - https://kerryindevexpress.com <br/>
                    • Amazon - https://www.amazon.in <br/>
                    • Delhivery - https://www.delhivery.com <br/>

                  </p>

                  <h6>What is the estimated delivery time?</h6>
                  <p>
                    We usually dispatch most orders within 1-4 business days (excluding Sundays and public
                    holidays) <br/>

                    Though, we keep 95% of our catalogue in our inventory, certain books take time to reach to us from
                    the publishers.
                    While we are trying our best to avoid this situation, these products might delay your order.<br/>

                    If you are ordering our products from a Sale event, dispatches may be a bit delayed due to
                    increased volumes. We will target to dispatch all orders within 3 days of order date.
                  </p>
                  <h6>My order will be shipped in multiple shipments? What does this mean?</h6>
                  <p>
                    Don’t worry! This is a completely normal situation. This just means that different parts of your
                    order
                    may have simply been shipped from our different warehouse locations. Rest assured, you will only
                    have
                    to pay the shipping/CoD charge if applicable, on the first package you receive.
                  </p>


                  <h6>Are there any shipping charges applicable on my order?</h6>
                  <p>
                    We have standard shipping charges for most addresses. <br/>
                    <strong>India shipping charges</strong> A variable charge is applied to all orders of Rs.599 and below, while there is
                    free shipping for all orders for Rs.600 and above
                  </p>
                </div>
              </div>
            </div>
          </section>
        </PageWrapper>
      </>
  )
};

export default Shipping;
