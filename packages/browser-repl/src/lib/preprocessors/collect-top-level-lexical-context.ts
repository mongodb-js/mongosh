/* eslint-disable @typescript-eslint/no-use-before-define */

type VariableDeclarationKind = 'let' | 'const';

export interface LexicalContext {
  [variableName: string]: VariableDeclarationKind;
}

export function collectTopLevelLexicalContext(ast): LexicalContext {
  const context = {};

  ast.program.body
    .filter((node) => node.type === 'VariableDeclaration')
    .forEach((node) => {
      const kind = node.kind;

      if (kind !== 'let' && kind !== 'const') {
        return;
      }

      for (const variableDeclaration of node.declarations) {
        collectVariableDeclaration(variableDeclaration, context, kind);
      }
    });

  return context;
}

function collectVariableDeclaration(variableDeclaration, context, kind): void {
  const child = variableDeclaration.id;

  if (child.type === 'Identifier') {
    collectIdentifier(child, context, kind);
  }

  if (child.type === 'ObjectPattern') {
    collectObjectPattern(child, context, kind);
  }

  if (child.type === 'ArrayPattern') {
    collectArrayPattern(child, context, kind);
  }
}

function collectIdentifier(identifier, context, kind): void {
  context[identifier.name] = kind;
}

function collectObjectPattern(objectPatternNode, context, variableDeclarationKind): void {
  for (const property of objectPatternNode.properties) {
    if (property.type === 'RestElement') {
      collectRestElement(property, context, variableDeclarationKind);
    }

    if (property.type === 'ObjectProperty') {
      collectObjectProperty(property, context, variableDeclarationKind);
    }
  }
}

function collectObjectProperty(objectPropertyNode, context, variableDeclarationKind): void {
  if (objectPropertyNode.value.type === 'Identifier') {
    collectIdentifier(objectPropertyNode.value, context, variableDeclarationKind);
  }

  if (objectPropertyNode.value.type === 'ObjectPattern') {
    collectObjectPattern(objectPropertyNode.value, context, variableDeclarationKind);
  }

  if (objectPropertyNode.value.type === 'ArrayPattern') {
    collectArrayPattern(objectPropertyNode.value, context, variableDeclarationKind);
  }

  if (objectPropertyNode.value.type === 'AssignmentPattern') {
    collectAssignmentPattern(objectPropertyNode.value, context, variableDeclarationKind);
  }
}

function collectAssignmentPattern(assignmentPatternNode, context, variableDeclarationKind): void {
  if (assignmentPatternNode.left.type === 'Identifier') {
    collectIdentifier(assignmentPatternNode.left, context, variableDeclarationKind);
  }

  if (assignmentPatternNode.left.type === 'ObjectPattern') {
    collectObjectPattern(assignmentPatternNode.left, context, variableDeclarationKind);
  }
}

function collectRestElement(restElementNode, context, variableDeclarationKind): void {
  if (restElementNode.argument.type === 'Identifier') {
    collectIdentifier(restElementNode.argument, context, variableDeclarationKind);
  }
}

function collectArrayPattern(arrayPatternNode, context, variableDeclarationKind): void {
  for (const element of arrayPatternNode.elements) {
    if (!element) {
      continue;
    }

    if (element.type === 'RestElement') {
      collectRestElement(element, context, variableDeclarationKind);
    }

    if (element.type === 'Identifier') {
      collectIdentifier(element, context, variableDeclarationKind);
    }

    if (element.type === 'ObjectPattern') {
      collectObjectPattern(element, context, variableDeclarationKind);
    }

    if (element.type === 'AssignmentPattern') {
      collectAssignmentPattern(element, context, variableDeclarationKind);
    }
  }
}
