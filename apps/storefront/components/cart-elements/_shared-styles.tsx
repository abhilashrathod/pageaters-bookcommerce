import styled from "styled-components";
import {LIGHT_COLOR, SM} from "../../core/_variables";

export const Crossed = styled.span`
  margin-right: 0.5rem;
  text-decoration: line-through;
  color: ${LIGHT_COLOR};
`;

export const CartItem = styled.div`
    position: relative;
    display: flex;
    align-items: center;
`;

export const CartContent = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
`;

export const CartImage = styled.img`
  width: 75px;
  height: 100px;
  cursor: pointer;
  border-radius: 0.5rem;
  object-fit: cover;
  -webkit-box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.16);
  -moz-box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.16);
  box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.16);
  
  @media screen and (max-width: ${SM - 1}px) {      
    width: 95px;
    height: 110px;
  }
`;

export const CartProductInfo = styled.div`
  margin-left: 1rem;
  width: 100%;
`;

export const CartProductTitle = styled.p`
  margin-bottom: 0;
  cursor: pointer;
  font-weight: 600;
`;

export const CartActions = styled.span`
  display: flex;
  align-items: center;
  margin-left: 2rem;
`;

export const CartQuantity = styled.span`
  display: flex;
  align-items: center;  
`;

export const CartActionsWrapper = styled.div`
  margin-bottom: 1rem;
  display: flex;
`;
