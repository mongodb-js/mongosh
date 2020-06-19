// import sinon from 'sinon';
import React from 'react';
import { expect } from '../testing/chai';
import { shallow } from '../testing/enzyme';

import { Shell } from './components/shell';
import { Shell as BrowserRepl } from './index';

describe('BrowserRepl', () => {
  context('when it is required', () => {
    it('renders', () => {
      const fakeRuntime: any = {};
      const wrapper = shallow(
        <div>
          <BrowserRepl runtime={fakeRuntime} />
        </div>
      );

      expect(wrapper.find(Shell)).to.have.lengthOf(1);
    });
  });
});

