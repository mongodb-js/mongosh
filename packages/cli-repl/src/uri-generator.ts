import CliOptions from './cli-options';

/**
 * Generate a URI from the provided CLI options.
 *
 * If a full URI is provided, you cannot also specify --host or --port
 *
 * gssapiHostName?: string; // needs to go in URI
 * gssapiServiceName?: string; // needs to go in URI
 * host?: string; // needs to go in URI
 * port?: string; // needs to go in URI
 * db?: string; // needs to go in URI
 * _?: string[];
 */
function generateUri(options: CliOptions) {

}

export default generateUri;
