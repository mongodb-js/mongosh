/**
 * Defines behaviour common to both the Stitch server and browser
 * mongo client APIs.
 */
interface StitchMongoClient {
  db(name)
}

export default StitchMongoClient;
