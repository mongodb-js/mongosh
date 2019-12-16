import { StitchAuth as ServerStitchAuth } from 'mongodb-stitch-server-sdk';
import { StitchAuth as BrowserStitchAuth } from 'mongodb-stitch-browser-sdk';

/**
 * Defines behaviour common to both the Stitch server and browser
 * client APIs.
 */
interface StitchClient {
  auth: StitchAuth | BrowserStitchAuth;
}

export default StitchClient;
