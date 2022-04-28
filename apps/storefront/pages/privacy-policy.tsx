import React from "react";
import {NextPage} from "next";
import Head from "next/head";

import PageWrapper from "../components/elements/PageWrapper";
import Breadcrumbs from "../components/elements/Breadcrumbs";
import PageHeadings from "../components/elements/PageHeadings";

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Privacy Policy', isActive: true, href: ''},
];

const PrivacyPolicy: NextPage = () => {
  return (
      <>
      <Head>
        <title>Privacy Policy | Pageaters</title>
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
          <PageHeadings title={`Privacy Policy`}/>
        </section>
        <section>
          <div className="custom-container">
            <div className="row">
              <div className="col">
                <h6>This Privacy Policy applies to the pageaters.com</h6>
                <p>
                  Pageaters recognises the importance of maintaining your privacy. We value your privacy and
                  appreciate your
                  trust in us. This Policy describes how we treat user information we collect on h
                  ttps://www.pageaters.com and other
                  offline sources. This Privacy Policy applies to current and former visitors to our website and to our
                  online customers.
                  By visiting and/or using our website, you agree to this Privacy Policy. <br/>
                  {/*<address>*/}
                  {/*  pageaters.com is a property of Pageaters Private Limited, an Indian Company registered under the*/}
                  {/*  Companies*/}
                  {/*  Act, 2013 having its registered office at C5, <br/>*/}
                  {/*  Plot No. 57, Kailash Tower, Mandir Marg, Saidullajas, Ignou Road, New <br/>*/}
                  {/*  Delhi, Delhi 110<br/>*/}
                  {/*  030.<br/>*/}
                  {/*</address>*/}
                </p>

                <h6>Information we collect</h6>
                <p>
                  <strong>Contact information.</strong> We might collect your name, email, mobile number,
                  street, city, state, pincode,
                  country and ip address.
                </p>
                <p>
                  <strong>Payment and billing information.</strong> We might collect your billing name, billing address
                  and payment method when
                  you buy place an order. <em> We NEVER collect your credit card number or credit card expiry date or other
                  details pertaining to
                  your credit card on our website.</em> Credit card information will be obtained and processed by our
                  online payment partner
                  Razorpay.
                </p>
                <p>
                  <strong>Information you post.</strong> We collect information you post in a public space on our
                  website or on a thirdparty
                  social media site belonging to pageaters.com.
                </p>
                <p>
                  <strong>Demographic information.</strong> We may collect demographic information about you, books you
                  like, orders you place, or any other information provided by your during the use of our website.
                  We might collect this as a part of a survey also and analytics.
                </p>
                <p>
                  <strong>Other information.</strong> If you use our website, we may collect information about your IP
                  address and the browser you&apos;re using. We might look at what site you came from, duration of time spent
                  on our website, pages accessed. We might also collect the type of
                  mobile device you are using, or the version of the operating system your computer or device is running.
                </p>

                <h6>We collect information in different ways.</h6>
                <p>
                  <strong>We collect information directly from you.</strong> We collect information directly from you
                  when you register for an account or when you place orders. We also collect information if you post a
                  comment on our websites or ask us a question through phone or email.
                </p>
                <p>
                  <strong>We collect information from you passively.</strong> We use tracking tools like Google Analytics,
                  Facebook Pixel, Amplitude analytics and browser cookies for collecting information about your usage of our website.
                </p>
                <p>
                  <strong>We get information about you from third parties.</strong> For example, if you use an
                  integrated social media feature on our websites.
                </p>

                <h6>Use of your personal information</h6>
                <p>
                  <strong>We use information to contact you.</strong> We might use the information you provide to
                  contact you for confirmation of a purchase on our website or for other promotional purposes.
                </p>
                <p>
                  <strong>We use information to respond to your requests or questions.</strong> We might use your
                  information to confirm your registration, or fulfill any or your queries or requests.
                </p>
                <p>
                  <strong>We use information to improve our products and services.</strong> We might use your
                  information to customize your experience with us. This could include displaying content based upon your preferences.
                  We use information to look at site trends and customer interests. We may use your information to make our
                  website and products better. We may combine information we get from you with information about you we get from
                  third parties.
                </p>
                <p>
                  <strong>We use information for security purposes.</strong> We may use information to protect our
                  company, our customers, or our websites.
                </p>
                <p>
                  <strong>We use information for marketing purposes.</strong> We might send you information about special promotions or
                  offers.
                </p>
                <p>
                  <strong>We might also tell you about new features or products.</strong> These might be our own offers or products, or
                  thirdparty offers or products we think you might find interesting.
                </p>
                <p>
                  <strong>We use information to send you transactional communications.</strong> We might send you emails
                  or SMS about your account updates, security or an order communication.
                </p>
                <p>
                  <strong>We use information as otherwise permitted by law.</strong>
                </p>

                <h6>Sharing of information with thirdparties</h6>
                <p>
                  <strong>We will share information with third parties who perform services on our behalf.</strong> We
                  share information with vendors who help with delivery of goods, manage our payment processors or
                  transactional message processors, Email and SMS providers, analytics providers and server providers. Some vendors may be located outside of India.
                </p>
                <p>
                  <strong>We may share information if we think we have to in order to comply with the law or to protect ourselves.</strong>
                  We will share information to respond to a court order or subpoena. We may also share it if a government
                  agency or investigatory body requests. Or, we might also share information when we are investigating potential
                  fraud. We may share information with any successor to all or part of our business. For example, if part of
                  our business is sold we may give our customer list as part of that transaction.
                </p>
                <p><strong>We don&apos;t sell your personal data to any third party for profits</strong> And we never will.</p>
                <p>
                  <strong>We may share your information for reasons not described in this policy.</strong> We will tell
                  you before we do this.
                </p>

                <h6>Email OptOut</h6>
                <p>
                  You can opt out of receiving our marketing emails. To stop receiving our promotional emails, please
                  email
                  support@demo.pageaters.com. It may take about 3-5 days to process your request. Even if you opt out
                  of getting marketing messages, we will still be sending you transactional messages through email and SMS about
                  your purchases.
                </p>

                <h6>Third party sites</h6>
                <p>
                  If you click on one of the links to third party websites, you may be taken to websites we do not
                  control. This policy does not apply to the privacy practices of those websites. Read the privacy policy of other websites
                  carefully. We are not responsible for these third party sites.
                </p>

                <h6>Grievance Officer</h6>
                <p>
                  In accordance with Information Technology Act 2000 and rules made there under, the name and contact
                  details of the
                  Grievance Officer are provided below:<br/>
                  Mr. Abhilash Rathod <br/>
                  Unit 1, <br/>
                  Demo Logistics Park, Sector 1 <br/>
                  Gujarat - 382016 <br/>
                  Phone: +91-9000000000 <br/>
                  Email: support@demo.pageaters.com <br/>
                </p>
                <p>
                  If you have any questions about this Policy or other privacy concerns, you can also email us at
                  support@demo.pageaters.com</p>

                <h6>Updates to this policy</h6>
                <p> This Privacy Policy was last updated on 01.MAY.2022. From time to time we may change our privacy
                  practices. We will notify you of any material changes to this policy as required by law. We will also post an updated
                  copy on our website. Please check our site periodically for updates.
                </p>

                <h6>Jurisdiction</h6>
                <p>
                  If you choose to visit the website, your visit and any dispute over privacy is subject to this Policy
                  and the website&apos;s terms of use. In addition to the foregoing, any disputes arising under this Policy
                  shall be governed by the laws of India.
                </p>
              </div>
            </div>
          </div>
        </section>
      </PageWrapper>
      </>
  )
};

export default PrivacyPolicy;
