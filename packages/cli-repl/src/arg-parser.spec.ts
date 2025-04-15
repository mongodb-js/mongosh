import { MongoshUnimplementedError } from '@mongosh/errors';
import { expect } from 'chai';
import stripAnsi from 'strip-ansi';
import { getLocale, parseCliArgs } from './arg-parser';

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
    const baseArgv = ['node', 'mongosh'];
    context('when providing only a URI', function () {
      const uri = 'mongodb://domain.com:20000';
      const argv = [...baseArgv, uri];

      it('returns the URI in the object', function () {
        expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
      });
    });

    context('when providing a URI + options', function () {
      const uri = 'mongodb://domain.com:20000';

      context('when providing general options', function () {
        context('when providing --ipv6', function () {
          const argv = [...baseArgv, uri, '--ipv6'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the ipv6 value in the object', function () {
            expect(parseCliArgs(argv).ipv6).to.equal(true);
          });
        });

        context('when providing -h', function () {
          const argv = [...baseArgv, uri, '-h'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the help value in the object', function () {
            expect(parseCliArgs(argv).help).to.equal(true);
          });
        });

        context('when providing --help', function () {
          const argv = [...baseArgv, uri, '--help'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the help value in the object', function () {
            expect(parseCliArgs(argv).help).to.equal(true);
          });
        });

        context('when providing --version', function () {
          const argv = [...baseArgv, uri, '--version'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the version value in the object', function () {
            expect(parseCliArgs(argv).version).to.equal(true);
          });
        });

        context('when providing --verbose', function () {
          const argv = [...baseArgv, uri, '--verbose'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the verbose value in the object', function () {
            expect(parseCliArgs(argv).verbose).to.equal(true);
          });
        });

        context('when providing --shell', function () {
          const argv = [...baseArgv, uri, '--shell'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the shell value in the object', function () {
            expect(parseCliArgs(argv).shell).to.equal(true);
          });
        });

        context('when providing --nodb', function () {
          const argv = [...baseArgv, uri, '--nodb'];

          it('does not return the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(undefined);
            expect(parseCliArgs(argv).fileNames).to.deep.equal([uri]);
          });

          it('sets the nodb value in the object', function () {
            expect(parseCliArgs(argv).nodb).to.equal(true);
          });
        });

        context('when providing --norc', function () {
          const argv = [...baseArgv, uri, '--norc'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the norc value in the object', function () {
            expect(parseCliArgs(argv).norc).to.equal(true);
          });
        });

        context('when providing --quiet', function () {
          const argv = [...baseArgv, uri, '--quiet'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the quiet value in the object', function () {
            expect(parseCliArgs(argv).quiet).to.equal(true);
          });
        });

        context('when providing --eval (single value)', function () {
          const argv = [...baseArgv, uri, '--eval', '1+1'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the eval value in the object', function () {
            expect(parseCliArgs(argv).eval).to.deep.equal(['1+1']);
          });
        });

        context('when providing --eval (multiple values)', function () {
          const argv = [...baseArgv, uri, '--eval', '1+1', '--eval', '2+2'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the eval value in the object', function () {
            expect(parseCliArgs(argv).eval).to.deep.equal(['1+1', '2+2']);
          });
        });

        context('when providing --retryWrites', function () {
          const argv = [...baseArgv, uri, '--retryWrites'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the retryWrites value in the object', function () {
            expect(parseCliArgs(argv).retryWrites).to.equal(true);
          });
        });

        context('when providing an unknown parameter', function () {
          const argv = [...baseArgv, uri, '--what'];

          it('raises an error', function () {
            try {
              parseCliArgs(argv);
            } catch (err: any) {
              return expect(stripAnsi(err.message)).to.contain(
                'Error parsing command line: unrecognized option: --what'
              );
            }
            expect.fail('parsing unknown parameter did not throw');
          });
        });
      });

      context('when providing authentication options', function () {
        context('when providing -u', function () {
          const argv = [...baseArgv, uri, '-u', 'richard'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the username in the object', function () {
            expect(parseCliArgs(argv).username).to.equal('richard');
          });
        });

        context('when providing --username', function () {
          const argv = [...baseArgv, uri, '--username', 'richard'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the username in the object', function () {
            expect(parseCliArgs(argv).username).to.equal('richard');
          });
        });

        context('when providing -p', function () {
          const argv = [...baseArgv, uri, '-p', 'pw'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the password in the object', function () {
            expect(parseCliArgs(argv).password).to.equal('pw');
          });
        });

        context('when providing --password', function () {
          const argv = [...baseArgv, uri, '--password', 'pw'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the password in the object', function () {
            expect(parseCliArgs(argv).password).to.equal('pw');
          });
        });

        context('when providing --authenticationDatabase', function () {
          const argv = [...baseArgv, uri, '--authenticationDatabase', 'db'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the authenticationDatabase in the object', function () {
            expect(parseCliArgs(argv).authenticationDatabase).to.equal('db');
          });
        });

        context('when providing --authenticationMechanism', function () {
          const argv = [
            ...baseArgv,
            uri,
            '--authenticationMechanism',
            'SCRAM-SHA-256',
          ];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the authenticationMechanism in the object', function () {
            expect(parseCliArgs(argv).authenticationMechanism).to.equal(
              'SCRAM-SHA-256'
            );
          });
        });

        context('when providing --gssapiServiceName', function () {
          const argv = [...baseArgv, uri, '--gssapiServiceName', 'mongosh'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the gssapiServiceName in the object', function () {
            expect(parseCliArgs(argv).gssapiServiceName).to.equal('mongosh');
          });
        });

        context('when providing --gssapiHostName', function () {
          const argv = [...baseArgv, uri, '--gssapiHostName', 'example.com'];

          it('throws an error since it is not supported', function () {
            try {
              parseCliArgs(argv);
            } catch (e: any) {
              expect(e).to.be.instanceOf(MongoshUnimplementedError);
              expect(e.message).to.include(
                'Argument --gssapiHostName is not supported in mongosh'
              );
              return;
            }
            expect.fail('Expected error');
          });

          // it('returns the URI in the object', () => {
          //   expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          // });

          // it('sets the gssapiHostName in the object', () => {
          //   expect(parseCliArgs(argv).gssapiHostName).to.equal('example.com');
          // });
        });

        context('when providing --sspiHostnameCanonicalization', function () {
          const argv = [
            ...baseArgv,
            uri,
            '--sspiHostnameCanonicalization',
            'forward',
          ];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the gssapiHostName in the object', function () {
            expect(parseCliArgs(argv).sspiHostnameCanonicalization).to.equal(
              'forward'
            );
          });
        });

        context('when providing --sspiRealmOverride', function () {
          const argv = [
            ...baseArgv,
            uri,
            '--sspiRealmOverride',
            'example2.com',
          ];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the gssapiHostName in the object', function () {
            expect(parseCliArgs(argv).sspiRealmOverride).to.equal(
              'example2.com'
            );
          });
        });

        context('when providing --awsIamSessionToken', function () {
          const argv = [...baseArgv, uri, '--awsIamSessionToken', 'tok'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the awsIamSessionToken in the object', function () {
            expect(parseCliArgs(argv).awsIamSessionToken).to.equal('tok');
          });
        });
      });

      context('when providing TLS options', function () {
        context('when providing --tls', function () {
          const argv = [...baseArgv, uri, '--tls'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the tls in the object', function () {
            expect(parseCliArgs(argv).tls).to.equal(true);
          });
        });

        context('when providing -tls (single dash)', function () {
          const argv = [...baseArgv, uri, '-tls'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the tls in the object', function () {
            expect(parseCliArgs(argv).tls).to.equal(true);
          });
        });

        context('when providing --tlsCertificateKeyFile', function () {
          const argv = [...baseArgv, uri, '--tlsCertificateKeyFile', 'test'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the tlsCertificateKeyFile in the object', function () {
            expect(parseCliArgs(argv).tlsCertificateKeyFile).to.equal('test');
          });
        });

        context(
          'when providing -tlsCertificateKeyFile (single dash)',
          function () {
            const argv = [...baseArgv, uri, '-tlsCertificateKeyFile', 'test'];

            it('returns the URI in the object', function () {
              expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
            });

            it('sets the tlsCertificateKeyFile in the object', function () {
              expect(parseCliArgs(argv).tlsCertificateKeyFile).to.equal('test');
            });
          }
        );

        context('when providing --tlsCertificateKeyFilePassword', function () {
          const argv = [
            ...baseArgv,
            uri,
            '--tlsCertificateKeyFilePassword',
            'test',
          ];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the tlsCertificateKeyFilePassword in the object', function () {
            expect(parseCliArgs(argv).tlsCertificateKeyFilePassword).to.equal(
              'test'
            );
          });
        });

        context('when providing --tlsCAFile', function () {
          const argv = [...baseArgv, uri, '--tlsCAFile', 'test'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the tlsCAFile in the object', function () {
            expect(parseCliArgs(argv).tlsCAFile).to.equal('test');
          });
        });

        context('when providing --tlsCRLFile', function () {
          const argv = [...baseArgv, uri, '--tlsCRLFile', 'test'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the tlsCRLFile in the object', function () {
            expect(parseCliArgs(argv).tlsCRLFile).to.equal('test');
          });
        });

        context('when providing --tlsAllowInvalidHostnames', function () {
          const argv = [...baseArgv, uri, '--tlsAllowInvalidHostnames'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the tlsAllowInvalidHostnames in the object', function () {
            expect(parseCliArgs(argv).tlsAllowInvalidHostnames).to.equal(true);
          });
        });

        context('when providing --tlsAllowInvalidCertificates', function () {
          const argv = [...baseArgv, uri, '--tlsAllowInvalidCertificates'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the tlsAllowInvalidCertificates in the object', function () {
            expect(parseCliArgs(argv).tlsAllowInvalidCertificates).to.equal(
              true
            );
          });
        });

        context('when providing --sslFIPSMode', function () {
          const argv = [...baseArgv, uri, '--sslFIPSMode'];

          it('throws an error since it is not supported', function () {
            try {
              parseCliArgs(argv);
            } catch (e: any) {
              expect(e).to.be.instanceOf(MongoshUnimplementedError);
              expect(e.message).to.include(
                'Argument --sslFIPSMode is not supported in mongosh'
              );
              return;
            }
            expect.fail('Expected error');
          });

          // it('returns the URI in the object', () => {
          //   expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          // });

          // it('sets the tlsFIPSMode in the object', () => {
          //   expect(parseCliArgs(argv).tlsFIPSMode).to.equal(true);
          // });
        });

        context('when providing --tlsCertificateSelector', function () {
          const argv = [...baseArgv, uri, '--tlsCertificateSelector', 'test'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the tlsCertificateSelector in the object', function () {
            expect(parseCliArgs(argv).tlsCertificateSelector).to.equal('test');
          });
        });

        context('when providing --tlsDisabledProtocols', function () {
          const argv = [
            ...baseArgv,
            uri,
            '--tlsDisabledProtocols',
            'TLS1_0,TLS2_0',
          ];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the tlsDisabledProtocols in the object', function () {
            expect(parseCliArgs(argv).tlsDisabledProtocols).to.equal(
              'TLS1_0,TLS2_0'
            );
          });
        });
      });

      context('when providing FLE options', function () {
        context('when providing --awsAccessKeyId', function () {
          const argv = [...baseArgv, uri, '--awsAccessKeyId', 'foo'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the awsAccessKeyId in the object', function () {
            expect(parseCliArgs(argv).awsAccessKeyId).to.equal('foo');
          });
        });

        context('when providing --awsSecretAccessKey', function () {
          const argv = [...baseArgv, uri, '--awsSecretAccessKey', 'foo'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the awsSecretAccessKey in the object', function () {
            expect(parseCliArgs(argv).awsSecretAccessKey).to.equal('foo');
          });
        });

        context('when providing --awsSessionToken', function () {
          const argv = [...baseArgv, uri, '--awsSessionToken', 'foo'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the awsSessionToken in the object', function () {
            expect(parseCliArgs(argv).awsSessionToken).to.equal('foo');
          });
        });

        context('when providing --keyVaultNamespace', function () {
          const argv = [...baseArgv, uri, '--keyVaultNamespace', 'foo.bar'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the keyVaultNamespace in the object', function () {
            expect(parseCliArgs(argv).keyVaultNamespace).to.equal('foo.bar');
          });
        });

        context('when providing --kmsURL', function () {
          const argv = [...baseArgv, uri, '--kmsURL', 'example.com'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the kmsURL in the object', function () {
            expect(parseCliArgs(argv).kmsURL).to.equal('example.com');
          });
        });
      });

      context('when providing versioned API options', function () {
        context('when providing --apiVersion', function () {
          const argv = [...baseArgv, uri, '--apiVersion', '1'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the apiVersion in the object', function () {
            expect(parseCliArgs(argv).apiVersion).to.equal('1');
          });
        });

        context('when providing --apiDeprecationErrors', function () {
          const argv = [...baseArgv, uri, '--apiDeprecationErrors'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the apiVersion in the object', function () {
            expect(parseCliArgs(argv).apiDeprecationErrors).to.equal(true);
          });
        });

        context('when providing --apiStrict', function () {
          const argv = [...baseArgv, uri, '--apiStrict'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the apiVersion in the object', function () {
            expect(parseCliArgs(argv).apiStrict).to.equal(true);
          });
        });
      });

      context('when providing filenames after an URI', function () {
        context('when the filenames end in .js', function () {
          const argv = [...baseArgv, uri, 'test1.js', 'test2.js'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the filenames', function () {
            expect(parseCliArgs(argv).fileNames?.[0]).to.equal('test1.js');
            expect(parseCliArgs(argv).fileNames?.[1]).to.equal('test2.js');
          });
        });

        context('when the filenames end in .mongodb', function () {
          const argv = [...baseArgv, uri, 'test1.mongodb', 'test2.mongodb'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the filenames', function () {
            expect(parseCliArgs(argv).fileNames?.[0]).to.equal('test1.mongodb');
            expect(parseCliArgs(argv).fileNames?.[1]).to.equal('test2.mongodb');
          });
        });

        context('when the filenames end in other extensions', function () {
          const argv = [...baseArgv, uri, 'test1.txt', 'test2.txt'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the filenames', function () {
            expect(parseCliArgs(argv).fileNames?.[0]).to.equal('test1.txt');
            expect(parseCliArgs(argv).fileNames?.[1]).to.equal('test2.txt');
          });
        });

        context('when filenames are specified using -f', function () {
          const argv = [...baseArgv, uri, '-f', 'test1.txt', '-f', 'test2.txt'];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the filenames', function () {
            expect(parseCliArgs(argv).fileNames?.[0]).to.equal('test1.txt');
            expect(parseCliArgs(argv).fileNames?.[1]).to.equal('test2.txt');
          });
        });

        context('when filenames are specified using -f/--file', function () {
          const argv = [
            ...baseArgv,
            uri,
            '-f',
            'test1.txt',
            '--file',
            'test2.txt',
          ];

          it('returns the URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(uri);
          });

          it('sets the filenames', function () {
            expect(parseCliArgs(argv).fileNames?.[0]).to.equal('test1.txt');
            expect(parseCliArgs(argv).fileNames?.[1]).to.equal('test2.txt');
          });
        });
      });

      context('when providing filenames without an URI', function () {
        context('when the filenames end in .js', function () {
          const argv = [...baseArgv, 'test1.js', 'test2.js'];

          it('returns no URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(undefined);
          });

          it('sets the filenames', function () {
            expect(parseCliArgs(argv).fileNames?.[0]).to.equal('test1.js');
            expect(parseCliArgs(argv).fileNames?.[1]).to.equal('test2.js');
          });
        });

        context('when the filenames end in .mongodb', function () {
          const argv = [...baseArgv, 'test1.mongodb', 'test2.mongodb'];

          it('returns no URI in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(undefined);
          });

          it('sets the filenames', function () {
            expect(parseCliArgs(argv).fileNames?.[0]).to.equal('test1.mongodb');
            expect(parseCliArgs(argv).fileNames?.[1]).to.equal('test2.mongodb');
          });
        });

        context('when the filenames end in other extensions', function () {
          const argv = [...baseArgv, 'test1.txt', 'test2.txt'];

          it('returns the first filename as an URI', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(
              'test1.txt'
            );
          });

          it('uses the remainder as filenames', function () {
            expect(parseCliArgs(argv).fileNames?.[0]).to.equal('test2.txt');
          });
        });

        context('when the first argument is an URI ending in .js', function () {
          const argv = [...baseArgv, 'mongodb://domain.foo.js', 'test2.txt'];

          it('returns the first filename as an URI', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(
              'mongodb://domain.foo.js'
            );
          });

          it('uses the remainder as filenames', function () {
            expect(parseCliArgs(argv).fileNames?.[0]).to.equal('test2.txt');
          });
        });

        context(
          'when the first argument is an URI ending in .js but --file is used',
          function () {
            const argv = [
              ...baseArgv,
              '--file',
              'mongodb://domain.foo.js',
              'mongodb://domain.bar.js',
            ];

            it('returns the first filename as an URI', function () {
              expect(parseCliArgs(argv).connectionSpecifier).to.equal(
                'mongodb://domain.bar.js'
              );
            });

            it('uses the remainder as filenames', function () {
              expect(parseCliArgs(argv).fileNames?.[0]).to.equal(
                'mongodb://domain.foo.js'
              );
            });
          }
        );
      });
    });

    context('when providing no URI', function () {
      context('when providing a DB address', function () {
        context('when only a db name is provided', function () {
          const db = 'foo';
          const argv = [...baseArgv, db];

          it('sets the db in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(db);
          });
        });

        context('when a db address is provided without a scheme', function () {
          const db = '192.168.0.5:9999/foo';
          const argv = [...baseArgv, db];

          it('sets the db in the object', function () {
            expect(parseCliArgs(argv).connectionSpecifier).to.equal(db);
          });
        });
      });

      context('when providing no DB address', function () {
        context('when providing a host', function () {
          const argv = [...baseArgv, '--host', 'example.com'];

          it('sets the host value in the object', function () {
            expect(parseCliArgs(argv).host).to.equal('example.com');
          });
        });

        context('when providing a port', function () {
          const argv = [...baseArgv, '--port', '20000'];

          it('sets the port value in the object', function () {
            expect(parseCliArgs(argv).port).to.equal('20000');
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
          const argv = [...baseArgv, `--${deprecated}`];
          if (value) {
            argv.push(value);
          }

          const args = parseCliArgs(argv);
          expect(args).to.not.have.property(deprecated);
          expect(args[replacement]).to.equal(value ?? true);
        });
      }
    });
  });
});
