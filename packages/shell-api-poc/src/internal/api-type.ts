import {
  Help,
  HelpProperties
} from './help';

import {
  AttributesMetadata,
  AttributeSpec,
  AttributeType,
  makeAttributeSpec,
  addAttributeSpec
} from './attributes';

import {
  ANY_SERVER_VERSION,
  ANY_TOPOLOGY
} from './constants';

const attributesSymbol = Symbol('attributes');

function i18nAttributeKey(
  typeName: string,
  attribute: AttributeSpec,
  suffix: string
): string {
  const attributeName = attribute.static ? `static-${attribute.name}` : attribute.name;
  return `shell-api.classes.${typeName}.help.attributes.${attributeName}.${suffix}`;
}

function i18nTypeKey(typeName, suffix: string): string {
  return `shell-api.classes.${typeName}.help.${suffix}`;
}

/**
 * Base class for all api types, it is mainly used to enforce
 * the interface of api types so that decorators would
 * find the shape of class that is expected for them to work.
 */
export class ApiType {
  /**
   * Returns the attributes metadata for this type
   */
  static get attributes(): AttributesMetadata {
    const subclass = this as any;
    if (!subclass[attributesSymbol]) {
      const help: AttributeSpec = {
        name: 'help',
        serverVersions: ANY_SERVER_VERSION,
        topologies: ANY_TOPOLOGY,
        type: 'function',
        returnType: 'unknown',
        returnsPromise: false,
        static: false,
        returnsClass: false
      };

      Object.defineProperty(
        subclass,
        attributesSymbol,
        {
          value: {
            help
          },
          enumerable: false,
          writable: false
        }
      );
    }

    return subclass[attributesSymbol];
  }

  /**
   * Returns the type name
   */
  static get type(): string {
    return this.name;
  }

  /**
   * Returns help for the type or, if the attribute parameter is passed,
   * for an attribute of the type.
   *
   * If an attribute name is passed and the same attribute is present both as
   * static and instance, the instance help will get the precedence.
   *
   * @param {string} [attribute] - the optional attribute for which get help for.
   */
  help(attributeName?: string): Help {
    const subclass = this.constructor as typeof ApiType;

    if (this[attributeName] && this[attributeName].help) {
      return this[attributeName].help();
    }

    if (subclass[attributeName] && subclass[attributeName].help) {
      return subclass[attributeName].help();
    }

    const attributeSpecs = Object.values(subclass.attributes);

    const helpAttributes = attributeSpecs.map((attributeSpec) => ({
      name: attributeSpec.name,
      description: i18nAttributeKey(subclass.type, attributeSpec, 'description')
    }));

    const helpProperties: HelpProperties = {
      help: i18nTypeKey(subclass.type, 'description'),
      docs: i18nTypeKey(subclass.type, 'link'),
      attr: helpAttributes
    };

    return new Help(helpProperties);
  }
}

/**
 * @private
 *
 * Common code for apiProperty and apiMethod decorators.
 *
 * @param attributeType
 * @param options
 */
function apiAttributeDecorator(
  attributeType: AttributeType,
  options: Partial<AttributeSpec>) {
  return function(
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ): any {
    const isStatic = typeof target === 'function';
    const constructor = isStatic ? target : target.constructor;

    const attributeSpec = makeAttributeSpec({
      ...options,
      name: propertyName,
      type: attributeType,
      static: isStatic
    });

    addAttributeSpec(constructor, attributeSpec);

    if (attributeType === 'function') {
      descriptor.value.help = (): Help => {
        return new Help({
          help: i18nAttributeKey(target.type, attributeSpec, 'description'),
          docs: i18nAttributeKey(target.type, attributeSpec, 'link'),
        });
      };
    }
  };
}

export type ApiPropertyOptions = Partial<Omit<AttributeSpec, 'type' | 'name' | 'static'>>;

/**
 * Mark a property as api property adding attributes
 * to the class metadata
 *
 * @param {ApiPropertyOptions} options
 */
export function apiProperty(options: ApiPropertyOptions = {}): any {
  return apiAttributeDecorator('property', options);
}

export type ApiMethodOptions = Partial<Omit<AttributeSpec, 'type' | 'name' | 'static'>>;

/**
 * Mark a method as api method adding attributes
 * to the class metadata
 *
 * @param {ApiMethodOptions} options
 */
export function apiMethod(options: ApiMethodOptions = {}): any {
  return apiAttributeDecorator('function', options);
}
