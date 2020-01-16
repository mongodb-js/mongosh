type EvaluationResult = object;

export interface Interpreter {
  evaluate(code: string): Promise<EvaluationResult>;
}
