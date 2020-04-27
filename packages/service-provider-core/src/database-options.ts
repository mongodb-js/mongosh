import WriteConcern from "./write-concern";
import ReadConcern from "./read-concern";
import ReadPreference from "./read-preference";

export default interface DatabaseOptions extends WriteConcern {
  returnNonCachedInstance?: boolean;
  readConcern?: ReadConcern;
  readPreference?: ReadPreference
}
