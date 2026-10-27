import React from 'react';
import styled from 'styled-components';

interface Props {
  title: string;
}

const HeadingText = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const PageHeadings: React.FC<Props> = ({title}) => {
  return (
      <>
        <div className="custom-container">
          <div className="row">
            <div className="col-12">
              <HeadingText>
                <h1 className={'display-1'}>
                  {title}
                </h1>
              </HeadingText>
            </div>
          </div>
        </div>
      </>
  )
};

export default PageHeadings;
