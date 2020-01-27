import reducer, { setDataService, SET_DATA_SERVICE } from 'modules/data-service';

describe('data service module', () => {
  describe('#setDataService', () => {
    it('returns the SET_DATA_SERVICE action', () => {
      expect(setDataService('test', 'ds')).to.deep.equal({
        type: SET_DATA_SERVICE,
        error: 'test',
        dataService: 'ds'
      });
    });
  });

  describe('#reducer', () => {
    context('when the action is not data service connected', () => {
      it('returns the default state', () => {
        expect(reducer(undefined, { type: 'test' })).to.deep.equal({
          error: null,
          dataService: null
        });
      });
    });

    context('when the action is data service connected', () => {
      it('returns the new state', () => {
        expect(reducer(undefined, setDataService('err', 'ds'))).to.deep.equal({
          error: 'err',
          dataService: 'ds'
        });
      });
    });
  });
});
