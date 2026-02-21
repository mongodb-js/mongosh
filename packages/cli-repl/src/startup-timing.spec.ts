import { TimingCategories, type TimingCategory } from '@mongosh/types';
import { resetTimingData, summariseTimingData } from './startup-timing';
import { expect } from 'chai';

// Reset timing data after each test to avoid large
// amounts of timing entries accumulating and causing
// the test suite to eventually slow down.
afterEach(resetTimingData);

describe('startup timing', function () {
  describe('summariseTimingData', function () {
    it('should calculate durations of each category in milliseconds', function () {
      const timingData: [TimingCategory, string, number][] = [
        [TimingCategories.REPLInstantiation, '1 REPL', 50000000],
        [TimingCategories.Main, '1 Main', 60000000],
        [TimingCategories.REPLInstantiation, '2 REPL', 140000000],
        [TimingCategories.Main, '2 Main', 150000000],
      ];

      const summary = summariseTimingData(timingData);
      expect(summary).to.deep.equal({
        [TimingCategories.REPLInstantiation]: 130,
        [TimingCategories.Main]: 20,
      });
    });
  });
});
