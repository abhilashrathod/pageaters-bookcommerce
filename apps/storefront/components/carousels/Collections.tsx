import React from "react";
import useSWR from "swr";
import {Skeleton} from "@mantine/core";

import EmptySectionMessage from "../elements/FailedToLoad";
import SectionHeading from "../elements/SectionHeading";
import CollectionCardSmall from "../cards/CollectionCardSmall";

import {ICollection} from "../../schemas/collection";

const CollectionsCarousel = () => {
  const {data, error} = useSWR({
    url: `/collections`,
    args: {page: 1, limit: 3, sortBy: 'priority', sortOrder: 'asc'}
  });

  if (error) return <EmptySectionMessage title={'Failed to load data...'}/>;

  return (
      <div className="custom-container">
        <div className="row">
          <div className="col">
            <SectionHeading sectionTitle={'Spotlight Collections'} navigateButtonProps={{buttonText: 'View All', buttonNavigationUrl: '/collections'}}/>
          </div>
        </div>
        <div className="row">
          {
            data
                ? data?.data?.docs.map((item: ICollection) => (
                    <div key={item.collectionId} className="col-xxl-4 col-xl-4 col-lg-4 col-md-6 col-sm-6 col-12">
                      <CollectionCardSmall collection={item}/>
                    </div>
                ))
                : [0, 0, 0].map((item: any, index) => (
                    <div key={index} className="col-xxl-4 col-xl-4 col-lg-4 col-md-6 col-sm-6 col-12">
                      <Skeleton height={350} radius="lg"/>
                    </div>
                ))
          }
        </div>
      </div>
  )
};

export default CollectionsCarousel;
