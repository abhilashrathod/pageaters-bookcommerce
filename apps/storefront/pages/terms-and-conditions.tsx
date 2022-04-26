import React from "react";
import {NextPage} from "next";

import PageWrapper from "../components/elements/PageWrapper";
import Breadcrumbs from "../components/elements/Breadcrumbs";
import PageHeadings from "../components/elements/PageHeadings";

const BREADCRUMBS_ITEMS = [
  {title: 'Home', href: '/'},
  {title: 'Terms of Use', isActive: true, href: ''},
];

const Terms: NextPage = () => {
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
          <PageHeadings title={`Terms and Conditions`}/>
        </section>
        <section>
          <div className="custom-container">
            <div className="row">
              <div className="col">
                <h6>TERMS OF SERVICE AGREEMENT</h6>
                <p>LAST REVISION: [01.MAY.2022]</p>
                <p>PLEASE READ THIS TERMS OF SERVICE AGREEMENT CAREFULLY. BY USING THIS WEBSITE OR ORDERING PRODUCTS
                  FROM THIS WEBSITE YOU AGREE TO BE BOUND BY ALL OF THE TERMS AND CONDITIONS OF THIS AGREEMENT.</p>
                <p>
                  This Terms of Service Agreement (the &#34;Agreement&#34;) governs your use of this website,
                  [https://pageaters.com] (the &#34;Website&#34;), Pageaters Inc. (&#34;Pageaters Inc&#34;) offer of products for
                  purchase on this Website, or your purchase of products available on this Website. This Agreement
                  includes, and incorporates by this reference, the policies and guidelines referenced below. [Pageaters Inc]
                  reserves the right to change or revise the terms and conditions of this Agreement at any time by
                  posting any changes or a revised Agreement on this Website. Pageaters Inc. will alert you that
                  changes or revisions have been made by indicating on the top of this Agreement the date it was last
                  revised. The changed or revised Agreement will be effective immediately after it is posted on this
                  Website. Your use of the Website following the posting any such changes or of a revised Agreement will
                  constitute your acceptance of any such changes or revisions. Pageaters Inc. encourages you to review
                  this Agreement whenever you visit the Website to make sure that you understand the terms and
                  conditions governing use of the Website. This Agreement does not alter in any way the terms or
                  conditions of any other written agreement you may have with Pageaters Inc. for other products or
                  services. If you do not agree to this Agreement (including any referenced policies or guidelines),
                  please immediately terminate your use of the Website. If you would like to print this Agreement,
                  please click the print button on your browser toolbar.
                </p>

                <h6>1. PRODUCTS</h6>
                <p>Terms of Offer. This Website offers for sale certain products (the &#34;Products&#34;). By placing an order
                  for Products through this Website, you agree to the terms set forth in this Agreement.</p>
                <p><strong>Customer Solicitation:</strong> Unless you notify our third party call center reps or direct
                  Pageaters Inc. sales reps, while they are calling you, of your desire to opt out from further direct
                  company communications and solicitations, you are agreeing to continue to receive further emails and
                  call solicitations Pageaters Inc. and its designated in house or third party call team(s).</p>
                <strong>Opt Out Procedure:</strong> We provide 3 easy ways to opt out of from future solicitations.
                <p>
                  • You may use the opt out link found in any email solicitation that you may receive. <br/>
                  • You may also choose to opt out, via sending your email address to: support@demo.pageaters.com. <br/>
                  • You may send a written remove request to A102, Aakar Lowrise, Vavol-Uvarsad Road, Gandhinagar,
                  GJ-382016. <br/>
                </p>
                <p> Proprietary Rights. Pageaters Inc. has proprietary rights and trade secrets in the Products. You
                  may not copy, reproduce, resell or redistribute any Product manufactured and/or distributed by
                  Pageaters Inc. . Pageaters Inc. also has rights to all trademarks and trade dress and specific
                  layouts of this webpage, including calls to action, text placement, images and other information.</p>
                <p>
                  Sales Tax. If you purchase any Products, you will be responsible for paying any applicable sales tax.
                </p>

                <h6>2. Website</h6>
                <p>
                  Content; Intellectual Property; Third Party Links. In addition to making Products available, this
                  Website also offers information and marketing materials. This Website also offers information, both
                  directly and through indirect links to third-party websites, about books, authors and publishers.
                  Pageaters Inc. does not always create the information offered on this Website; instead the
                  information is often gathered from other sources. To the extent that Pageaters Inc. does create the
                  content on this Website, such content is protected by intellectual property laws of the India, foreign
                  nations, and international bodies. Unauthorized use of the material may violate copyright, trademark,
                  and/or other laws. You acknowledge that your use of the content on this Website is for personal,
                  noncommercial use. Any links to third-party websites are provided solely as a convenience to you.
                  Pageaters Inc. does not endorse the contents on any such third-party websites. Pageaters Inc. is not
                  responsible for the content of or any damage that may result from your access to or reliance on these
                  third-party websites. If you link to third-party websites, you do so at your own risk.</p>
                <p>
                  Use of Website; Pageaters Inc. is not responsible for any damages resulting from use of this website
                  by anyone. You will not use the Website for illegal purposes. You will (1) abide by all applicable
                  local, state, national, and international laws and regulations in your use of the Website (including
                  laws regarding intellectual property), (2) not interfere with or disrupt the use and enjoyment of the
                  Website by other users, (3) not resell material on the Website, (4) not engage, directly or
                  indirectly, in transmission of &#34;spam&#34;, chain letters, junk mail or any other type of unsolicited
                  communication, and (5) not defame, harass, abuse, or disrupt other users of the Website
                </p>
                <p>
                  License. By using this Website, you are granted a limited, non-exclusive, non-transferable right to
                  use the content and materials on the Website in connection with your normal, noncommercial, use of the
                  Website. You may not copy, reproduce, transmit, distribute, or create derivative works of such content
                  or information without express written authorization from Pageaters Inc. or the applicable third
                  party (if third party content is at issue).
                </p>
                <p>
                  Posting. By posting, storing, or transmitting any content on the Website, you hereby grant [Pageaters Inc]
                  a perpetual, worldwide, non-exclusive, royalty-free, assignable, right and license to use, copy,
                  display, perform, create derivative works from, distribute, have distributed, transmit and assign such
                  content in any form, in all media now known or hereinafter created, anywhere in the world. [Pageaters Inc]
                  does not have the ability to control the nature of the user-generated content offered through
                  the Website. You are solely responsible for your interactions with other users of the Website and any
                  content you post. Pageaters Inc. is not liable for any damage or harm resulting from any posts by or
                  interactions between users. Pageaters Inc. reserves the right, but has no obligation, to monitor
                  interactions between and among users of the Website and to remove any content Pageaters Inc. deems
                  objectionable, in Pageaters&apos; sole discretion.
                </p>

                <h6>3. DISCLAIMER OF WARRANTIES</h6>
                <p> THE WEBSITE AND PRODUCTS ARE OFFERED ON AN &#34;AS IS&#34; AND &#34;AS AVAILABLE&#34; BASIS. Pageaters Inc.
                  EXPRESSLY DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED
                  TO, IMPLIED WARRANTIES OF MERCHANTABILITY, AND NON-INFRINGEMENT WITH RESPECT TO THE PRODUCTS OR
                  WEBSITE CONTENT, OR ANY RELIANCE UPON OR USE OF THE WEBSITE CONTENT OR PRODUCTS. (&#34;PRODUCTS&#34; INCLUDE
                  TRIAL PRODUCTS.)
                </p>
                <p> WITHOUT LIMITING THE GENERALITY OF THE FOREGOING, Pageaters Inc. MAKES NO WARRANTY: </p>
                <p> THAT THE INFORMATION PROVIDED ON THIS WEBSITE IS ACCURATE, RELIABLE, COMPLETE, OR TIMELY. </p>
                <p> THAT THE LINKS TO THIRD-PARTY WEBSITES ARE TO INFORMATION THAT IS ACCURATE, RELIABLE, COMPLETE, OR
                  TIMELY. </p>
                <p> NO ADVICE OR INFORMATION, WHETHER ORAL OR WRITTEN, OBTAINED BY YOU FROM THIS WEBSITE WILL CREATE ANY
                  WARRANTY NOT EXPRESSLY STATED HEREIN. </p>
                <p> AS TO THE RESULTS THAT MAY BE OBTAINED FROM THE USE OF THE PRODUCTS OR THAT DEFECTS IN PRODUCTS WILL
                  BE CORRECTED. </p>
                <p> REGARDING ANY PRODUCTS PURCHASED OR OBTAINED THROUGH THE WEBSITE. </p>
                <p> SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF CERTAIN WARRANTIES, SO SOME OF THE ABOVE EXCLUSIONS
                  MAY NOT APPLY TO YOU. </p>


                <h6>4. LIMITATION OF LIABILITY</h6>
                <p>Pageaters Inc. ENTIRE LIABILITY, AND YOUR EXCLUSIVE REMEDY, IN LAW, IN EQUITY, OR OTHWERWISE, WITH
                  RESPECT TO THE WEBSITE CONTENT AND PRODUCTS AND/OR FOR ANY BREACH OF THIS AGREEMENT IS SOLELY LIMITED
                  TO THE AMOUNT YOU PAID, LESS SHIPPING AND HANDLING, FOR PRODUCTS PURCHASED VIA THE WEBSITE.</p>

                <p>Pageaters Inc. WILL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL OR CONSEQUENTIAL
                  DAMAGES IN CONNECTION WITH THIS AGREEMENT OR THE PRODUCTS IN ANY MANNER, INCLUDING LIABILITIES
                  RESULTING FROM <br/>
                  (1) THE USE OR THE INABILITY TO USE THE WEBSITE CONTENT OR PRODUCTS; <br/>
                  (2) THE COST OF PROCURING SUBSTITUTE PRODUCTS OR CONTENT; <br/>
                  (3) ANY PRODUCTS PURCHASED OR OBTAINED OR TRANSACTIONS ENTERED INTO THROUGH THE WEBSITE; OR <br/>
                  (4) ANY LOST PROFITS YOU ALLEGE. <br/>
                </p>
                <p>SOME JURISDICTIONS DO NOT ALLOW THE LIMITATION OR EXCLUSION OF LIABILITY FOR INCIDENTAL OR
                  CONSEQUENTIAL DAMAGES SO SOME OF THE ABOVE LIMITATIONS MAY NOT APPLY TO YOU.</p>

                <h6>
                  5. INDEMNIFICATION
                </h6>
                <p>
                  You will release, indemnify, defend and hold harmless Pageaters Inc. , and any of its contractors,
                  agents, employees, officers, directors, shareholders, affiliates and assigns from all liabilities,
                  claims, damages, costs and expenses, including reasonable attorneys&apos; fees and expenses, of third
                  parties relating to or arising out of <br/>
                  (1) this Agreement or the breach of your warranties, representations and obligations under this
                  Agreement; <br/>
                  (2) the Website content or your use of the Website content; <br/>
                  (3) the Products or your use of the Products (including Trial Products); <br/>
                  (4) any intellectual property or other proprietary right of any person or entity; <br/>
                  (5) your violation of any provision of this Agreement; or <br/>
                  (6) any information or data you supplied to Pageaters Inc. . When Pageaters Inc. is threatened with
                  suit or sued by a third party, Pageaters Inc. may seek written assurances from you concerning your
                  promise to indemnify Pageaters Inc. ; your failure to provide such assurances may be considered by
                  Pageaters Inc. to be a material breach of this Agreement. Pageaters Inc. will have the right to
                  participate in any defense by you of a third-party claim related to your use of any of the Website
                  content or Products, with counsel of Pageaters Inc. choice at its expense. Pageaters Inc. will
                  reasonably cooperate in any defense by you of a third-party claim at your request and expense. You
                  will have sole responsibility to defend Pageaters Inc. against any claim, but you must receive
                  Pageaters Inc. prior written consent regarding any related settlement. The terms of this provision
                  will survive any termination or cancellation of this Agreement or your use of the Website or Products.<br/>
                </p>

                <h6>6. PRIVACY</h6>
                <p>
                  Pageaters Inc. believes strongly in protecting user privacy and providing you with notice of
                  Pageaters&apos; use of data. Please refer to Pageaters Inc. privacy policy, incorporated by reference
                  herein, that is posted on the Website.</p>

                <h6>7. AGREEMENT TO BE BOUND</h6>
                <p>
                  By using this Website or ordering Products, you acknowledge that you have read and agree to be bound
                  by this Agreement and all terms and conditions on this Website.
                </p>

                <h6>8. GENERAL</h6>
                <p>
                  Force Majeure. Pageaters Inc. will not be deemed in default hereunder or held responsible for any
                  cessation, interruption or delay in the performance of its obligations hereunder due to earthquake,
                  flood, fire, storm, natural disaster, act of God, war, terrorism, armed conflict, labor strike,
                  lockout, or boycott.
                </p>
                <p>Cessation of Operation. Pageaters Inc. may at any time, in its sole discretion and without advance
                  notice to you, cease operation of the Website and distribution of the Products.</p>
                <p> Entire Agreement. This Agreement comprises the entire agreement between you and Pageaters Inc. and
                  supersedes any prior agreements pertaining to the subject matter contained herein. </p>
                <p>
                  Effect of Waiver. The failure of Pageaters Inc. to exercise or enforce any right or provision of this
                  Agreement will not constitute a waiver of such right or provision. If any provision of this Agreement
                  is
                  found by a court of competent jurisdiction to be invalid, the parties nevertheless agree that the
                  court
                  should endeavor to give effect to the parties&apos; intentions as reflected in the provision, and the other
                  provisions of this Agreement remain in full force and effect.
                </p>
                <p>
                  Governing Law; Jurisdiction. This Website originates from the [Gandhinagar, GJ]. This Agreement will be
                  governed by the laws of the State of [Gujarat] without regard to its conflict of law principles
                  to the contrary. Neither you nor Pageaters Inc. will commence or prosecute any suit, proceeding or
                  claim to enforce the provisions of this Agreement, to recover damages for breach of or default of this
                  Agreement, or otherwise arising under or by reason of this Agreement, other than in courts located in
                  State of [State Name]. By using this Website or ordering Products, you consent to the jurisdiction and
                  venue of such courts in connection with any action, suit, proceeding or claim arising under or by
                  reason
                  of this Agreement. You hereby waive any right to trial by jury arising out of this Agreement and any
                  related documents.
                </p>
                <p>
                  Statute of Limitation. You agree that regardless of any statute or law to the contrary, any claim or
                  cause of action arising out of or related to use of the Website or Products or this Agreement must be
                  filed within one (1) year after such claim or cause of action arose or be forever barred.
                </p>
                <p>
                  Waiver of Class Action Rights. BY ENTERING INTO THIS AGREEMENT, YOU HEREBY IRREVOCABLY WAIVE ANY RIGHT
                  YOU MAY HAVE TO JOIN CLAIMS WITH THOSE OF OTHER IN THE FORM OF A CLASS ACTION OR SIMILAR PROCEDURAL
                  DEVICE. ANY CLAIMS ARISING OUT OF, RELATING TO, OR CONNECTION WITH THIS AGREEMENT MUST BE ASSERTED
                  INDIVIDUALLY.
                </p>
                <p>
                  Termination. Pageaters Inc. reserves the right to terminate your access to the Website if it
                  reasonably
                  believes, in its sole discretion, that you have breached any of the terms and conditions of this
                  Agreement. Following termination, you will not be permitted to use the Website and Pageaters Inc.
                  may,
                  in its sole discretion and without advance notice to you, cancel any outstanding orders for Products.
                  If
                  your access to the Website is terminated, Pageaters Inc. reserves the right to exercise whatever
                  means
                  it deems necessary to prevent unauthorized access of the Website. This Agreement will survive
                  indefinitely unless and until Pageaters Inc. chooses, in its sole discretion and without advance to
                  you, to terminate it.
                </p>
                <p>
                  Domestic Use. Pageaters Inc. makes no representation that the Website or Products are appropriate or
                  available for use in locations outside India. Users who access the Website from outside India do so at
                  their own risk and initiative and must bear all responsibility for compliance with any applicable
                  local
                  laws. Assignment. You may not assign your rights and obligations under this Agreement to anyone.
                  Pageaters Inc. may assign its rights and obligations under this Agreement in its sole discretion and
                  without advance notice to you.
                </p>
                <p>
                  BY USING THIS WEBSITE OR ORDERING PRODUCTS FROM THIS WEBSITE YOU AGREE
                </p>
                <p>
                  TO BE BOUND BY ALL OF THE TERMS AND CONDITIONS OF THIS AGREEMENT.
                </p>
              </div>
            </div>
          </div>
        </section>
      </PageWrapper>
  )
};

export default Terms;

