export interface Document {
  [prop: string]: any;
}

export interface Cursor {
  addOption(...args: any[]): any;
  allowPartialResults(...args: any[]): any;
  arrayAccess(...args: any[]): any;
  batchSize(...args: any[]): any;
  clone(...args: any[]): any;
  close(...args: any[]): any;
  collation(...args: any[]): any;
  comment(...args: any[]): any;
  count(...args: any[]): any;
  explain(...args: any[]): any;
  forEach(...args: any[]): any;
  getQueryPlan(...args: any[]): any;
  hasNext(...args: any[]): any;
  hint(...args: any[]): any;
  isClosed(...args: any[]): any;
  isExhausted(...args: any[]): any;
  itcount(...args: any[]): any;
  length(...args: any[]): any;
  limit(...args: any[]): any;
  map(...args: any[]): any;
  max(...args: any[]): any;
  maxScan(...args: any[]): any;
  maxTimeMS(...args: any[]): any;
  min(...args: any[]): any;
  modifiers(...args: any[]): any;
  next(...args: any[]): any;
  noCursorTimeout(...args: any[]): any;
  objsLeftInBatch(...args: any[]): any;
  oplogReplay(...args: any[]): any;
  projection(...args: any[]): any;
  pretty(...args: any[]): any;
  readConcern(...args: any[]): any;
  readOnly(...args: any[]): any;
  readPref(...args: any[]): any;
  returnKey(...args: any[]): any;
  showDiskLoc(...args: any[]): any;
  showRecordId(...args: any[]): any;
  size(...args: any[]): any;
  skip(...args: any[]): any;
  snapshot(...args: any[]): any;
  sort(...args: any[]): any;
  tailable(...args: any[]): any;
  toArray(): Promise<any[]>;
}

export interface Collection {
  find(...args: any[]): Cursor;
}

export interface Db {
  collection(name): Collection;
}

export interface ServiceProvider {
  db(name): Db;
}
