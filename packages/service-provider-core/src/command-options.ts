import WriteConcern from "./write-concern";

export default interface CommandOptions {
  writeConcern?: WriteConcern
}
