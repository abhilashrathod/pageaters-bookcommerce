import React from 'react';
import styled from "styled-components";
import {Center} from "@mantine/core";

interface Props {
  title: string;
  illustration: any | undefined;
  illustrationHeight: string;
  illustrationWidth: string;
}

const IllustrationImage = styled.img`
  width: ${(props) => props.width};
  height: ${(props) => props.height};
  margin-bottom: 2rem;
`;

const EmptyMessageWithGraphic: React.FC<Props> = ({title, illustration, illustrationHeight, illustrationWidth}) => {
  return (
      <>
        <div className="row">
          <div className="col">
            <Center>
              <IllustrationImage src={illustration.src} alt={title} width={illustrationWidth} height={illustrationHeight}/>
            </Center>
          </div>
        </div>
        <div className="row">
          <div className="col">
            <h6 style={{textAlign: 'center'}}>{title}</h6>
          </div>
        </div>
      </>
  )

};

export default EmptyMessageWithGraphic;
