import React from 'react';
import Head from "next/head";
import PageWrapper from "../components/elements/PageWrapper";
import AppButton, {ButtonVariants} from "../components/form-controls/Button";
import {useRouter} from "next/router";

interface Props {
}

const PageError: React.FC<Props> = () => {
  const router = useRouter();

  function handleClick() {
    router.replace('/');
  }

  return (
      <>
        <Head>
          <title>Error: Page Not Found | Pageaters</title>
        </Head>
        <PageWrapper>
          <section className="custom-container">
            <div className="row">
              <div className="col">
                <br/><br/>
                <h1 className={'display-1'}>The page you requested does not exist</h1>
                <br/><br/>
                <p>
                  <AppButton variant={ButtonVariants.Default} onClick={handleClick}>
                    Navigate to Home
                  </AppButton>
                </p>
              </div>
            </div>
          </section>
        </PageWrapper>
      </>
  )
};

export default PageError;
