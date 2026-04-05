import { configure, addDecorator } from '@storybook/react';
import '@storybook/addon-actions/register';
import '@storybook/addon-knobs/register';

export const parameters = {
  actions: { argTypesRegex: '^on[A-Z].*' },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};
