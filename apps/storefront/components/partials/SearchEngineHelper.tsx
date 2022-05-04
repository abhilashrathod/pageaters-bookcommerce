import React from 'react';

import {SEO_SETTINGS} from "../../core/_variables";

interface Props {
  title: string;
  description: string;
  image: string;
  url: string;
  openGraphType?: string;
  schemaType?: string;
}

const socialTags = ({openGraphType, url, title, description, image}: Props) => {
  return [
    {name: "twitter:card", content: "summary_large_image"},
    {name: "twitter:site", content: SEO_SETTINGS.TWITTER_SITE},
    {name: "twitter:title", content: title},
    {name: "twitter:description", content: description},
    {name: "twitter:creator", content: SEO_SETTINGS.TWITTER_CREATOR},
    {name: "twitter:image:src", content: image},
    {name: "twitter:card", content: "summary_large_image"},
    {name: "og:title", content: title},
    {name: "og:type", content: openGraphType},
    {name: "og:url", content: url},
    {name: "og:image", content: image},
    {name: "og:description", content: description},
    {name: "og:site_name", content: SEO_SETTINGS.OPEN_GRAPH_SITE_NAME},
  ];
};

const SearchEngineHelper: React.FC<Props> = (props) => {
  const {title, description, image} = props;

  return (
      <>
        <title>{title} | App</title>
        <meta name="description" content={description}/>
        <meta itemProp="name" content={title}/>
        <meta itemProp="description" content={description}/>
        <meta itemProp="image" content={image}/>

        {
          socialTags(props).map(({name, content}) => {
            return <meta key={name} name={name} content={content}/>;
          })
        }
      </>
  )
};

export default SearchEngineHelper;
