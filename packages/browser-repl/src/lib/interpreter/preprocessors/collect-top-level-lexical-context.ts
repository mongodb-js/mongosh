/* eslint-disable @typescript-eslint/no-use-before-define */

type VariableDeclarationKind = 'let' | 'const' | 'class' | 'function' | 'var';

export interface LexicalContext {
  [variableName: string]: VariableDeclarationKind;
}

export function collectTopLevelLexicalContext(ast): LexicalContext {
  const context = {};

  for (const node of ast.program.body) {
    if (node.type === 'FunctionDeclaration') {
      collectFunctionDeclaration(node, context);
    }

    if (node.type === 'ClassDeclaration') {
      collectClassDeclaration(node, context);
    }

    if (node.type === 'VariableDeclaration') {
      collectVariableDeclaration(node, context);
    }
  }

  return context;
}

function collectFunctionDeclaration(functionDeclarationNode, context): void {
  collectIdentifier(functionDeclarationNode.id, context, 'function');
}
function collectClassDeclaration(classDeclarationNode, context): void {
  collectIdentifier(classDeclarationNode.id, context, 'class');
}

function collectVariableDeclaration(variableDeclarationNode, context): void {
  const kind = variableDeclarationNode.kind;

  for (const declarator of variableDeclarationNode.declarations) {
    collectVariableDeclarator(declarator, context, kind);
  }
}

function collectVariableDeclarator(variableDeclaration, context, kind): void {
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
