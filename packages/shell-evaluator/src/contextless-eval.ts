// This may seem like a pointless function, but eval() in JS
// is tricky. If we were to call eval() from inside a function
// in another file directly, the variables in that function would
// affect and be available to the eval'ed source, which can
// generally cause some weirdness in evaluating the inner code,
// but also in particular establishes a garbage collection link
// between the eval'ed source and those variables.
// Putting this function in a separate file ensures that no
// unintentional references to other variables can be captured.
export function contextlessEval(code: string): void {
  return eval(code);
}
