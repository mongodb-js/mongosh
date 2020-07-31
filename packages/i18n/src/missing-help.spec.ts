import fs from 'fs';
import path from 'path';
import { signatures } from '../../shell-api';

const localesDir = path.resolve(__dirname, 'locales');

// eslint-disable-next-line no-sync
const localeFiles = fs.readdirSync(localesDir)
  .filter((filename) => {
    return filename.match(/^[a-z]{2,3}_[A-Z]{2,3}\.js$/);
  });

const typeNames = Object.keys(signatures)
  .filter((typeName) => typeName !== 'unknown');

localeFiles.forEach((localeFile) => {
  const locale = require(path.join(localesDir, localeFile)).default;
  const localeName = localeFile.replace('.js', '');

  describe(`${localeName}`, () => {
    typeNames.forEach((typeName) => {
      const typeHelp = locale['shell-api'].classes[typeName];

      it(`has translations for ${typeName} type`, () => {
        if (!typeHelp) {
          throw new Error(`Missing ${localeName} help for type: ${typeName}`);
        }
      });

      if (!typeHelp) {
        return;
      }

      const attributeNames = Object.keys(signatures[typeName].attributes);
      attributeNames.forEach((attributeName) => {
        it(`has translations for ${typeName}.${attributeName} attribute`, () => {
          const attributeHelp = typeHelp.help.attributes && typeHelp.help.attributes[attributeName];
          if (
            !attributeHelp ||
                typeof attributeHelp !== 'object' ||
                !attributeHelp.description
          ) {
            throw new Error(`Missing en_US help for attribute: ${typeName}.${attributeName}`);
          }
        });
      });
    });
  });
});


