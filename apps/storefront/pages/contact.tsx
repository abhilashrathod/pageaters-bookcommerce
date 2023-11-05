import React from 'react';
import styled from 'styled-components';
import Head from "next/head";
import {Icon} from "@iconify/react";
import {useRouter} from "next/router";

import PageWrapper from "../components/elements/PageWrapper";
import Breadcrumbs from "../components/elements/Breadcrumbs";
import PageHeadings from "../components/elements/PageHeadings";

import {ACCENT_COLOR, PRIMARY_COLOR, SECONDARY_ACCENT_COLOR, SECONDARY_COLOR} from "../core/_variables";

interface Props {
}

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Contact Us', isActive: true, href: ''},
];

const ContactCard = styled.div`
  padding: 3rem 1rem;
  cursor: pointer;
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  border: 1px solid #ddd;
  border-radius: 1rem;
  color: ${PRIMARY_COLOR};
  min-height: 200px;
`;

const IconSpace = styled.span`
  padding: 0.5rem;
  display: inline-flex;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
`;

const ContentSpace = styled.span`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Title = styled.h6`
  margin-bottom: 0;
`;

const Contact: React.FC<Props> = () => {
  const router = useRouter();

  function handleEmail() {
    router.push('mailto:support@demo.pageaters.com');
  }

  function handleContact() {
    router.push('tel:+91-9000000000');
  }

  function handleWhatsApp() {
    router.push('https://wa.me/+919000000000');
  }

  function handleInstagram() {
    router.push('https://instagram.com/the.pageaters');
  }

  return (
      <>
        <Head>
          <title>Contact Us | Pageaters</title>
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
            <PageHeadings title={`Contact Us`}/>
          </section>
          <section>
            <div className="custom-container">
              <div className="row">
                <div className="col-9">
                  <h6>
                    Don’t worry over anything bookish, we’re here to help! Get in touch with us for any order questions,
                    book recs and general feedback. We’re hungry for all of your thoughts!
                  </h6>
                </div>
              </div>
            </div>
            <div style={{marginTop: '3rem'}} className="container">
              <div className="row">
                <div className="col-xl-3 col-xxl-3 col-12">
                  <ContactCard onClick={handleEmail}>
                    <IconSpace>
                      <Icon height={48} width={48} color={SECONDARY_ACCENT_COLOR} icon={'ic:outline-email'}/>
                    </IconSpace>
                    <ContentSpace>
                      <span>Write to us</span>
                      <Title>Via Email</Title>
                    </ContentSpace>
                  </ContactCard>
                </div>
              </div>
            </div>
          </section>
        </PageWrapper>
      </>
  )
};

export default Contact;
