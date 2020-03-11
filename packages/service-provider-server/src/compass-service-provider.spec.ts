import CompassServiceProvider from './compass-service-provider';
import { expect } from 'chai';
import testImplementation from './test-implementation.unit';

describe('CompassServiceProvider', () => {
  describe('fromDataService', () => {
    it('creates a new CompassServiceProvider', () => {
      const instance = CompassServiceProvider.fromDataService({
        client: {
          client: {} as any
        }
      });

      expect(instance).to.be.instanceOf(CompassServiceProvider);
    });
  });


  testImplementation(CompassServiceProvider);
});
