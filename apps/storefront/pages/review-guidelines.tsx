import React from 'react';
import Head from "next/head";
import {useRouter} from "next/router";

import PageWrapper from "../components/elements/PageWrapper";
import Breadcrumbs from "../components/elements/Breadcrumbs";
import PageHeadings from "../components/elements/PageHeadings";

interface Props {
}

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Review Guidelines', isActive: true, href: ''},
];

const ServerError: React.FC<Props> = () => {
  const router = useRouter();

  function handleClick() {
    router.replace('/');
  }

  return (
      <>
        <Head>
          <title>Review Guidelines | Pageaters</title>
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
            <PageHeadings title={`Rules and Guidelines`}/>
          </section>
          <section className="custom-container">
            <div className="row">
              <div className="col">
                <h6>Pageaters: Guidelines for Discussions, Reviews, and User Generated Content</h6>
                <p>
                  These guidelines apply to all places in the Pageaters Store and Community where users can post content. This includes, but is not limited to, discussions, comments, guides, product reviews, screenshots.
                </p>
                <p>
                  When providing feedback, posting information, or discussing a product in Pageaters, whether it’s negative or positive, please make sure you are being relevant, constructive and polite. Our team take feedback from all kinds of sources into account, even though they may not have the time to respond to every post or question.
                </p>
                <p>
                  Please note that Administrators/Moderators reserve the right to change/edit/delete/move/merge any content at any time if they feel it is inappropriate, abusive, or incorrectly categorized.
                </p>
                <h6>General Rules - Do not do any of the following:</h6>
                <p>
                  • Flame or insult other members <br/>
                  • Bypass any filters <br/>
                  • Abuse or encourage abuse of the Post Reporting System <br/>
                  • Post personally identifiable information (i.e. name, address, email, phone number, etc.) <br/>
                  • Bump threads <br/>
                  • Derail a thread&apos;s topic <br/>
                  • Post links to phishing sites <br/>
                  • Post spam (i.e. +1, 10char, rickrolls) or Re-post Closed, Modified, Deleted Content <br/>
                  • Repetitively post in the incorrect forum (example: trade requests belong in trading forum) <br/>
                  • Openly argue with a moderator <br/>
                  • Manipulation of the User Review system or voting/rating systems <br/>
                </p>

                <h6>Content Rules - Do not post any content on Pageaters containing the following</h6>
                <p>
                • Porn, inappropriate or offensive content, warez or leaked content or anything else not safe for work <br/>
                • Discussion of piracy or endorsing pireted content, copies or sellers <br/>
                • Threats of violence or harassment, even as a joke <br/>
                • Posted copyright material such as magazine scans <br/>
                • Soliciting, begging, auctioning, raffling, selling, advertising, referrals <br/>
                • Racism, discrimination <br/>
                • Abusive language, including swearing <br/>
                • Drugs and alcohol <br/>
                • Religious, political, and other &ldquo;prone to huge arguments&rdquo; threads <br/>
                • No Backseat Moderating <br/>
                </p>
                <p>
                  Let the moderators do the moderating. Backseat moderating is when people who are not moderators try to enforce the forum rules. If you see a person breaking the rules, take advantage of the &ldquo;Report&rdquo; button or simply ignore the offensive post(s), thread, or review.
                </p>

                <h6>Report Posts to Moderators</h6>
                <p>Should you observe a fellow Community member breaking these rules please report the post or item by clicking the &ldquo;Report&rdquo; button located on every item, post, and review.</p>

                <h6>Repeated Offenders</h6>
                <p>Repeated offenders of the above rules and guidelines will be banned from the Pageaters Community. Any moderator has the ability to ban a user for violating the rules at their discretion.</p>

                <p>Need help with Pageaters? Contact us at support@demo.pageaters.com</p>

                <p><strong>All users are subject to the Pageaters Subscriber Agreement and Pageaters Online Conduct.</strong></p>
              </div>
            </div>
          </section>
        </PageWrapper>
      </>
  )
};

export default ServerError;
