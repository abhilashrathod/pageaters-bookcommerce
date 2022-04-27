import React from "react";
import {NextPage} from "next";

import PageWrapper from "../components/elements/PageWrapper";
import Breadcrumbs from "../components/elements/Breadcrumbs";
import PageHeadings from "../components/elements/PageHeadings";
import Head from "next/head";

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'About Pageaters', isActive: true, href: ''},
];

const About: NextPage = () => {
  return (
      <>
        <Head>

          <title>About Us</title>
          <script type="application/ld+json"
                  dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                      "@context": "https://schema.org",
                      "@type": "Organization",
                      url: process.env.NEXT_PUBLIC_SITE_URL,
                      logo: "https://res.cloudinary.com/pageaters/image/upload/v1624876170/design-4_qps5su.png"
                    }),
                  }}
          />
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
            <PageHeadings title={'About Pageaters'}/>
          </section>
        </PageWrapper>
      </>
  )
};

export default About;
