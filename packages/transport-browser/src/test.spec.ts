import { expect } from 'chai';

describe('spiking karma', function() {
  this.timeout(30000);

  it('runs the test', (done) => {
    setTimeout(() => {
      expect(true).to.equal(true);
      done();
    }, 3000);
  });
});
