export function adaptDriverV36ConnectionParams(
  oldDriverUrl,
  oldDriverOptions,
  connectionModelDriverOptions
) {
  const newDriverOptions = {
    ...oldDriverOptions
  };

  delete newDriverOptions.useUnifiedTopology;
  delete newDriverOptions.connectWithNoPrimary;
  delete newDriverOptions.useNewUrlParser;

  // `true` is not a valid tls checkServerIdentity option that seems to break
  // driver 4
  //
  // TODO(NODE-3061): Remove when fixed on driver side
  if (newDriverOptions.checkServerIdentity === true) {
    delete newDriverOptions.checkServerIdentity;
  }

  // driver 4 doesn't support certificates as buffers, so let's copy paths
  // back from model `driverOptions`
  //
  // TODO: Driver is not sure if buffer behavior was a bug or a feature,
  // hopefully this can be removed eventually (see https://mongodb.slack.com/archives/C0V8RU15L/p1612347025017200)
  ['sslCA', 'sslCRL', 'sslCert', 'sslKey'].forEach((key) => {
    if (
      newDriverOptions[key] && connectionModelDriverOptions[key]
    ) {
    // Option value can be array or a string in connection-model, we'll
    // unwrap it if it's an array (it's always an array with one value)
      const option = connectionModelDriverOptions[key];
      newDriverOptions[key] = Array.isArray(option) ? option[0] : option;
    }
  });

  return [oldDriverUrl, newDriverOptions];
}
