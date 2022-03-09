import React from 'react';
import styled from 'styled-components';

interface Props {
  title: string;
}

const EmptySectionMessage: React.FC<Props> = ({title}) => {
  return (
      <div className="custom-container">
        <div className="row">
          <div className="col">
            <h2 className={'display-1'}>{title}</h2>
          </div>
        </div>
      </div>
  )
};

export default EmptySectionMessage;
