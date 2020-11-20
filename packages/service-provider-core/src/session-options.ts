import ReadConcern from './read-concern';
import WriteConcern from './write-concern';
import ReadPreference from './read-preference';

export default interface SessionOptions {
  causalConsistency?: boolean;
  maxCommitTimeMS?: number;
  readConcern?: ReadConcern;
  writeConcern?: WriteConcern;
  readPreference?: ReadPreference;
}

export interface TransactionOptions {
  readConcern?: ReadConcern;
  writeConcern?: WriteConcern;
  readPreference?: ReadPreference;
}
