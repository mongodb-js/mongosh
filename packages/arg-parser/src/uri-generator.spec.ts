import { CommonErrors, MongoshInvalidInputError } from '@mongosh/errors';
import { expect } from 'chai';
import type { CliOptions } from './cli-options';
import { generateUri } from './uri-generator';

describe('uri-generator.generate-uri', function () {
  context('when no arguments are provided', function () {
    const options = { connectionSpecifier: undefined };

    it('returns the default uri', function () {
      expect(generateUri(options)).to.equal(
        'mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000'
      );
    });
  });

  context('when no URI is provided', function () {
    it('handles host', function () {
      expect(
        generateUri({ connectionSpecifier: undefined, host: 'localhost' })
      ).to.equal(
        'mongodb://localhost:27017/?directConnection=true&serverSelectionTimeoutMS=2000'
      );
    });
    it('handles port', function () {
      expect(
        generateUri({ connectionSpecifier: undefined, port: '27018' })
      ).to.equal(
        'mongodb://127.0.0.1:27018/?directConnection=true&serverSelectionTimeoutMS=2000'
      );
    });
    it('handles both host and port', function () {
      expect(
        generateUri({
          connectionSpecifier: undefined,
          host: 'localhost',
          port: '27018',
        })
      ).to.equal(
        'mongodb://localhost:27018/?directConnection=true&serverSelectionTimeoutMS=2000'
      );
    });
    it('handles host with port included', function () {
      expect(
        generateUri({ connectionSpecifier: undefined, host: 'localhost:27018' })
      ).to.equal(
        'mongodb://localhost:27018/?directConnection=true&serverSelectionTimeoutMS=2000'
      );
    });
    it('handles host with an underscore', function () {
      expect(
        generateUri({ connectionSpecifier: undefined, host: 'some_host' })
      ).to.equal('mongodb://some_host:27017/?directConnection=true');
    });
    it('throws if host has port AND port set to other value', function () {
      try {
        generateUri({
          connectionSpecifier: undefined,
          host: 'localhost:27018',
          port: '27019',
        });
        expect.fail('expected error');
      } catch (e: any) {
        expect(e).to.be.instanceOf(MongoshInvalidInputError);
        expect(e.code).to.equal(CommonErrors.InvalidArgument);
      }
    });
    it('handles host has port AND port set to equal value', function () {
      expect(
        generateUri({
          connectionSpecifier: undefined,
          host: 'localhost:27018',
          port: '27018',
        })
      ).to.equal(
        'mongodb://localhost:27018/?directConnection=true&serverSelectionTimeoutMS=2000'
      );
    });
  });

  context('when a full URI is provided', function () {
    context('when no additional options are provided', function () {
      const options = { connectionSpecifier: 'mongodb://192.0.0.1:27018/foo' };

      it('returns the uri', function () {
        expect(generateUri(options)).to.equal(
          'mongodb://192.0.0.1:27018/foo?directConnection=true'
        );
      });
    });

    context('when additional options are provided', function () {
      context('when providing host with URI', function () {
        const uri = 'mongodb://192.0.0.1:27018/foo';
        const options = { connectionSpecifier: uri, host: '127.0.0.1' };

        it('throws an exception', function () {
          try {
            generateUri(options);
            expect.fail('expected error');
          } catch (e: any) {
            expect(e).to.be.instanceOf(MongoshInvalidInputError);
            expect(e.code).to.equal(CommonErrors.InvalidArgument);
          }
        });
      });

      context('when providing port with URI', function () {
        const uri = 'mongodb://192.0.0.1:27018/foo';
        const options = { connectionSpecifier: uri, port: '27018' };

        it('throws an exception', function () {
          try {
            generateUri(options);
            expect.fail('expected error');
          } catch (e: any) {
            expect(e.name).to.equal('MongoshInvalidInputError');
            expect(e.code).to.equal(CommonErrors.InvalidArgument);
          }
        });
      });

      context('when providing gssapiServiceName', function () {
        context(
          'and the URI does not include SERVICE_NAME in authMechanismProperties',
          function () {
            const uri = 'mongodb+srv://some.host/foo';
            const options: CliOptions = {
              connectionSpecifier: uri,
              gssapiServiceName: 'alternate',
            };

            it('does not throw an error', function () {
              expect(generateUri(options)).to.equal(
                'mongodb+srv://some.host/foo'
              );
            });
          }
        );

        context(
          'and the URI includes SERVICE_NAME in authMechanismProperties',
          function () {
            const uri =
              'mongodb+srv://some.host/foo?authMechanismProperties=SERVICE_NAME:whatever';
            const options: CliOptions = {
              connectionSpecifier: uri,
              gssapiServiceName: 'alternate',
            };

            it('throws an error', function () {
              try {
                generateUri(options);
              } catch (e: any) {
                expect(e.name).to.equal('MongoshInvalidInputError');
                expect(e.code).to.equal(CommonErrors.InvalidArgument);
                expect(e.message).to.contain(
                  '--gssapiServiceName parameter or the SERVICE_NAME'
                );
                return;
              }
              expect.fail('expected error');
            });
          }
        );
      });
    });

    context('when providing a URI with query parameters', function () {
      context('that do not conflict with directConnection', function () {
        const uri = 'mongodb://192.0.0.1:27018?readPreference=primary';
        const options = { connectionSpecifier: uri };
        it('still includes directConnection', function () {
          expect(generateUri(options)).to.equal(
            'mongodb://192.0.0.1:27018/?readPreference=primary&directConnection=true'
          );
        });
      });

      context('including replicaSet', function () {
        const uri = 'mongodb://192.0.0.1:27018/db?replicaSet=replicaset';
        const options = { connectionSpecifier: uri };
        it('does not add the directConnection parameter', function () {
          expect(generateUri(options)).to.equal(uri);
        });
      });

      context('including loadBalanced', function () {
        const uri = 'mongodb://192.0.0.1:27018/db?loadBalanced=true';
        const options = { connectionSpecifier: uri };
        it('does not add the directConnection parameter', function () {
          expect(generateUri(options)).to.equal(uri);
        });
      });

      context('including explicit directConnection', function () {
        const uri = 'mongodb://192.0.0.1:27018/db?directConnection=false';
        const options = { connectionSpecifier: uri };
        it('does not change the directConnection parameter', function () {
          expect(generateUri(options)).to.equal(uri);
        });
      });
    });

    context('when providing a URI with SRV record', function () {
      const uri = 'mongodb+srv://somehost/?readPreference=primary';
      const options = { connectionSpecifier: uri };
      it('no directConnection is added', function () {
        expect(generateUri(options)).to.equal(uri);
      });
    });

    context('when providing a URI with multiple seeds', function () {
      const uri =
        'mongodb://192.42.42.42:27017,192.0.0.1:27018/db?readPreference=primary';
      const options = { connectionSpecifier: uri };
      it('no directConnection is added', function () {
        expect(generateUri(options)).to.equal(uri);
      });
    });

    context(
      'when providing a URI with the legacy gssapiServiceName query parameter',
      function () {
        const uri =
          'mongodb://192.42.42.42:27017,192.0.0.1:27018/db?gssapiServiceName=primary';
        const options = { connectionSpecifier: uri };

        it('throws an error', function () {
          try {
            generateUri(options);
          } catch (e: any) {
            expect(e.name).to.equal('MongoshInvalidInputError');
            expect(e.code).to.equal(CommonErrors.InvalidArgument);
            expect(e.message).to.contain(
              'gssapiServiceName query parameter is not supported'
            );
            return;
          }
          expect.fail('expected error');
        });
      }
    );
  });

  context('when a URI is provided without a scheme', function () {
    context('when providing host', function () {
      const uri = '192.0.0.1';
      const options = { connectionSpecifier: uri };

      it('returns the uri with the scheme', function () {
        expect(generateUri(options)).to.equal(
          `mongodb://${uri}:27017/?directConnection=true`
        );
      });
    });

    context('when providing host:port', function () {
      const uri = '192.0.0.1:27018';
      const options = { connectionSpecifier: uri };

      it('returns the uri with the scheme', function () {
        expect(generateUri(options)).to.equal(
          `mongodb://${uri}/?directConnection=true`
        );
      });
    });

    context('when proving host + port option', function () {
      const uri = '192.0.0.1';
      const options = { connectionSpecifier: uri, port: '27018' };

      it('throws an exception', function () {
        try {
          generateUri(options);
          expect.fail('expected error');
        } catch (e: any) {
          expect(e).to.be.instanceOf(MongoshInvalidInputError);
          expect(e.code).to.equal(CommonErrors.InvalidArgument);
        }
      });
    });

    context('when no additional options are provided without db', function () {
      const uri = '192.0.0.1:27018';
      const options = { connectionSpecifier: uri };

      it('returns the uri with the scheme', function () {
        expect(generateUri(options)).to.equal(
          `mongodb://${uri}/?directConnection=true`
        );
      });
    });

    context(
      'when no additional options are provided with empty db',
      function () {
        const uri = '192.0.0.1:27018/';
        const options = { connectionSpecifier: uri };

        it('returns the uri with the scheme', function () {
          expect(generateUri(options)).to.equal(
            `mongodb://${uri}?directConnection=true`
          );
        });
      }
    );

    context('when no additional options are provided with db', function () {
      const uri = '192.0.0.1:27018/foo';
      const options = { connectionSpecifier: uri };

      it('returns the uri with the scheme', function () {
        expect(generateUri(options)).to.equal(
          `mongodb://${uri}?directConnection=true`
        );
      });
    });

    context(
      'when no additional options are provided with db with special characters',
      function () {
        const uri = "192.0.0.1:27018/föö-:?%ab💙,'_.c";
        const options = { connectionSpecifier: uri };

        it('returns the uri with the scheme', function () {
          expect(generateUri(options)).to.equal(
            "mongodb://192.0.0.1:27018/f%C3%B6%C3%B6-%3A%3F%25ab%F0%9F%92%99%2C'_.c?directConnection=true"
          );
        });
      }
    );

    context('when the db part does not start with a slash', function () {
      const uri = '192.0.0.1:27018?foo=bar';
      const options = { connectionSpecifier: uri };

      it('throws an exception', function () {
        try {
          generateUri(options);
          expect.fail('expected error');
        } catch (e: any) {
          expect(e).to.be.instanceOf(MongoshInvalidInputError);
          expect(e.code).to.equal(CommonErrors.InvalidArgument);
        }
      });
    });

    context('when additional options are provided', function () {
      context('when providing host with URI', function () {
        const uri = '192.0.0.1:27018/foo';
        const options = { connectionSpecifier: uri, host: '127.0.0.1' };

        it('throws an exception', function () {
          try {
            generateUri(options);
            expect.fail('expected error');
          } catch (e: any) {
            expect(e).to.be.instanceOf(MongoshInvalidInputError);
            expect(e.code).to.equal(CommonErrors.InvalidArgument);
          }
        });
      });

      context('when providing host with db', function () {
        const uri = 'foo';
        const options = { connectionSpecifier: uri, host: '127.0.0.2' };

        it('uses the provided host with default port', function () {
          expect(generateUri(options)).to.equal(
            'mongodb://127.0.0.2:27017/foo?directConnection=true'
          );
        });
      });

      context('when providing port with URI', function () {
        const uri = '192.0.0.1:27018/foo';
        const options = { connectionSpecifier: uri, port: '27018' };

        it('throws an exception', function () {
          try {
            generateUri(options);
            expect.fail('expected error');
          } catch (e: any) {
            expect(e).to.be.instanceOf(MongoshInvalidInputError);
            expect(e.code).to.equal(CommonErrors.InvalidArgument);
          }
        });
      });

      context('when providing port with db', function () {
        const uri = 'foo';
        const options = { connectionSpecifier: uri, port: '27018' };

        it('uses the provided host with default port', function () {
          expect(generateUri(options)).to.equal(
            'mongodb://127.0.0.1:27018/foo?directConnection=true&serverSelectionTimeoutMS=2000'
          );
        });
      });

      context('when providing port with only a host URI', function () {
        const uri = '127.0.0.2/foo';
        const options = { connectionSpecifier: uri, port: '27018' };

        it('throws an exception', function () {
          try {
            generateUri(options);
            expect.fail('expected error');
          } catch (e: any) {
            expect(e).to.be.instanceOf(MongoshInvalidInputError);
            expect(e.code).to.equal(CommonErrors.InvalidArgument);
          }
        });
      });

      context('when providing nodb', function () {
        const uri = 'mongodb://127.0.0.2/foo';
        const options = { connectionSpecifier: uri, nodb: true };

        it('returns an empty string', function () {
          expect(generateUri(options)).to.equal('');
        });
      });

      context('when providing explicit serverSelectionTimeoutMS', function () {
        const uri = 'mongodb://127.0.0.2/foo?serverSelectionTimeoutMS=10';
        const options = { connectionSpecifier: uri };

        it('does not override the existing value', function () {
          expect(generateUri(options)).to.equal(
            'mongodb://127.0.0.2/foo?serverSelectionTimeoutMS=10&directConnection=true'
          );
        });
      });

      context(
        'when providing explicit serverSelectionTimeoutMS (different case)',
        function () {
          const uri = 'mongodb://127.0.0.2/foo?SERVERSELECTIONTIMEOUTMS=10';
          const options = { connectionSpecifier: uri };

          it('does not override the existing value', function () {
            expect(generateUri(options)).to.equal(
              'mongodb://127.0.0.2/foo?SERVERSELECTIONTIMEOUTMS=10&directConnection=true'
            );
          });
        }
      );
    });

    context('when providing a URI with query parameters', function () {
      context('that do not conflict with directConnection', function () {
        const uri = 'mongodb://192.0.0.1:27018/?readPreference=primary';
        const options = { connectionSpecifier: uri };
        it('still includes directConnection', function () {
          expect(generateUri(options)).to.equal(
            'mongodb://192.0.0.1:27018/?readPreference=primary&directConnection=true'
          );
        });
      });

      context('including replicaSet', function () {
        const uri = 'mongodb://192.0.0.1:27018/db?replicaSet=replicaset';
        const options = { connectionSpecifier: uri };
        it('does not add the directConnection parameter', function () {
          expect(generateUri(options)).to.equal(uri);
        });
      });

      context('including explicit directConnection', function () {
        const uri = 'mongodb://192.0.0.1:27018/?directConnection=false';
        const options = { connectionSpecifier: uri };
        it('does not change the directConnection parameter', function () {
          expect(generateUri(options)).to.equal(
            'mongodb://192.0.0.1:27018/?directConnection=false'
          );
        });
      });
    });
  });

  context('when an invalid URI is provided', function () {
    const uri = '/x';
    const options = { connectionSpecifier: uri };

    it('returns the uri', function () {
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

  context('when the --host option contains invalid characters', function () {
    const options = { host: 'a$b,c' };

    it('returns the uri', function () {
      try {
        generateUri(options);
      } catch (e: any) {
        expect(e.message).to.contain(
          'The --host argument contains an invalid character: $'
        );
        expect(e).to.be.instanceOf(MongoshInvalidInputError);
        expect(e.code).to.equal(CommonErrors.InvalidArgument);
        return;
      }
      expect.fail('expected error');
    });
  });

  context('when the --host option contains a seed list', function () {
    context('without a replica set', function () {
      it('returns a URI for the hosts and ports specified in --host', function () {
        const options = { host: 'host1:123,host2,host3:456,' };
        expect(generateUri(options)).to.equal(
          'mongodb://host1:123,host2,host3:456/'
        );
      });

      it('returns a URI for the hosts and ports specified in --host and database name', function () {
        const options = {
          host: 'host1:123,host_2,host3:456,',
          connectionSpecifier: 'admin',
        };
        expect(generateUri(options)).to.equal(
          'mongodb://host1:123,host_2,host3:456/admin'
        );
      });

      it('returns a URI for the hosts in --host and fixed --port', function () {
        const options = {
          host: 'host1:1234,host_2',
          port: '1234',
          connectionSpecifier: 'admin',
        };
        expect(generateUri(options)).to.equal(
          'mongodb://host1:1234,host_2:1234/admin'
        );
      });

      it('throws an error if seed list in --host contains port mismatches from fixed --port', function () {
        const options = {
          host: 'host1,host_2:123',
          port: '1234',
          connectionSpecifier: 'admin',
        };
        expect(() => generateUri(options)).to.throw(
          'The host list contains different ports than provided by --port'
        );
      });
    });

    context('with a replica set', function () {
      it('returns a URI for the hosts and ports specified in --host', function () {
        const options = { host: 'replsetname/host1:123,host2,host3:456,' };
        expect(generateUri(options)).to.equal(
          'mongodb://host1:123,host2,host3:456/?replicaSet=replsetname'
        );
      });

      it('returns a URI for the hosts and ports specified in --host and database name', function () {
        const options = {
          host: 'replsetname/host1:123,host2,host3:456',
          connectionSpecifier: 'admin',
        };
        expect(generateUri(options)).to.equal(
          'mongodb://host1:123,host2,host3:456/admin?replicaSet=replsetname'
        );
      });

      it('returns a URI for the hosts and ports specified in --host and database name with escaped chars', function () {
        const options = {
          host: 'replsetname/host1:123,host2,host3:456',
          connectionSpecifier: 'admin?foo=bar',
        };
        expect(generateUri(options)).to.equal(
          'mongodb://host1:123,host2,host3:456/admin%3Ffoo%3Dbar?replicaSet=replsetname'
        );
      });

      it('returns a URI for the hosts and ports when containing IP addresses', function () {
        const options = {
          host: 'replsetname/198.51.100.1:123,foo.example.net,[::1],[::1]:456,',
        };
        expect(generateUri(options)).to.equal(
          'mongodb://198.51.100.1:123,foo.example.net,[::1],[::1]:456/?replicaSet=replsetname'
        );
      });

      it('returns a URI for the hosts and ports when containing IP addresses with explicit --port', function () {
        const options = {
          host: 'replsetname/198.51.100.1,foo.example.net,[::1],',
          port: '456',
        };
        expect(generateUri(options)).to.equal(
          'mongodb://198.51.100.1:456,foo.example.net:456,[::1]:456/?replicaSet=replsetname'
        );
      });

      it('returns a URI for the hosts specified in --host and explicit --port', function () {
        const options = { host: 'replsetname/host1:123,host2,', port: '123' };
        expect(generateUri(options)).to.equal(
          'mongodb://host1:123,host2:123/?replicaSet=replsetname'
        );
      });

      it('throws an error if the hosts contain ports that mismatch from --port', function () {
        const options = { host: 'replsetname/host1:1234,host2,', port: '123' };
        expect(() => generateUri(options)).to.throw(
          'The host list contains different ports than provided by --port'
        );
      });
    });
  });
});
