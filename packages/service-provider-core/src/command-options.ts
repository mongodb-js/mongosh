import WriteConcern from './write-concern';
import BaseOptions from './base-options';

export default interface CommandOptions extends BaseOptions {
  writeConcern?: WriteConcern;
}
