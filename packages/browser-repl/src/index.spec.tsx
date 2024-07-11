import React from 'react';
import { Shell } from './index';
import { expect } from '../testing/chai';
import { mount } from '../testing/enzyme';

describe('Shell', function () {
  it('should provide access to ref', function () {
    const ref = React.createRef<any>();
    mount(<Shell ref={ref} runtime={{} as any}></Shell>);
    expect(ref.current).to.have.property('state');
    expect(ref.current).to.have.property('props');
    expect(ref.current).to.have.property('editor');
  });
});
