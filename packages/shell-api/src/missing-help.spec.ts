import { signatures } from './index';
import { en_US, type Catalog } from '@mongosh/i18n/locales';

const IGNORED_TYPES = [
  'unknown',
  'ExplainableCursor', // inherits cursor
  'CursorIterationResult', // internal / presentation only
  'DeprecatedClass', // internal
];

const IGNORED_ATTRIBUTES = [
  'Mongo.show', // documented as top level command
  'Mongo.use', // documented as top level command,
  'ChangeStreamCursor.map',
  'ChangeStreamCursor.forEach',
  'ChangeStreamCursor.toArray',
  'ChangeStreamCursor.objsLeftInBatch',
  'ChangeStreamCursor.pretty',
];

const typeNames = Object.keys(signatures).filter(
  (typeName) => !IGNORED_TYPES.includes(typeName)
);

for (const [localeName, locale] of [
  ['en_US', en_US],
  // Skip German for now
  //   ['de_DE', de_DE],
] as [string, Catalog][]) {
  describe(`i18n with ${localeName} locale`, function () {
    for (const typeName of typeNames) {
      const typeHelp = (locale['shell-api'] as any).classes[typeName];

      it(`has translations for ${typeName} type`, function () {
        if (!typeHelp) {
          throw new Error(`Missing ${localeName} help for type: ${typeName}`);
        }
      });

      if (!typeHelp) {
        return;
      }

      const attributeNames = Object.keys(
        signatures[typeName].attributes as object
      ).filter(
        (attributeName) =>
          !IGNORED_ATTRIBUTES.includes(`${typeName}.${attributeName}`)
      );

      for (const attributeName of attributeNames) {
        it(`has translations for ${typeName}.${attributeName} attribute`, function () {
          const attributeHelp =
            typeHelp.help.attributes && typeHelp.help.attributes[attributeName];
          if (
            !attributeHelp ||
            typeof attributeHelp !== 'object' ||
            !attributeHelp.description
          ) {
            throw new Error(
              `Missing en_US help for attribute: ${typeName}.${attributeName}`
            );
          }
        });
      }
    }
  });
}
