import base from './index.js';

/** @type {import('prettier').Config} */
export default {
  ...base,
  plugins: ['prettier-plugin-tailwindcss'],
};
