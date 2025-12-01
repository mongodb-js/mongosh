import { MongoshUnimplementedError } from '@mongosh/errors';
import { expect } from 'chai';
import stripAnsi from 'strip-ansi';
import {
  argMetadata,
  CliOptionsSchema,
  coerceIfBoolean,
  coerceIfFalse,
  generateYargsOptionsFromSchema,
  getLocale,
  parseArgs,
  parseArgsWithCliOptions,
  UnknownCliArgumentError,
  UnsupportedCliArgumentError,
} from './arg-parser';
import { z } from 'zod/v4';

describe('arg-parser', function () {
  describe('.getLocale', function () {
    context('when --locale is provided', function () {
      it('returns the locale', function () {
        expect(getLocale(['--locale', 'de_DE'], {})).to.equal('de_DE');
      });
    });

    context('when --locale is not provided', function () {
      context('when env.LANG is set', function () {
        context('when it contains the encoding', function () {
          it('returns the locale', function () {
            expect(getLocale([], { LANG: 'de_DE.UTF-8' })).to.equal('de_DE');
          });
        });

        context('when it does not contain the encoding', function () {
          it('returns the locale', function () {
            expect(getLocale([], { LANG: 'de_DE' })).to.equal('de_DE');
          });
        });
      });

      context('when env.LANGUAGE is set', function () {
        context('when it contains the encoding', function () {
          it('returns the locale', function () {
            expect(getLocale([], { LANGUAGE: 'de_DE.UTF-8' })).to.equal(
              'de_DE'
            );
          });
        });

        context('when it does not contain the encoding', function () {
          it('returns the locale', function () {
            expect(getLocale([], { LANGUAGE: 'de_DE' })).to.equal('de_DE');
          });
        });
      });

      context('when env.LC_ALL is set', function () {
        context('when it contains the encoding', function () {
          it('returns the locale', function () {
            expect(getLocale([], { LC_ALL: 'de_DE.UTF-8' })).to.equal('de_DE');
          });
        });

        context('when it does not contain the encoding', function () {
          it('returns the locale', function () {
            expect(getLocale([], { LC_ALL: 'de_DE' })).to.equal('de_DE');
          });
        });
      });

      context('when env.LC_MESSAGES is set', function () {
        context('when it contains the encoding', function () {
          it('returns the locale', function () {
            expect(getLocale([], { LC_MESSAGES: 'de_DE.UTF-8' })).to.equal(
              'de_DE'
            );
          });
        });

        context('when it does not contain the encoding', function () {
          it('returns the locale', function () {
            expect(getLocale([], { LC_MESSAGES: 'de_DE' })).to.equal('de_DE');
          });
        });
      });
    });
  });

  describe('.parse', function () {
    context('when providing only a URI', function () {
      const uri = 'mongodb://domain.com:20000';
      const argv = [uri];

      it('returns the URI in the object', function () {
        expect(
          parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
        ).to.equal(uri);
      });
    });

    context('when providing a URI + options', function () {
      const uri = 'mongodb://domain.com:20000';

      context('when providing general options', function () {
        context('when providing --ipv6', function () {
          const argv = [uri, '--ipv6'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the ipv6 value in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.ipv6
            ).to.equal(true);
          });
        });

        context('when providing -h', function () {
          const argv = [uri, '-h'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the help value in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.help
            ).to.equal(true);
          });
        });

        context('when providing --help', function () {
          const argv = [uri, '--help'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the help value in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.help
            ).to.equal(true);
          });
        });

        context('when providing --version', function () {
          const argv = [uri, '--version'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the version value in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.version
            ).to.equal(true);
          });
        });

        context('when providing --verbose', function () {
          const argv = [uri, '--verbose'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the verbose value in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.verbose
            ).to.equal(true);
          });
        });

        context('when providing --shell', function () {
          const argv = [uri, '--shell'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the shell value in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.shell
            ).to.equal(true);
          });
        });

        context('when providing --nodb', function () {
          const argv = [uri, '--nodb'];

          it('does not return the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(undefined);
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.fileNames
            ).to.deep.equal([uri]);
          });

          it('sets the nodb value in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.nodb
            ).to.equal(true);
          });
        });

        context('when providing --norc', function () {
          const argv = [uri, '--norc'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the norc value in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.norc
            ).to.equal(true);
          });
        });

        context('when providing --quiet', function () {
          const argv = [uri, '--quiet'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the quiet value in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.quiet
            ).to.equal(true);
          });
        });

        context('when providing --eval (single value)', function () {
          const argv = [uri, '--eval', '1+1'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the eval value in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.eval
            ).to.deep.equal(['1+1']);
          });
        });

        context('when providing --eval (multiple values)', function () {
          const argv = [uri, '--eval', '1+1', '--eval', '2+2'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the eval value in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.eval
            ).to.deep.equal(['1+1', '2+2']);
          });
        });

        context('when providing --retryWrites', function () {
          const argv = [uri, '--retryWrites'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the retryWrites value in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.retryWrites
            ).to.equal(true);
          });
        });

        context('when providing an unknown parameter', function () {
          const argv = [uri, '--what'];

          it('raises an error', function () {
            try {
              parseArgsWithCliOptions({ args: argv }).parsed;
            } catch (err: any) {
              if (err instanceof UnknownCliArgumentError) {
                expect(stripAnsi(err.message)).to.equal(
                  'Unknown argument: --what'
                );
                return;
              }
              expect.fail('Expected UnknownCliArgumentError');
            }
            expect.fail('parsing unknown parameter did not throw');
          });
        });
      });

      context('when providing authentication options', function () {
        context('when providing -u', function () {
          const argv = [uri, '-u', 'richard'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the username in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.username
            ).to.equal('richard');
          });
        });

        context('when providing --username', function () {
          const argv = [uri, '--username', 'richard'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the username in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.username
            ).to.equal('richard');
          });
        });

        context('when providing -p', function () {
          const argv = [uri, '-p', 'pw'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the password in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.password
            ).to.equal('pw');
          });
        });

        context('when providing --password', function () {
          const argv = [uri, '--password', 'pw'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the password in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.password
            ).to.equal('pw');
          });
        });

        context('when providing --authenticationDatabase', function () {
          const argv = [uri, '--authenticationDatabase', 'db'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the authenticationDatabase in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed
                .authenticationDatabase
            ).to.equal('db');
          });
        });

        context('when providing --authenticationMechanism', function () {
          const argv = [uri, '--authenticationMechanism', 'SCRAM-SHA-256'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the authenticationMechanism in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed
                .authenticationMechanism
            ).to.equal('SCRAM-SHA-256');
          });
        });

        context('when providing --gssapiServiceName', function () {
          const argv = [uri, '--gssapiServiceName', 'mongosh'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the gssapiServiceName in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.gssapiServiceName
            ).to.equal('mongosh');
          });
        });

        context('when providing --gssapiHostName', function () {
          const argv = [uri, '--gssapiHostName', 'example.com'];

          it('throws an error since it is not supported', function () {
            expect(
              () => parseArgsWithCliOptions({ args: argv }).parsed
            ).to.throw(
              UnsupportedCliArgumentError,
              'Unsupported argument: gssapiHostName'
            );
          });
        });

        context('when providing --sspiHostnameCanonicalization', function () {
          const argv = [uri, '--sspiHostnameCanonicalization', 'forward'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the gssapiHostName in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed
                .sspiHostnameCanonicalization
            ).to.equal('forward');
          });
        });

        context('when providing --sspiRealmOverride', function () {
          const argv = [uri, '--sspiRealmOverride', 'example2.com'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the gssapiHostName in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.sspiRealmOverride
            ).to.equal('example2.com');
          });
        });

        context('when providing --awsIamSessionToken', function () {
          const argv = [uri, '--awsIamSessionToken', 'tok'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the awsIamSessionToken in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.awsIamSessionToken
            ).to.equal('tok');
          });
        });
      });

      context('when providing TLS options', function () {
        context('when providing --tls', function () {
          const argv = [uri, '--tls'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the tls in the object', function () {
            expect(parseArgsWithCliOptions({ args: argv }).parsed.tls).to.equal(
              true
            );
          });
        });

        context('when providing -tls (single dash)', function () {
          const argv = [uri, '-tls'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the tls in the object', function () {
            expect(parseArgsWithCliOptions({ args: argv }).parsed.tls).to.equal(
              true
            );
          });
        });

        context('when providing --tlsCertificateKeyFile', function () {
          const argv = [uri, '--tlsCertificateKeyFile', 'test'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the tlsCertificateKeyFile in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed
                .tlsCertificateKeyFile
            ).to.equal('test');
          });
        });

        context(
          'when providing -tlsCertificateKeyFile (single dash)',
          function () {
            const argv = [uri, '-tlsCertificateKeyFile', 'test'];

            it('returns the URI in the object', function () {
              expect(
                parseArgsWithCliOptions({ args: argv }).parsed
                  .connectionSpecifier
              ).to.equal(uri);
            });

            it('sets the tlsCertificateKeyFile in the object', function () {
              expect(
                parseArgsWithCliOptions({ args: argv }).parsed
                  .tlsCertificateKeyFile
              ).to.equal('test');
            });
          }
        );

        context('when providing --tlsCertificateKeyFilePassword', function () {
          const argv = [uri, '--tlsCertificateKeyFilePassword', 'test'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the tlsCertificateKeyFilePassword in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed
                .tlsCertificateKeyFilePassword
            ).to.equal('test');
          });
        });

        context('when providing --tlsCAFile', function () {
          const argv = [uri, '--tlsCAFile', 'test'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the tlsCAFile in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.tlsCAFile
            ).to.equal('test');
          });
        });

        context('when providing --tlsCRLFile', function () {
          const argv = [uri, '--tlsCRLFile', 'test'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the tlsCRLFile in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.tlsCRLFile
            ).to.equal('test');
          });
        });

        context('when providing --tlsAllowInvalidHostnames', function () {
          const argv = [uri, '--tlsAllowInvalidHostnames'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the tlsAllowInvalidHostnames in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed
                .tlsAllowInvalidHostnames
            ).to.equal(true);
          });
        });

        context('when providing --tlsAllowInvalidCertificates', function () {
          const argv = [uri, '--tlsAllowInvalidCertificates'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the tlsAllowInvalidCertificates in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed
                .tlsAllowInvalidCertificates
            ).to.equal(true);
          });
        });

        context('when providing --sslFIPSMode', function () {
          const argv = [uri, '--sslFIPSMode'];

          it('throws an error since it is not supported', function () {
            expect(
              () => parseArgsWithCliOptions({ args: argv }).parsed
            ).to.throw(
              UnsupportedCliArgumentError,
              'Unsupported argument: sslFIPSMode'
            );
          });

          // it('returns the URI in the object', () => {
          //   expect(parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier).to.equal(uri);
          // });

          // it('sets the tlsFIPSMode in the object', () => {
          //   expect(parseArgsWithCliOptions({ args: argv }).parsed.tlsFIPSMode).to.equal(true);
          // });
        });

        context('when providing --tlsCertificateSelector', function () {
          const argv = [uri, '--tlsCertificateSelector', 'test'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the tlsCertificateSelector in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed
                .tlsCertificateSelector
            ).to.equal('test');
          });
        });

        context('when providing --tlsDisabledProtocols', function () {
          const argv = [uri, '--tlsDisabledProtocols', 'TLS1_0,TLS2_0'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the tlsDisabledProtocols in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed
                .tlsDisabledProtocols
            ).to.equal('TLS1_0,TLS2_0');
          });
        });
      });

      context('when providing FLE options', function () {
        context('when providing --awsAccessKeyId', function () {
          const argv = [uri, '--awsAccessKeyId', 'foo'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the awsAccessKeyId in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.awsAccessKeyId
            ).to.equal('foo');
          });
        });

        context('when providing --awsSecretAccessKey', function () {
          const argv = [uri, '--awsSecretAccessKey', 'foo'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the awsSecretAccessKey in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.awsSecretAccessKey
            ).to.equal('foo');
          });
        });

        context('when providing --awsSessionToken', function () {
          const argv = [uri, '--awsSessionToken', 'foo'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the awsSessionToken in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.awsSessionToken
            ).to.equal('foo');
          });
        });

        context('when providing --keyVaultNamespace', function () {
          const argv = [uri, '--keyVaultNamespace', 'foo.bar'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the keyVaultNamespace in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.keyVaultNamespace
            ).to.equal('foo.bar');
          });
        });

        context('when providing --kmsURL', function () {
          const argv = [uri, '--kmsURL', 'example.com'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the kmsURL in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.kmsURL
            ).to.equal('example.com');
          });
        });
      });

      context('when providing versioned API options', function () {
        context('when providing --apiVersion', function () {
          const argv = [uri, '--apiVersion', '1'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the apiVersion in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.apiVersion
            ).to.equal('1');
          });
        });

        context('when providing --apiDeprecationErrors', function () {
          const argv = [uri, '--apiDeprecationErrors'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the apiVersion in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed
                .apiDeprecationErrors
            ).to.equal(true);
          });
        });

        context('when providing --apiStrict', function () {
          const argv = [uri, '--apiStrict'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the apiVersion in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.apiStrict
            ).to.equal(true);
          });
        });
      });

      context('when providing filenames after an URI', function () {
        context('when the filenames end in .js', function () {
          const argv = [uri, 'test1.js', 'test2.js'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the filenames', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.fileNames?.[0]
            ).to.equal('test1.js');
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.fileNames?.[1]
            ).to.equal('test2.js');
          });
        });

        context('when the filenames end in .mongodb', function () {
          const argv = [uri, 'test1.mongodb', 'test2.mongodb'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the filenames', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.fileNames?.[0]
            ).to.equal('test1.mongodb');
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.fileNames?.[1]
            ).to.equal('test2.mongodb');
          });
        });

        context('when the filenames end in other extensions', function () {
          const argv = [uri, 'test1.txt', 'test2.txt'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the filenames', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.fileNames?.[0]
            ).to.equal('test1.txt');
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.fileNames?.[1]
            ).to.equal('test2.txt');
          });
        });

        context('when filenames are specified using -f', function () {
          const argv = [uri, '-f', 'test1.txt', '-f', 'test2.txt'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the filenames', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.fileNames?.[0]
            ).to.equal('test1.txt');
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.fileNames?.[1]
            ).to.equal('test2.txt');
          });
        });

        context('when filenames are specified using -f/--file', function () {
          const argv = [uri, '-f', 'test1.txt', '--file', 'test2.txt'];

          it('returns the URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(uri);
          });

          it('sets the filenames', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.fileNames?.[0]
            ).to.equal('test1.txt');
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.fileNames?.[1]
            ).to.equal('test2.txt');
          });
        });
      });

      context('when providing filenames without an URI', function () {
        context('when the filenames end in .js', function () {
          const argv = ['test1.js', 'test2.js'];

          it('returns no URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(undefined);
          });

          it('sets the filenames', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.fileNames?.[0]
            ).to.equal('test1.js');
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.fileNames?.[1]
            ).to.equal('test2.js');
          });
        });

        context('when the filenames end in .mongodb', function () {
          const argv = ['test1.mongodb', 'test2.mongodb'];

          it('returns no URI in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(undefined);
          });

          it('sets the filenames', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.fileNames?.[0]
            ).to.equal('test1.mongodb');
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.fileNames?.[1]
            ).to.equal('test2.mongodb');
          });
        });

        context('when the filenames end in other extensions', function () {
          const argv = ['test1.txt', 'test2.txt'];

          it('returns the first filename as an URI', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal('test1.txt');
          });

          it('uses the remainder as filenames', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.fileNames?.[0]
            ).to.equal('test2.txt');
          });
        });

        context('when the first argument is an URI ending in .js', function () {
          const argv = ['mongodb://domain.foo.js', 'test2.txt'];

          it('returns the first filename as an URI', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal('mongodb://domain.foo.js');
          });

          it('uses the remainder as filenames', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.fileNames?.[0]
            ).to.equal('test2.txt');
          });
        });

        context(
          'when the first argument is an URI ending in .js but --file is used',
          function () {
            const argv = [
              '--file',
              'mongodb://domain.foo.js',
              'mongodb://domain.bar.js',
            ];

            it('returns the first filename as an URI', function () {
              expect(
                parseArgsWithCliOptions({ args: argv }).parsed
                  .connectionSpecifier
              ).to.equal('mongodb://domain.bar.js');
            });

            it('uses the remainder as filenames', function () {
              expect(
                parseArgsWithCliOptions({ args: argv }).parsed.fileNames?.[0]
              ).to.equal('mongodb://domain.foo.js');
            });
          }
        );
      });
    });

    context('when providing no URI', function () {
      context('when providing a DB address', function () {
        context('when only a db name is provided', function () {
          const db = 'foo';
          const argv = [db];

          it('sets the db in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(db);
          });
        });

        context('when a db address is provided without a scheme', function () {
          const db = '192.168.0.5:9999/foo';
          const argv = [db];

          it('sets the db in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.connectionSpecifier
            ).to.equal(db);
          });
        });
      });

      context('when providing no DB address', function () {
        context('when providing a host', function () {
          const argv = ['--host', 'example.com'];

          it('sets the host value in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.host
            ).to.equal('example.com');
          });
        });

        context('when providing a port', function () {
          const argv = ['--port', '20000'];

          it('sets the port value in the object', function () {
            expect(
              parseArgsWithCliOptions({ args: argv }).parsed.port
            ).to.equal('20000');
          });
        });
      });
    });

    context('when providing a deprecated argument', function () {
      for (const { deprecated, replacement, value } of [
        { deprecated: 'ssl', replacement: 'tls' },
        {
          deprecated: 'sslAllowInvalidCertificates',
          replacement: 'tlsAllowInvalidCertificates',
        },
        {
          deprecated: 'sslAllowInvalidCertificates',
          replacement: 'tlsAllowInvalidCertificates',
        },
        {
          deprecated: 'sslAllowInvalidHostnames',
          replacement: 'tlsAllowInvalidHostnames',
        },
        // { deprecated: 'sslFIPSMode', replacement: 'tlsFIPSMode' }, <<-- FIPS is currently not supported right now
        {
          deprecated: 'sslPEMKeyFile',
          replacement: 'tlsCertificateKeyFile',
          value: 'pemKeyFile',
        },
        {
          deprecated: 'sslPEMKeyPassword',
          replacement: 'tlsCertificateKeyFilePassword',
          value: 'pemKeyPass',
        },
        { deprecated: 'sslCAFile', replacement: 'tlsCAFile', value: 'caFile' },
        // { deprecated: 'sslCertificateSelector', replacement: 'tlsCertificateSelector', value: 'certSelector' }, <<-- Certificate selector not supported right now
        {
          deprecated: 'sslCRLFile',
          replacement: 'tlsCRLFile',
          value: 'crlFile',
        },
        {
          deprecated: 'sslDisabledProtocols',
          replacement: 'tlsDisabledProtocols',
          value: 'disabledProtos',
        },
      ] as const) {
        it(`replaces --${deprecated} with --${replacement}`, function () {
          const argv = [`--${deprecated}`];
          if (value) {
            argv.push(value);
          }

          const args = parseArgsWithCliOptions({ args: argv }).parsed;
          expect(args).to.not.have.property(deprecated);
          expect(args[replacement]).to.equal(value ?? true);
        });
      }
    });
  });

  describe('union type fields', function () {
    for (const { argument, values, onlyFalse, strict } of [
      { argument: 'json', values: ['relaxed', 'canonical'] },
      { argument: 'oidcDumpTokens', values: ['redacted', 'include-secrets'] },
      { argument: 'browser', values: ['test'], onlyFalse: true, strict: false },
    ] as const) {
      describe(`with ${argument}`, function () {
        context('with boolean', function () {
          it(`get set to true with --${argument}`, function () {
            expect(
              parseArgsWithCliOptions({
                args: [`--${argument}`],
              }).parsed[argument]
            ).to.equal(true);
          });

          if (!onlyFalse) {
            it(`coerces to true with --${argument}=true`, function () {
              expect(
                parseArgsWithCliOptions({
                  args: [`--${argument}=true`],
                }).parsed[argument]
              ).to.equal(true);
            });
          } else {
            it(`does not coerce with "--${argument} true"`, function () {
              expect(
                parseArgsWithCliOptions({
                  args: [`--${argument}=true`],
                }).parsed[argument]
              ).to.be.equal('true');
            });
          }

          it(`coerces to false with --${argument}=false`, function () {
            expect(
              parseArgsWithCliOptions({
                args: [`--${argument}=false`],
              }).parsed[argument]
            ).to.equal(false);
          });
        });

        for (const value of values) {
          context('with string value', function () {
            // This matches the legacy behavior pre-Zod schema migration.
            it(`does not work with "--${argument} ${value}"`, function () {
              expect(
                parseArgsWithCliOptions({
                  args: [`--${argument} ${value}`],
                }).parsed[argument]
              ).to.be.undefined;
            });

            it(`works "--${argument}=${value}"`, function () {
              expect(
                parseArgsWithCliOptions({
                  args: [`--${argument}=${value}`],
                }).parsed[argument]
              ).to.equal(value);
            });
          });
        }

        if (strict) {
          it('throws an error with invalid value', function () {
            try {
              parseArgsWithCliOptions({
                args: [`--${argument}`, 'invalid'],
              });
            } catch (e: any) {
              expect(e).to.be.instanceOf(MongoshUnimplementedError);
              expect(e.message).to.include(
                `--${argument} can only have the values ${values.join(', ')}`
              );
              return;
            }
            expect.fail('Expected error');
          });
        }
      });
    }
  });

  const testSchema = z.object({
    name: z.string(),
    age: z.number(),
    isAdmin: z.boolean(),
    roles: z.array(z.string()),
  });

  describe('generateYargsOptions', function () {
    it('generates from arbitrary schema', function () {
      const options = generateYargsOptionsFromSchema({
        schema: testSchema,
        configuration: {
          'combine-arrays': true,
        },
      });

      expect(options).to.deep.equal({
        string: ['name'],
        number: ['age'],
        boolean: ['isAdmin'],
        array: ['roles'],
        coerce: {},
        alias: {},
        configuration: {
          'combine-arrays': true,
        },
      });
    });

    it('generates the expected options for Cli Options', function () {
      const options = generateYargsOptionsFromSchema({
        schema: CliOptionsSchema,
      });

      const expected = {
        string: [
          'apiVersion',
          'authenticationDatabase',
          'authenticationMechanism',
          'awsAccessKeyId',
          'awsIamSessionToken',
          'awsSecretAccessKey',
          'awsSessionToken',
          'csfleLibraryPath',
          'cryptSharedLibPath',
          'db',
          'gssapiHostName',
          'gssapiServiceName',
          'sspiHostnameCanonicalization',
          'sspiRealmOverride',
          'host',
          'jsContext',
          'keyVaultNamespace',
          'kmsURL',
          'locale',
          'oidcFlows',
          'oidcRedirectUri',
          'password',
          'port',
          'sslPEMKeyFile',
          'sslPEMKeyPassword',
          'sslCAFile',
          'sslCertificateSelector',
          'sslCRLFile',
          'sslDisabledProtocols',
          'tlsCAFile',
          'tlsCertificateKeyFile',
          'tlsCertificateKeyFilePassword',
          'tlsCertificateSelector',
          'tlsCRLFile',
          'tlsDisabledProtocols',
          'username',
        ],
        boolean: [
          'apiDeprecationErrors',
          'apiStrict',
          'buildInfo',
          'exposeAsyncRewriter',
          'help',
          'ipv6',
          'nodb',
          'norc',
          'oidcTrustedEndpoint',
          'oidcIdTokenAsAccessToken',
          'oidcNoNonce',
          'perfTests',
          'quiet',
          'retryWrites',
          'shell',
          'smokeTests',
          'skipStartupWarnings',
          'ssl',
          'sslAllowInvalidCertificates',
          'sslAllowInvalidHostnames',
          'sslFIPSMode',
          'tls',
          'tlsAllowInvalidCertificates',
          'tlsAllowInvalidHostnames',
          'tlsFIPSMode',
          'tlsUseSystemCA',
          'verbose',
          'version',
        ],
        array: ['eval', 'file'],
        coerce: {
          json: coerceIfBoolean,
          oidcDumpTokens: coerceIfBoolean,
          browser: coerceIfFalse,
        },
        alias: {
          h: 'help',
          p: 'password',
          u: 'username',
          f: 'file',
          'build-info': 'buildInfo',
          oidcRedirectUrl: 'oidcRedirectUri', // I'd get this wrong about 50% of the time
          oidcIDTokenAsAccessToken: 'oidcIdTokenAsAccessToken', // ditto
        },
        configuration: {
          'camel-case-expansion': false,
          'unknown-options-as-args': true,
          'parse-positional-numbers': false,
          'parse-numbers': false,
          'greedy-arrays': false,
          'short-option-groups': false,
        },
      };

      // Compare arrays without caring about order
      expect(options.string?.sort()).to.deep.equal(expected.string.sort());
      expect(options.boolean?.sort()).to.deep.equal(expected.boolean.sort());
      expect(options.array?.sort()).to.deep.equal(expected.array.sort());

      // Compare non-array properties normally
      expect(options.alias).to.deep.equal(expected.alias);
      expect(options.configuration).to.deep.equal(expected.configuration);
      expect(options.coerce).to.deep.equal(expected.coerce);
    });
  });

  describe('parseArgs', function () {
    it('passes any schema, independent of CliOptionsSchema', function () {
      const options = parseArgs({
        args: [
          'hello',
          '--port',
          '20000',
          '--ssl',
          '1',
          '--unknownField',
          '1',
          '--deprecatedField',
          '100',
        ],
        schema: z.object({
          port: z.number(),
          ssl: z.boolean(),
          unknownField: z.string(),
          replacedField: z.number(),
          deprecatedField: z.number().register(argMetadata, {
            deprecationReplacement: 'replacedField',
          }),
        }),
      });

      expect(options).to.deep.equal({
        positional: ['hello', '1'],
        parsed: {
          port: 20000,
          replacedField: 100,
          ssl: true,
          unknownField: '1',
        },
        deprecated: {
          deprecatedField: 'replacedField',
        },
      });
    });
  });

  describe('parseArgsWithCliOptions', function () {
    it('parses the expected options for Cli Options and replacements', function () {
      const options = parseArgsWithCliOptions({
        args: ['--port', '20000', '--ssl', '1'],
      });

      expect(options).to.deep.equal({
        positional: [],
        parsed: {
          connectionSpecifier: '1',
          fileNames: [],
          port: '20000',
          tls: true,
        },
        deprecated: {
          ssl: 'tls',
        },
      });
    });

    it('parses extended schema', function () {
      const options = parseArgsWithCliOptions({
        args: [
          '--port',
          '20000',
          '--extendedField',
          '90',
          '--ssl',
          'true',
          '--deprecatedField',
          '100',
        ],
        schema: {
          extendedField: z.number(),
          replacedField: z.number(),
          deprecatedField: z.number().register(argMetadata, {
            deprecationReplacement: 'replacedField',
          }),
        },
      });

      expect(options).to.deep.equal({
        positional: [],
        parsed: {
          port: '20000',
          replacedField: 100,
          extendedField: 90,
          tls: true,
          fileNames: [],
        },
        deprecated: {
          ssl: 'tls',
          deprecatedField: 'replacedField',
        },
      });
    });

    it('throws an error for fields outside of the custom schema', function () {
      expect(() =>
        parseArgsWithCliOptions({
          args: [
            '--port',
            '20000',
            '--extendedField',
            '90',
            '--unknownField',
            '100',
          ],
          schema: {
            extendedField: z.enum(['90', '100']),
          },
        })
      ).to.throw(UnknownCliArgumentError, 'Unknown argument: --unknownField');
    });
  });
});
