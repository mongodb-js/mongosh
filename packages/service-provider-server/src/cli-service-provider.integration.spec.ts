import CliServiceProvider from './compass-service-provider';
import testImplementation from './test-implementation.integration';

describe('CliServiceProvider [integration]', function() {
  this.timeout(30000);
  testImplementation(CliServiceProvider);
});
