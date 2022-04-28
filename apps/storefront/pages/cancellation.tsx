import React from "react";
import {NextPage} from "next";
import Head from "next/head";

import PageWrapper from "../components/elements/PageWrapper";
import Breadcrumbs from "../components/elements/Breadcrumbs";
import PageHeadings from "../components/elements/PageHeadings";
import {Alert} from "@mantine/core";

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Cancellation and Returns', isActive: true, href: ''},
];


const Cancellation: NextPage = () => {
  return (
      <>
        <Head>
          <title>Cancellation and Return Policy | Pageaters</title>
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
            <PageHeadings title={`Cancellation and Return Policy`}/>
          </section>
          <section>
            <div className="custom-container">
              <div className="row">
                <div className="col">
                  <h6>Cancellation</h6>
                  <p>
                    <strong>How to Cancel Order? </strong><br/> If the order or the item(s) that you want to cancel have not
                    been shipped yet or in transit, you can place a cancel request. <br/>
                    • To cancel your recently placed order, proceed to your Account &gt; Orders &gt; Order corresponding details page and place a cancel request. <br/>
                    • You can also write to our customer support team on support@demo.pageaters.com or call us on +91-9000000000 (Monday to Saturday, 11AM to 7PM). <br/>
                  </p>
                  <p>
                    <strong>Cancellation Cut-off Period</strong><br/> An order can be cancelled within <em>3 days</em> from when it
                    was placed.
                    After that you may need to place return request.
                  </p>

                  <p>
                    <strong>Cancellation Refund: </strong><br/> In such cases, the order will be cancelled, and the money
                    will be refunded to you within 3-5
                    business days after the cancellation request is duly processed by us. <br/>

                    In case of cancellation, we process the refund within 24-48 business hours after receiving the
                    cancellation request.<br/>

                    In case of cancellation once the shipment has already been dispatched or if it is being returned, we
                    process the refund once the products have been received and verified at our warehouse. <br/>

                  </p>
                  <p>
                    <strong>How will I get refunded? </strong><br/>
                    For payments done through credit/debit cards or net banking, wallets or UPIs; the refund will be
                    processed to the
                    same account from which the payment was made within 24-48 business hours of us receiving the
                    products back. It may take 3-5 additional business days for the amount to reflect in your account.
                  </p>

                  <hr/>

                  <h6>Returns, Replacements and Refunds</h6>
                  <p>
                    Our shipments go through rigorous quality check processes before they leave our warehouse. However
                    in
                    the rare case that your product is damaged during shipment or transit, you can request for a
                    replacement or cancellation and refund. <br/>
                  </p>
                  <p>
                    If a return/replacement is accepted, Pageaters will replace or refund the invoiced rupee value for, the damaged
                    / defective / wrong product. In either case, the additional customs amount paid by the
                    customer to receive the product will be reimbursed to the customer in the form of a refund coupon,
                    that can be applied to the customer’s next order with Pageaters, subject to the customer providing a
                    copy of the customs receipt.
                  </p>
                  <p>
                    <strong>Which are the items that cannot be returned/exchanged? </strong> <br/>
                    Returns/replacements will not be accepted under the following conditions: <br/>

                    • If request is initiated after 7 days of order delivery <br/>
                    • Product is damaged due to misuse/overuse <br/>
                    • Serial Number is tampered with. <br/>
                    • Product is used or altered <br/>
                    • Free product provided by brand
                  </p>
                  <p>
                    <Alert title="Note:" color="gray">
                      For certain marketing campaigns or mega sale periods, special return/exchange/refund
                      rules may apply. Information regarding this is visible on the promotion banner. For any
                      clarification,
                      please feel free to contact our customer care.
                    </Alert>
                  </p>

                  <p>
                    <strong>How to place return/replacement request? </strong> <br/>
                    If you have received an item in a damaged/defective condition or have been sent a wrong product, you
                    can follow a few simple steps to initiate your return/refund within 7 days of receiving the order: <br />

                    • To return/exchange your recently placed order, proceed to Account &gt; Orders &gt; Order corresponding details page and place a return/replace request. <br/>
                    • You can also write to our customer support team on support@demo.pageaters.com or call us on +91-9000000000 (Monday to Saturday, 11AM to 7PM) <br/><br/>

                    Once your request is received, we will be responsible to pick the item from you. We will
                    initiate the refund or replacement process only if the products are received by us in their original
                    packaging with their seals, labels and bar-codes intact.
                  </p>
                  <p>
                    <Alert title="Note:" color="gray">
                      Note: If it is a case of replacement, it is subject to the availability of stock. In cases when a
                      replacement may not be available, we will refund you the full amount.
                    </Alert>
                  </p>
                  <p>
                    <strong>Return/replacement Cut-off Period</strong><br/> An order can be returned/replaced within <em>7 days</em> from when it
                    was delivered.
                  </p>
                  <p>
                    <strong>Do I have to return the free gift when I return a product? </strong><br/>
                    Yes. The free gift is included as a part of the item order and needs to be returned along with the originally delivered product.
                  </p>
                  <p>
                    <strong>Can I return part of my order? </strong><br/>
                    Yes. A return can be created at item level and if you have ordered multiple items, you can initiate a
                    return/replacement/refund for any individual item. However, any product being returned needs to be
                    returned in full including all components as well as any complimentary gifts or products which came
                    along with it.
                  </p>
                  <p>
                    <strong>How will I get refunded for the returned orders and how long will this process take? </strong><br/>
                    In case of a return/replacement/refund, we process the refund once the products have been received and
                    verified at our warehouse. <br/>

                    For payments done through online medium (Debit & Credit Cards, Wallets, UPIsn Net-banking), the refund will be processed to the same
                    account from which the payment was made within 24-48 business hours of us receiving the products back. <br/>

                    It may take 3-5 additional business days for the amount to reflect in your account.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </PageWrapper>
      </>
  )
};

export default Cancellation;
