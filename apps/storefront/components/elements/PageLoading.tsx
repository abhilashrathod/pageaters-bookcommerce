import React from "react";
import styled from "styled-components";

const LoadingBackdrop = styled.div`
  position: fixed;
  width: 100vw;
  height: 100vh;
  z-index: 21;
  background-color: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  top: 0;
  left: 0;  
`;

interface Props {
  visible: boolean;
}

const PageLoader: React.FC<Props> = ({visible, children}) => {
    return (
      <>
        {
          visible
            ? <LoadingBackdrop>
                {children}
              </LoadingBackdrop>
            : <></>
        }
      </>
    )
};

export default PageLoader;
