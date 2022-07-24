import React from 'react';
import styled from 'styled-components';
import useSWR from "swr";
import {get} from 'lodash';

import SectionHeading from "../elements/SectionHeading";

import {getAssetImage} from "../../core/_imageRendererHelper";
import {MD} from "../../core/_variables";
import {useRouter} from "next/router";
import EmptySectionMessage from "../elements/FailedToLoad";

interface Props {
}

const DealsWrapper = styled.div`
  display: grid;
  grid-template-columns: 5fr 2.5fr 2.5fr;
  grid-gap: 1rem;
  
  @media screen and (max-width: ${MD - 1}px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const PrimaryTile = styled.div`
  width: 100%;
  
  @media screen and (max-width: ${MD - 1}px) {
    grid-column: 1 / 6;
  }
`;

const SecondTile = styled.div`
  width: 100%;  
  
  @media screen and (max-width: ${MD - 1}px) {
   grid-column: 1 / 3;
  }
`;

const ThirdTile = styled.div`
  width: 100%;  
  
  @media screen and (max-width: ${MD - 1}px) {
    grid-column: 3 / 6; 
  }
`;

const PosterImg = styled.img`
  width: 100%;
  height: 100%;
  border-radius: 1rem;
  filter: drop-shadow(0px 4px 3px rgba(0, 0, 0, 0.20)) !important;
`;

const FeaturedDeals: React.FC<Props> = () => {
  const {data: storeDealRes, error: storeDealErr} = useSWR({
    url: `/deals`,
    args: {page: 2, limit: 3, offset: 1, sortBy: 'priority', sortOrder: 'asc'}
  });

  const router = useRouter();
  const discount = get(storeDealRes, 'data.docs', []);

  function renderImageSize(i: string, w: number, h: number) {
    return getAssetImage(i, {height: h, width: w, fit: 'cover'});
  }

  function handleNavigation(id: string) {
    router.push(`/deals/${id}`);
  }

  if (storeDealErr) return <EmptySectionMessage title={'Failed to Deals...'}/>;

  return (
      <>
        <div className={'custom-container'}>
          <div className="row">
            <div className="col">
              <SectionHeading sectionTitle={`Featured Deals`}/>
            </div>
          </div>
          <div className="row">
            <div className="col">
              <DealsWrapper>
                <PrimaryTile onClick={() => handleNavigation(get(discount, '[0].dealId', ''))}>
                  <PosterImg src={renderImageSize(get(discount, '[0].poster', ''), 1024, 400)} width={720} height={400}
                             loading={'lazy'}/>
                </PrimaryTile>
                <SecondTile onClick={() => handleNavigation(get(discount, '[1].dealId', ''))}>
                  <PosterImg src={renderImageSize(get(discount, '[1].poster', ''), 500, 400)} width={500} height={400}
                             loading={'lazy'}/>
                </SecondTile>
                <ThirdTile onClick={() => handleNavigation(get(discount, '[2].dealId', ''))}>
                  <PosterImg src={renderImageSize(get(discount, '[2].poster', ''), 500, 400)} width={500} height={400}
                             loading={'lazy'}/>
                </ThirdTile>
              </DealsWrapper>
            </div>
          </div>
        </div>

      </>
  )
};

export default FeaturedDeals;
