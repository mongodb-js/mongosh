import CompassServiceProvider from './compass-service-provider';
import testImplementation from './test-implementation.integration';

describe('CompassServiceProvider [integration]', function() {
  this.timeout(30000);
  testImplementation(CompassServiceProvider);
});
