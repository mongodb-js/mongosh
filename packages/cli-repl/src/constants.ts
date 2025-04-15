import i18n from '@mongosh/i18n';
import { colorizeForStderr as clr } from './clr';

export const TELEMETRY_GREETING_MESSAGE = `
${i18n.__('cli-repl.cli-repl.telemetry')}
${i18n.__('cli-repl.cli-repl.disableTelemetry')}${clr(
  'disableTelemetry()',
  'bold'
)} ${i18n.__('cli-repl.cli-repl.command')}
`;

export const MONGOSH_WIKI = `
${i18n.__('cli-repl.cli-repl.wiki.info')} ${clr(
  i18n.__('cli-repl.cli-repl.wiki.link'),
  'bold'
)}
`;

// See this PR for the options that were removed:
// https://github.com/mongodb-js/mongosh/pull/333
export const USAGE = `

  ${clr(i18n.__('cli-repl.args.usage'), 'bold')}

  ${clr(i18n.__('cli-repl.args.options'), 'mongosh:section-header')}

    -h, --help                                 ${i18n.__('cli-repl.args.help')}
    -f, --file [arg]                           ${i18n.__('cli-repl.args.file')}
        --host [arg]                           ${i18n.__('cli-repl.args.host')}
        --port [arg]                           ${i18n.__('cli-repl.args.port')}
        --build-info                           ${i18n.__(
          'cli-repl.args.buildInfo'
        )}
        --version                              ${i18n.__(
          'cli-repl.args.version'
        )}
        --quiet                                ${i18n.__('cli-repl.args.quiet')}
        --shell                                ${i18n.__('cli-repl.args.shell')}
        --nodb                                 ${i18n.__('cli-repl.args.nodb')}
        --norc                                 ${i18n.__('cli-repl.args.norc')}
        --eval [arg]                           ${i18n.__('cli-repl.args.eval')}
        --json[=canonical|relaxed]             ${i18n.__('cli-repl.args.json')}
        --retryWrites[=true|false]             ${i18n.__(
          'cli-repl.args.retryWrites'
        )}

  ${clr(
    i18n.__('cli-repl.args.authenticationOptions'),
    'mongosh:section-header'
  )}

    -u, --username [arg]                       ${i18n.__(
      'cli-repl.args.username'
    )}
    -p, --password [arg]                       ${i18n.__(
      'cli-repl.args.password'
    )}
        --authenticationDatabase [arg]         ${i18n.__(
          'cli-repl.args.authenticationDatabase'
        )}
        --authenticationMechanism [arg]        ${i18n.__(
          'cli-repl.args.authenticationMechanism'
        )}
        --awsIamSessionToken [arg]             ${i18n.__(
          'cli-repl.args.awsIamSessionToken'
        )}
        --gssapiServiceName [arg]              ${i18n.__(
          'cli-repl.args.gssapiServiceName'
        )}
        --sspiHostnameCanonicalization [arg]   ${i18n.__(
          'cli-repl.args.sspiHostnameCanonicalization'
        )}
        --sspiRealmOverride [arg]              ${i18n.__(
          'cli-repl.args.sspiRealmOverride'
        )}

  ${clr(i18n.__('cli-repl.args.tlsOptions'), 'mongosh:section-header')}

        --tls                                  ${i18n.__('cli-repl.args.tls')}
        --tlsCertificateKeyFile [arg]          ${i18n.__(
          'cli-repl.args.tlsCertificateKeyFile'
        )}
        --tlsCertificateKeyFilePassword [arg]  ${i18n.__(
          'cli-repl.args.tlsCertificateKeyFilePassword'
        )}
        --tlsCAFile [arg]                      ${i18n.__(
          'cli-repl.args.tlsCAFile'
        )}
        --tlsAllowInvalidHostnames             ${i18n.__(
          'cli-repl.args.tlsAllowInvalidHostnames'
        )}
        --tlsAllowInvalidCertificates          ${i18n.__(
          'cli-repl.args.tlsAllowInvalidCertificates'
        )}
        --tlsCertificateSelector [arg]         ${i18n.__(
          'cli-repl.args.tlsCertificateSelector'
        )}
        --tlsCRLFile [arg]                     ${i18n.__(
          'cli-repl.args.tlsCRLFile'
        )}
        --tlsDisabledProtocols [arg]           ${i18n.__(
          'cli-repl.args.tlsDisabledProtocols'
        )}
        --tlsFIPSMode                          ${i18n.__(
          'cli-repl.args.tlsFIPSMode'
        )}

  ${clr(i18n.__('cli-repl.args.apiVersionOptions'), 'mongosh:section-header')}

        --apiVersion [arg]                     ${i18n.__(
          'cli-repl.args.apiVersion'
        )}
        --apiStrict                            ${i18n.__(
          'cli-repl.args.apiStrict'
        )}
        --apiDeprecationErrors                 ${i18n.__(
          'cli-repl.args.apiDeprecationErrors'
        )}

  ${clr(i18n.__('cli-repl.args.fleOptions'), 'mongosh:section-header')}

        --awsAccessKeyId [arg]                 ${i18n.__(
          'cli-repl.args.awsAccessKeyId'
        )}
        --awsSecretAccessKey [arg]             ${i18n.__(
          'cli-repl.args.awsSecretAccessKey'
        )}
        --awsSessionToken [arg]                ${i18n.__(
          'cli-repl.args.awsSessionToken'
        )}
        --keyVaultNamespace [arg]              ${i18n.__(
          'cli-repl.args.keyVaultNamespace'
        )}
        --kmsURL [arg]                         ${i18n.__(
          'cli-repl.args.kmsURL'
        )}

  ${clr(i18n.__('cli-repl.args.oidcOptions'), 'mongosh:section-header')}

        --oidcFlows[=auth-code,device-auth]    ${i18n.__(
          'cli-repl.args.oidcFlows'
        )}
        --oidcRedirectUri[=url]                ${i18n.__(
          'cli-repl.args.oidcRedirectUri'
        )}
        --oidcTrustedEndpoint                  ${i18n.__(
          'cli-repl.args.oidcTrustedEndpoint'
        )}
        --oidcIdTokenAsAccessToken             ${i18n.__(
          'cli-repl.args.oidcIdTokenAsAccessToken'
        )}
        --oidcDumpTokens[=mode]                ${i18n.__(
          'cli-repl.args.oidcDumpTokens'
        )}
        --oidcNoNonce                          ${i18n.__(
          'cli-repl.args.oidcNoNonce'
        )}

  ${clr(i18n.__('cli-repl.args.dbAddressOptions'), 'mongosh:section-header')}

        foo                                    ${i18n.__(
          'cli-repl.args.dbAddress/foo'
        )}
        192.168.0.5/foo                        ${i18n.__(
          'cli-repl.args.dbAddress/192/foo'
        )}
        192.168.0.5:9999/foo                   ${i18n.__(
          'cli-repl.args.dbAddress/192/host/foo'
        )}
        mongodb://192.168.0.5:9999/foo         ${i18n.__(
          'cli-repl.args.dbAddress/connectionURI'
        )}

  ${clr(i18n.__('cli-repl.args.fileNames'), 'mongosh:section-header')}

        ${i18n.__('cli-repl.args.filenameDescription')}

  ${clr(i18n.__('cli-repl.args.examples'), 'mongosh:section-header')}

        ${i18n.__('cli-repl.args.connectionExampleWithDatabase')}
        ${clr('$ mongosh mongodb://192.168.0.5:9999/ships', 'mongosh:uri')}

  ${clr(i18n.__('cli-repl.args.moreInformation'), 'bold')} ${clr(
  'https://docs.mongodb.com/mongodb-shell',
  'mongosh:uri'
)}.
`
  .replace(/\n$/, '')
  .replace(/^\n/, '');
