import { expect } from 'chai';
import { ToggleableAnalytics, MongoshAnalytics } from './analytics-helpers';

describe('ToggleableAnalytics', () => {
  let events: any[];
  let target: MongoshAnalytics;

  beforeEach(() => {
    events = [];
    target = {
      identify(info: any) { events.push(['identify', info]); },
      track(info: any) { events.push(['track', info]); }
    };
  });

  it('starts out in paused state and can be toggled on and off', () => {
    const toggleable = new ToggleableAnalytics(target);
    expect(events).to.have.lengthOf(0);

    toggleable.identify({ userId: 'me', traits: { platform: '1234' } });
    toggleable.track({ userId: 'me', event: 'something', properties: { mongosh_version: '1.2.3' } });
    expect(events).to.have.lengthOf(0);

    toggleable.enable();
    expect(events).to.have.lengthOf(2);

    toggleable.track({ userId: 'me', event: 'something2', properties: { mongosh_version: '1.2.3' } });
    expect(events).to.have.lengthOf(3);

    toggleable.pause();
    toggleable.track({ userId: 'me', event: 'something3', properties: { mongosh_version: '1.2.3' } });
    expect(events).to.have.lengthOf(3);

    toggleable.disable();
    expect(events).to.have.lengthOf(3);
    toggleable.enable();

    expect(events).to.deep.equal([
      [ 'identify', { userId: 'me', traits: { platform: '1234' } } ],
      [ 'track', { userId: 'me', event: 'something', properties: { mongosh_version: '1.2.3' } } ],
      [ 'track', { userId: 'me', event: 'something2', properties: { mongosh_version: '1.2.3' } } ]
    ]);
  });
});
