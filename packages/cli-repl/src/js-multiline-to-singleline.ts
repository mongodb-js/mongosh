import * as babel from '@babel/core';

// Babel plugin that turns all single-line // comments into /* ... */ block comments
function lineCommentToBlockComment(): babel.PluginObj {
  const visitedComments = new Map<babel.types.Comment, babel.types.Comment>();

  function turnCommentIntoBlock(original: babel.types.Comment): babel.types.Comment {
    // Babel determines when to print a comment based on the comment's object
    // identity, since the same comment can appear both as a trailing comment of
    // one node and a leading commment of another, so we keep track of which
    // comments we have transformed already.
    const existing = visitedComments.get(original);
    if (existing) {
      return existing;
    }
    const replacement: babel.types.Comment = { ...original, type: 'CommentBlock' };
    visitedComments.set(original, replacement);
    return replacement;
  }

  function transformComments(path: babel.NodePath): void {
    const node = path.node;
    const keys = ['leadingComments', 'trailingComments', 'innerComments'] as const;
    for (const key of keys) {
      node[key] = node[key]?.map(turnCommentIntoBlock) ?? null;
    }
  }

  return {
    visitor: {
      Program(path) {
        transformComments(path);
        path.traverse({
          enter(path) {
            transformComments(path);
          }
        });
      }
    }
  };
}

export function makeMultilineJSIntoSingleLine(src: string): string {
  // We use babel without any actual transformation steps, and only for ASI
  // effects here, e.g. turning `return\n42` into `return;\n42;`
  // since without the added semicolons semantics would be different.
  // This unfortunately modifies the code in some other ways as well, e.g.
  // removing unnecessary parentheses, but correctness seems to be more
  // important here than keeping aesthetics intact.
  // It would be nice to have a dedicated package at some point that does
  // ASI and *only* ASI and leaves the source intact otherwise.
  let postASI: string;
  try {
    // eslint-disable-next-line no-sync
    postASI = babel.transformSync(src, {
      retainLines: true,
      compact: false,
      code: true,
      comments: true,
      plugins: [lineCommentToBlockComment]
    })?.code ?? src;
  } catch {
    // The src might still be invalid, e.g. because a recoverable error was not fixed
    // and is now an unrecoverable error. Best we can do is just keep the lines now.
    postASI = src;
  }

  const asSingleLine = postASI.split(/[\r\n]+/g)
    .map(line => line.trim())
    .join(' ')
    .trim();
  // Remove a trailing semicolon if the input also did not have one.
  return src.trim().endsWith(';') ? asSingleLine : asSingleLine.replace(/;$/, '');
}
