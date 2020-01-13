import { expect } from 'chai';
import React from 'react';
import { configure, shallow} from 'enzyme';
import * as Adapter from 'enzyme-adapter-react-16';
configure({adapter: new Adapter()});

import BrowserRepl from './browser-repl';

describe('HelloWorld component enzyme', () => {
    it('should render correctly', () => {
      const wrapper = shallow(<BrowserRepl name='Test' />)
      expect(wrapper.text()).to.equal('Hello Test');
    });
});
