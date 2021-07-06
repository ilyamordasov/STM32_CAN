// global.js
// Source: https://github.com/maximakymenko/react-day-night-toggle-app/blob/master/src/global.js#L23-L41

import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  *,
  *::after,
  *::before {
    box-sizing: border-box;
  }
  html{
    height: 100%;
    width: 100%;
    overflow: auto;
  }
  body {
    align-items: center;
    background: ${({ theme }) => theme.body};
    color: ${({ theme }) => theme.text};
    overscroll-behavior: none;
    height: 100%;
    width: 100%;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }

  .container {
    width: auto;
    margin-top: 24px;
  }

  .alice-carousel__dots {
    bottom: 20px;
  }

  .alice-carousel__dots-item:not(.__custom) {
    background-color: ${({ theme }) => theme.carouselDefault};
  }

  .alice-carousel__dots-item:not(.__custom):hover, .alice-carousel__dots-item:not(.__custom).__active {
    background-color: ${({ theme }) => theme.carouselActive};
  }

  .bleoff {
    max-width: 512px;
    max-height: 512px;
    opacity: 0.1;
    stroke: ${({ theme }) => theme.text};
  }

  .svg {
    stroke: ${({ theme }) => theme.text};
  }

  textarea {
    width: 90vw;
    height: 55vh;
    border: none;
    width: -moz-available;
    width: -webkit-fill-available;
  }

  .btn-link {
    text-decoration: none;
  }

  .item {
    border-radius: 8px;
    margin-right: 16px;
    margin-bottom: 32px;
    font-weight: 700;
    font-size: 20px;
  }

  .item span {
    font-size: 10px;
    text-transform: uppercase;
    font-weight: 400;
  }

  .item sup {
    font-size: 12px;
    font-weight: 400;
  }

  canvas {
    background-color: ${({ theme }) => theme.body};
    height: 140px;
  }

  .indicator {
    color: ${({ theme }) => theme.text};
  }
  @media (min-width:320px)  {
    .indicator:before {
      font-size: 10px;
    }
  }
  @media (min-width:900px) {
    .indicator:before {
      font-size: 16px;
    }
  }
  .indicator:before {
    content: "●";
    margin-right: 4px;
    color: #4954E2;
  }

  .blue:before { color: #4954E2; }
  .red:before { color: #F90AC4; }
  .magenda:before { color: #0AF9F9; }
}
`;