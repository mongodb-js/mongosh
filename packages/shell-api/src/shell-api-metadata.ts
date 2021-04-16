import type { JSDocTagInfo, SymbolDisplayPart } from 'typescript';
import type { JSONSchemaType } from 'ajv';
import ShellApiMetadata from './metadata.json';

type CommonMetadata = {
  label: string;
  deprecated: boolean;
  description: SymbolDisplayPart[];
  jsDocTags: JSDocTagInfo[];
};

export type ClassMetadata = CommonMetadata & {
  kind: 'Class';
  members: Record<string, MemberMetadata>;
};

export type MemberMetadata = PropertyMetadata | MethodMetadata;

export type PropertyMetadata = CommonMetadata & {
  kind: 'Property';
};

export type MethodMetadata = CommonMetadata & {
  kind: 'Method';
  params: ParameterMetadata[];
};

export type ParameterMetadata<T = unknown> = {
  label: string;
  kind: 'Parameter';
  schema: JSONSchemaType<T>;
  printableType: string;
  optional: boolean;
};

export function getMetadataForClass(className: string): ClassMetadata | null {
  return (ShellApiMetadata as any)[className] ?? null;
}

export function getMetadataForMember(
  className: string,
  memberName: string
): MemberMetadata | null {
  return (ShellApiMetadata as any)[className]?.members?.[memberName] ?? null;
}
