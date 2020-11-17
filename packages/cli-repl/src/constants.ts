import i18n from '@mongosh/i18n';
import { colorizeForStderr as clr } from './clr';

export const TELEMETRY_GREETING_MESSAGE = `
${i18n.__('cli-repl.cli-repl.telemetry')}
${i18n.__('cli-repl.cli-repl.disableTelemetry')}${clr('disableTelemetry()', 'bold')} ${i18n.__('cli-repl.cli-repl.command')}
`;

export const MONGOSH_WIKI = `
${i18n.__('cli-repl.cli-repl.wiki.info')} ${clr(i18n.__('cli-repl.cli-repl.wiki.link'), 'bold')}
`;

// See this PR for the options that were removed:
// https://github.com/mongodb-js/mongosh/pull/333
export const USAGE = `

  ${clr(i18n.__('cli-repl.args.usage'), 'bold')}

  ${clr(i18n.__('cli-repl.args.options'), ['bold', 'yellow'])}

    -h, --help                                 ${i18n.__('cli-repl.args.help')}
        --host [arg]                           ${i18n.__('cli-repl.args.host')}
        --port [arg]                           ${i18n.__('cli-repl.args.port')}
        --version                              ${i18n.__('cli-repl.args.version')}
        --nodb                                 ${i18n.__('cli-repl.args.nodb')}
        --retryWrites                          ${i18n.__('cli-repl.args.retryWrites')}

  ${clr(i18n.__('cli-repl.args.authenticationOptions'), ['bold', 'yellow'])}

    -u, --username [arg]                       ${i18n.__('cli-repl.args.username')}
    -p, --password [arg]                       ${i18n.__('cli-repl.args.password')}
        --authenticationDatabase [arg]         ${i18n.__('cli-repl.args.authenticationDatabase')}
        --authenticationMechanism [arg]        ${i18n.__('cli-repl.args.authenticationMechanism')}

  ${clr(i18n.__('cli-repl.args.tlsOptions'), ['bold', 'yellow'])}

        --tls                                  ${i18n.__('cli-repl.args.tls')}
        --tlsCertificateKeyFile [arg]          ${i18n.__('cli-repl.args.tlsCertificateKeyFile')}
        --tlsCertificateKeyFilePassword [arg]  ${i18n.__('cli-repl.args.tlsCertificateKeyFilePassword')}
        --tlsCAFile [arg]                      ${i18n.__('cli-repl.args.tlsCAFile')}
        --tlsAllowInvalidHostnames             ${i18n.__('cli-repl.args.tlsAllowInvalidHostnames')}
        --tlsAllowInvalidCertificates          ${i18n.__('cli-repl.args.tlsAllowInvalidCertificates')}
        --tlsCertificateSelector [arg]         ${i18n.__('cli-repl.args.tlsCertificateSelector')}
        --tlsDisabledProtocols [arg]           ${i18n.__('cli-repl.args.tlsDisabledProtocols')}

  ${clr(i18n.__('cli-repl.args.dbAddressOptions'), ['bold', 'yellow'])}

        foo                                    ${i18n.__('cli-repl.args.dbAddress/foo')}
        192.168.0.5/foo                        ${i18n.__('cli-repl.args.dbAddress/192/foo')}
        192.168.0.5:9999/foo                   ${i18n.__('cli-repl.args.dbAddress/192/host/foo')}
        mongodb://192.168.0.5:9999/foo         ${i18n.__('cli-repl.args.dbAddress/connectionURI')}

  ${clr(i18n.__('cli-repl.args.examples'), ['bold', 'yellow'])}

        ${i18n.__('cli-repl.args.connectionExampleWithDatabase')}
        ${clr('$ mongosh mongodb://192.168.0.5:9999/ships', 'green')}

  ${clr(i18n.__('cli-repl.args.moreInformation'), 'bold')} ${clr('https://docs.mongodb.com/mongodb-shell', 'green')}.
`.replace(/\n$/, '').replace(/^\n/, '');
