/**
 * Defines behaviour common to both the Stitch server and browser
 * mongo client APIs.
 */
export default interface StitchMongoClient {
  db(name: string): any;
}

