/* eslint-disable no-console */
import { signatures } from '../';

Object.keys(signatures)
  .sort()
  .filter((typeName) => typeName !== 'unknown')
  .filter((typeName) => !typeName.endsWith('Result'))
  .forEach((typeName) => {
    console.info(`${typeName}:`);
    Object.keys(signatures[typeName].attributes as Record<string, any>)
      .sort()
      .forEach((attributeName) => {
        console.info(`  - ${attributeName}`);
      });
  });
