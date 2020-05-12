import { ANY_SERVER_VERSION, ANY_TOPOLOGY } from './constants';
import { ApiType } from './api-type';

/**
 * A dictionary that holds attribute metadata for a type
 */
export interface AttributesMetadata {
  [attributeName: string]: AttributeSpec;
}

/**
 * String representing types of attributes
 */
export type AttributeType = 'function' | 'property';

/**
 * The specification for a type attribute.
 *
 * A type attribute is either a method of a property
 * of such type that is exposed as user facing api in the shell.
 *
 * For example `find` is a `function` attribute for the `Collection` type.
 */
export type AttributeSpec = {
  /**
   * The kind of attribute, either `function` for methods or `property`
   * for properties.
   */
  type: AttributeType;

  /**
   * The name of the method or property
   */
  name: string;

  /**
   * For which server version the attribute is supported
   */
  serverVersions: string[];

  /**
   * For which kind of topologies attribute is supported (ie `rs` is not
   * supported for standalone deployments).
   */
  topologies: number[];

  /**
   * Specifies if this is a static attribute defined on the class rather than
   * on the prototype of the type.
   *
   * ie. would be `true` for `Cursor.shellBatchSize` and `false` for `coll.find()`.
   */
  static: boolean;

  /**
   * The name of shell apy type returned either by the method or, for properties,
   * by the getter of the property.
   *
   * If the returned type is not a shell api type it should be set to
   * the string `'unknown'`.
   */
  returnType: string;

  /**
   * Specifies if a type class is returned either by the method or, for properties,
   * by the getter of the property.
   *
   * This would signal for example the autocompleter to lookup further suggestions
   * among static attributes.
   */
  returnsClass: boolean;

  /**
   * Specifies if a Promise is returned either by the method or, for properties,
   * by the getter of the property.
   */
  returnsPromise: boolean;
};

type OptionalExceptFor<T, TRequired extends keyof T> =
  Partial<T> & Pick<T, TRequired>;

type ApiAttributeOptions = OptionalExceptFor<AttributeSpec, 'name' | 'type'>;

export function makeAttributeSpec(
  spec: ApiAttributeOptions
): AttributeSpec {
  return {
    name: spec.name,
    type: spec.type,
    static: spec.static || false,
    serverVersions: spec.serverVersions || ANY_SERVER_VERSION,
    topologies: spec.topologies || ANY_TOPOLOGY,
    returnType: spec.returnType || 'unknown',
    returnsClass: spec.returnsClass || false,
    returnsPromise: spec.returnsPromise || false
  };
}

export function addAttributeSpec(
  target: typeof ApiType,
  spec: AttributeSpec
): void {
  target.attributes[spec.name] = spec;
}
