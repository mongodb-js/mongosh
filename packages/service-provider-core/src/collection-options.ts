import CommandOptions from './base-options';
import Document from './document';

export default interface CollectionOptions extends CommandOptions {
  capped?: boolean;
  autoIndexId?: boolean;
  size?: number;
  storageEngine?: Document;
  validator?: Document;
  validationLevel?: string;
  validationAction?: string;
  indexOptionDefaults?: Document;
  viewOn?: string;
  pipeline?: any;
  collation?: Document;
  writeConcern?: Document;
}
