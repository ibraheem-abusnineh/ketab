// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Node globals that react-router v7's dev build expects (jsdom's Jest
// environment predates them being exposed on `globalThis`).
import { TextEncoder, TextDecoder } from 'util';
if (typeof globalThis.TextEncoder === 'undefined') {
  Object.assign(globalThis, { TextEncoder, TextDecoder });
}
