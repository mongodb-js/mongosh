import { CommonErrors, MongoshInvalidInputError } from '@mongosh/errors';
import { expect } from 'chai';
import CliOptions from './cli-options';
import generateUri from './uri-generator';

describe('uri-generator.generate-uri', () => {
  context('when no arguments are provided', () => {
    const options = { connectionSpecifier: undefined };

    it('returns the default uri', () => {
      expect(generateUri(options)).to.equal('mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000');
    });
  });

  context('when no URI is provided', () => {
    it('handles host', () => {
      expect(generateUri({ connectionSpecifier: undefined, host: 'localhost' })).to.equal('mongodb://localhost:27017/?directConnection=true&serverSelectionTimeoutMS=2000');
    });
    it('handles port', () => {
      expect(generateUri({ connectionSpecifier: undefined, port: '27018' })).to.equal('mongodb://127.0.0.1:27018/?directConnection=true&serverSelectionTimeoutMS=2000');
    });
    it('handles both host and port', () => {
      expect(generateUri({ connectionSpecifier: undefined, host: 'localhost', port: '27018' })).to.equal('mongodb://localhost:27018/?directConnection=true&serverSelectionTimeoutMS=2000');
    });
    it('handles host with port included', () => {
      expect(generateUri({ connectionSpecifier: undefined, host: 'localhost:27018' })).to.equal('mongodb://localhost:27018/?directConnection=true&serverSelectionTimeoutMS=2000');
    });
    it('handles host with an underscore', () => {
      expect(generateUri({ connectionSpecifier: undefined, host: 'some_host' })).to.equal('mongodb://some_host:27017/?directConnection=true');
    });
    it('throws if host has port AND port set to other value', () => {
      try {
        generateUri({ connectionSpecifier: undefined, host: 'localhost:27018', port: '27019' });
        expect.fail('expected error');
      } catch (e: any) {
        expect(e).to.be.instanceOf(MongoshInvalidInputError);
        expect(e.code).to.equal(CommonErrors.InvalidArgument);
      }
    });
    it('handles host has port AND port set to equal value', () => {
      expect(generateUri({ connectionSpecifier: undefined, host: 'localhost:27018', port: '27018' })).to.equal('mongodb://localhost:27018/?directConnection=true&serverSelectionTimeoutMS=2000');
    });
  });

  context('when a full URI is provided', () => {
    context('when no additional options are provided', () => {
      const options = { connectionSpecifier: 'mongodb://192.0.0.1:27018/foo' };

      it('returns the uri', () => {
        expect(generateUri(options)).to.equal('mongodb://192.0.0.1:27018/foo?directConnection=true');
      });
    });

    context('when additional options are provided', () => {
      context('when providing host with URI', () => {
        const uri = 'mongodb://192.0.0.1:27018/foo';
        const options = { connectionSpecifier: uri, host: '127.0.0.1' };

        it('throws an exception', () => {
          try {
            generateUri(options);
            expect.fail('expected error');
          } catch (e: any) {
            expect(e).to.be.instanceOf(MongoshInvalidInputError);
            expect(e.code).to.equal(CommonErrors.InvalidArgument);
          }
        });
      });

      context('when providing port with URI', () => {
        const uri = 'mongodb://192.0.0.1:27018/foo';
        const options = { connectionSpecifier: uri, port: '27018' };

        it('throws an exception', () => {
          try {
            generateUri(options);
            expect.fail('expected error');
          } catch (e: any) {
            expect(e.name).to.equal('MongoshInvalidInputError');
            expect(e.code).to.equal(CommonErrors.InvalidArgument);
          }
        });
      });

      context('when providing gssapiServiceName', () => {
        context('and the URI does not include SERVICE_NAME in authMechanismProperties', () => {
          const uri = 'mongodb+srv://some.host/foo';
          const options: CliOptions = { connectionSpecifier: uri, gssapiServiceName: 'alternate' };

          it('does not throw an error', () => {
            expect(generateUri(options)).to.equal('mongodb+srv://some.host/foo');
          });
        });

        context('and the URI includes SERVICE_NAME in authMechanismProperties', () => {
          const uri = 'mongodb+srv://some.host/foo?authMechanismProperties=SERVICE_NAME:whatever';
          const options: CliOptions = { connectionSpecifier: uri, gssapiServiceName: 'alternate' };

          it('throws an error', () => {
            try {
              generateUri(options);
            } catch (e: any) {
              expect(e.name).to.equal('MongoshInvalidInputError');
              expect(e.code).to.equal(CommonErrors.InvalidArgument);
              expect(e.message).to.contain('--gssapiServiceName parameter or the SERVICE_NAME');
              return;
            }
            expect.fail('expected error');
          });
        });
      });
    });

    context('when providing a URI with query parameters', () => {
      context('that do not conflict with directConnection', () => {
        const uri = 'mongodb://192.0.0.1:27018?readPreference=primary';
        const options = { connectionSpecifier: uri };
        it('still includes directConnection', () => {
          expect(generateUri(options)).to.equal('mongodb://192.0.0.1:27018/?readPreference=primary&directConnection=true');
        });
      });

      context('including replicaSet', () => {
        const uri = 'mongodb://192.0.0.1:27018/db?replicaSet=replicaset';
        const options = { connectionSpecifier: uri };
        it('does not add the directConnection parameter', () => {
          expect(generateUri(options)).to.equal(uri);
        });
      });

      context('including loadBalanced', () => {
        const uri = 'mongodb://192.0.0.1:27018/db?loadBalanced=true';
        const options = { connectionSpecifier: uri };
        it('does not add the directConnection parameter', () => {
          expect(generateUri(options)).to.equal(uri);
        });
      });

      context('including explicit directConnection', () => {
        const uri = 'mongodb://192.0.0.1:27018/db?directConnection=false';
        const options = { connectionSpecifier: uri };
        it('does not change the directConnection parameter', () => {
          expect(generateUri(options)).to.equal(uri);
        });
      });
    });

    context('when providing a URI with SRV record', () => {
      const uri = 'mongodb+srv://somehost/?readPreference=primary';
      const options = { connectionSpecifier: uri };
      it('no directConnection is added', () => {
        expect(generateUri(options)).to.equal(uri);
      });
    });

    context('when providing a URI with multiple seeds', () => {
      const uri = 'mongodb://192.42.42.42:27017,192.0.0.1:27018/db?readPreference=primary';
      const options = { connectionSpecifier: uri };
      it('no directConnection is added', () => {
        expect(generateUri(options)).to.equal(uri);
      });
    });

    context('when providing a URI with the legacy gssapiServiceName query parameter', () => {
      const uri = 'mongodb://192.42.42.42:27017,192.0.0.1:27018/db?gssapiServiceName=primary';
      const options = { connectionSpecifier: uri };

      it('throws an error', () => {
        try {
          generateUri(options);
        } catch (e: any) {
          expect(e.name).to.equal('MongoshInvalidInputError');
          expect(e.code).to.equal(CommonErrors.InvalidArgument);
          expect(e.message).to.contain('gssapiServiceName query parameter is not supported');
          return;
        }
        expect.fail('expected error');
      });
    });
  });

  context('when a URI is provided without a scheme', () => {
    context('when providing host', () => {
      const uri = '192.0.0.1';
      const options = { connectionSpecifier: uri };

      it('returns the uri with the scheme', () => {
        expect(generateUri(options)).to.equal(`mongodb://${uri}:27017/test?directConnection=true`);
      });
    });

    context('when providing host:port', () => {
      const uri = '192.0.0.1:27018';
      const options = { connectionSpecifier: uri };

      it('returns the uri with the scheme', () => {
        expect(generateUri(options)).to.equal(`mongodb://${uri}/test?directConnection=true`);
      });
    });

    context('when proving host + port option', () => {
      const uri = '192.0.0.1';
      const options = { connectionSpecifier: uri, port: '27018' };

      it('throws an exception', () => {
        try {
          generateUri(options);
          expect.fail('expected error');
        } catch (e: any) {
          expect(e).to.be.instanceOf(MongoshInvalidInputError);
          expect(e.code).to.equal(CommonErrors.InvalidArgument);
        }
      });
    });

    context('when no additional options are provided without db', () => {
      const uri = '192.0.0.1:27018';
      const options = { connectionSpecifier: uri };

      it('returns the uri with the scheme', () => {
        expect(generateUri(options)).to.equal(`mongodb://${uri}/test?directConnection=true`);
      });
    });

    context('when no additional options are provided with empty db', () => {
      const uri = '192.0.0.1:27018/';
      const options = { connectionSpecifier: uri };

      it('returns the uri with the scheme', () => {
        expect(generateUri(options)).to.equal(`mongodb://${uri}test?directConnection=true`);
      });
    });

    context('when no additional options are provided with db', () => {
      const uri = '192.0.0.1:27018/foo';
      const options = { connectionSpecifier: uri };

      it('returns the uri with the scheme', () => {
        expect(generateUri(options)).to.equal(`mongodb://${uri}?directConnection=true`);
      });
    });

    context('when no additional options are provided with db with special characters', () => {
      const uri = '192.0.0.1:27018/föö-:?%ab💙,\'_.c';
      const options = { connectionSpecifier: uri };

      it('returns the uri with the scheme', () => {
        expect(generateUri(options)).to.equal('mongodb://192.0.0.1:27018/f%C3%B6%C3%B6-%3A%3F%25ab%F0%9F%92%99%2C\'_.c?directConnection=true');
      });
    });

    context('when the db part does not start with a slash', () => {
      const uri = '192.0.0.1:27018?foo=bar';
      const options = { connectionSpecifier: uri };

      it('throws an exception', () => {
        try {
          generateUri(options);
          expect.fail('expected error');
        } catch (e: any) {
          expect(e).to.be.instanceOf(MongoshInvalidInputError);
          expect(e.code).to.equal(CommonErrors.InvalidArgument);
        }
      });
    });

    context('when additional options are provided', () => {
      context('when providing host with URI', () => {
        const uri = '192.0.0.1:27018/foo';
        const options = { connectionSpecifier: uri, host: '127.0.0.1' };

        it('throws an exception', () => {
          try {
            generateUri(options);
            expect.fail('expected error');
          } catch (e: any) {
            expect(e).to.be.instanceOf(MongoshInvalidInputError);
            expect(e.code).to.equal(CommonErrors.InvalidArgument);
          }
        });
      });

      context('when providing host with db', () => {
        const uri = 'foo';
        const options = { connectionSpecifier: uri, host: '127.0.0.2' };

        it('uses the provided host with default port', () => {
          expect(generateUri(options)).to.equal('mongodb://127.0.0.2:27017/foo?directConnection=true');
        });
      });

      context('when providing port with URI', () => {
        const uri = '192.0.0.1:27018/foo';
        const options = { connectionSpecifier: uri, port: '27018' };

        it('throws an exception', () => {
          try {
            generateUri(options);
            expect.fail('expected error');
          } catch (e: any) {
            expect(e).to.be.instanceOf(MongoshInvalidInputError);
            expect(e.code).to.equal(CommonErrors.InvalidArgument);
          }
        });
      });

      context('when providing port with db', () => {
        const uri = 'foo';
        const options = { connectionSpecifier: uri, port: '27018' };

        it('uses the provided host with default port', () => {
          expect(generateUri(options)).to.equal('mongodb://127.0.0.1:27018/foo?directConnection=true&serverSelectionTimeoutMS=2000');
        });
      });

      context('when providing port with only a host URI', () => {
        const uri = '127.0.0.2/foo';
        const options = { connectionSpecifier: uri, port: '27018' };

        it('throws an exception', () => {
          try {
            generateUri(options);
            expect.fail('expected error');
          } catch (e: any) {
            expect(e).to.be.instanceOf(MongoshInvalidInputError);
            expect(e.code).to.equal(CommonErrors.InvalidArgument);
          }
        });
      });

      context('when providing nodb', () => {
        const uri = 'mongodb://127.0.0.2/foo';
        const options = { connectionSpecifier: uri, nodb: true };

        it('returns an empty string', () => {
          expect(generateUri(options)).to.equal('');
        });
      });

      context('when providing explicit serverSelectionTimeoutMS', () => {
        const uri = 'mongodb://127.0.0.2/foo?serverSelectionTimeoutMS=10';
        const options = { connectionSpecifier: uri };

        it('does not override the existing value', () => {
          expect(generateUri(options)).to.equal('mongodb://127.0.0.2/foo?serverSelectionTimeoutMS=10&directConnection=true');
        });
      });

      context('when providing explicit serverSelectionTimeoutMS (different case)', () => {
        const uri = 'mongodb://127.0.0.2/foo?SERVERSELECTIONTIMEOUTMS=10';
        const options = { connectionSpecifier: uri };

        it('does not override the existing value', () => {
          expect(generateUri(options)).to.equal('mongodb://127.0.0.2/foo?SERVERSELECTIONTIMEOUTMS=10&directConnection=true');
        });
      });
    });

    context('when providing a URI with query parameters', () => {
      context('that do not conflict with directConnection', () => {
        const uri = 'mongodb://192.0.0.1:27018/?readPreference=primary';
        const options = { connectionSpecifier: uri };
        it('still includes directConnection', () => {
          expect(generateUri(options)).to.equal('mongodb://192.0.0.1:27018/?readPreference=primary&directConnection=true');
        });
      });

      context('including replicaSet', () => {
        const uri = 'mongodb://192.0.0.1:27018/db?replicaSet=replicaset';
        const options = { connectionSpecifier: uri };
        it('does not add the directConnection parameter', () => {
          expect(generateUri(options)).to.equal(uri);
        });
      });

      context('including explicit directConnection', () => {
        const uri = 'mongodb://192.0.0.1:27018/?directConnection=false';
        const options = { connectionSpecifier: uri };
        it('does not change the directConnection parameter', () => {
          expect(generateUri(options)).to.equal('mongodb://192.0.0.1:27018/?directConnection=false');
        });
      });
    });
  });


  context('when an invalid URI is provided', () => {
    const uri = '/x';
    const options = { connectionSpecifier: uri };

    it('returns the uri', () => {
      try {
        generateUri(options);
      } catch (e: any) {
        expect(e.message).to.contain('Invalid URI: /x');
        expect(e).to.be.instanceOf(MongoshInvalidInputError);
        expect(e.code).to.equal(CommonErrors.InvalidArgument);
        return;
      }
      expect.fail('expected error');
    });
  });

  context('when the --host option contains invalid characters', () => {
    const options = { host: 'a$b,c' };

    it('returns the uri', () => {
      try {
        generateUri(options);
      } catch (e: any) {
        expect(e.message).to.contain('The --host argument contains an invalid character: $');
        expect(e).to.be.instanceOf(MongoshInvalidInputError);
        expect(e.code).to.equal(CommonErrors.InvalidArgument);
        return;
      }
      expect.fail('expected error');
    });
  });

  context('when the --host option contains a seed list', () => {
    context('without a replica set', () => {
      it('returns a URI for the hosts and ports specified in --host', () => {
        const options = { host: 'host1:123,host2,host3:456,' };
        expect(generateUri(options)).to.equal('mongodb://host1:123,host2,host3:456/');
      });

      it('returns a URI for the hosts and ports specified in --host and database name', () => {
        const options = {
          host: 'host1:123,host_2,host3:456,',
          connectionSpecifier: 'admin'
        };
        expect(generateUri(options)).to.equal('mongodb://host1:123,host_2,host3:456/admin');
      });

      it('returns a URI for the hosts in --host and fixed --port', () => {
        const options = {
          host: 'host1:1234,host_2',
          port: '1234',
          connectionSpecifier: 'admin'
        };
        expect(generateUri(options)).to.equal('mongodb://host1:1234,host_2:1234/admin');
      });

      it('throws an error if seed list in --host contains port mismatches from fixed --port', () => {
        const options = {
          host: 'host1,host_2:123',
          port: '1234',
          connectionSpecifier: 'admin'
        };
        expect(() => generateUri(options)).to.throw('The host list contains different ports than provided by --port');
      });
    });

    context('with a replica set', () => {
      it('returns a URI for the hosts and ports specified in --host', () => {
        const options = { host: 'replsetname/host1:123,host2,host3:456,' };
        expect(generateUri(options)).to.equal('mongodb://host1:123,host2,host3:456/?replicaSet=replsetname');
      });

      it('returns a URI for the hosts and ports specified in --host and database name', () => {
        const options = { host: 'replsetname/host1:123,host2,host3:456', connectionSpecifier: 'admin' };
        expect(generateUri(options)).to.equal('mongodb://host1:123,host2,host3:456/admin?replicaSet=replsetname');
      });

      it('returns a URI for the hosts and ports specified in --host and database name with escaped chars', () => {
        const options = { host: 'replsetname/host1:123,host2,host3:456', connectionSpecifier: 'admin?foo=bar' };
        expect(generateUri(options)).to.equal('mongodb://host1:123,host2,host3:456/admin%3Ffoo%3Dbar?replicaSet=replsetname');
      });

      it('returns a URI for the hosts specified in --host and explicit --port', () => {
        const options = { host: 'replsetname/host1:123,host2,', port: '123' };
        expect(generateUri(options)).to.equal('mongodb://host1:123,host2:123/?replicaSet=replsetname');
      });

      it('throws an error if the hosts contain ports that mismatch from --port', () => {
        const options = { host: 'replsetname/host1:1234,host2,', port: '123' };
        expect(() => generateUri(options)).to.throw('The host list contains different ports than provided by --port');
      });
    });
  });
});
