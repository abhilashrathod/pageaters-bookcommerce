import React from "react";
import { NextPage } from "next";
import Head from "next/head";

import PageWrapper from "../components/elements/PageWrapper";
import Breadcrumbs from "../components/elements/Breadcrumbs";
import PageHeadings from "../components/elements/PageHeadings";

const BREADCRUMBS_ITEMS = [
    { title: 'Home', href: '/' },
    { title: 'Store Credit Policy', isActive: true, href: '' },
];


const StoreCredit: NextPage = () => {
    return (
        <>
            <Head>
                <title>Store Credit Policy | Pageaters</title>
            </Head>
            <PageWrapper>
                <div className="custom-container">
                    <div className="row">
                        <div className="col">
                            <Breadcrumbs items={BREADCRUMBS_ITEMS} />
                        </div>
                    </div>
                </div>
                <section>
                    <PageHeadings title={`Store Credit Policy`} />
                </section>
                <section>
                    <div className="custom-container">
                        <div className="row">
                            <div className="col">
                                <h6>Pageaters: Terms and Conditions For Store Credit Policy</h6>
                                <h6></h6>
                                <p>
                                    1. Store credit is non-transferable and may only be used by the person who was issued the credit. <br />
                                    2. Store credit can only be issued by store itself and isn&apos;t in the control of customer. The issue of credit will be determined by store and can only be issued in the cases see fit by store. <br /> 
                                    3. Store credit may be used towards the purchase of any item in the store, including books and merchandise. <br />
                                    4. Store credit cannot be redeemed for cash or used to purchase additional store credit. <br />
                                    5. Store credit cannot be combined with any other promotional offer or discount. <br />
                                    6. Store credit applied to an order is used up. If the order is cancelled or refunded, only the amount paid is refunded to the original payment method; the store credit is not reinstated. <br />
                                    8. The bookstore reserves the right to cancel or modify the store credit policy at any time without prior notice. <br />
                                    9. The decision of the bookstore regarding the use and validity of store credit shall be final and binding. <br />
                                    10. Customer can&apos;t request more credit if they already have it.<br />
                                    11. Customer can&apos;t levarage store credit way out in disputes. Such behaviour will mark as abuse of the facility and will be marked illegal. In this case store can take legal action against the abuser.<br/>
                                    12. Store credit can only be used for future purchases and cannot be redeemed for cash or refunded to the original payment method.<br />
                                    13. Store credit is non-transferable and can only be used by the account holder.<br />
                                    14. Store credit does not expire unless otherwise specified by the bookstore.<br />
                                    15. The bookstore reserves the right to revoke or cancel any store credit at any time and for any reason, including but not limited to suspected fraudulent activity or abuse of the store credit system.<br />
                                    16. The bookstore is not responsible for any lost or stolen store credit.<br />
                                    17. The use of store credit is subject to the general terms and conditions of the bookstore. <br />
                                </p>
                                <p>
                                    Store credit terms and conditions will be in effect from the moment it&apos;s invoked by customer when purchased is made and credit is used.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </PageWrapper>
        </>
    )
};

export default StoreCredit;
