import {
  EvaluationResult as InterpreterEvaluationResult
} from '../interpreter/interpreter';

import {
  EvaluationResult as RuntimeEvaluationResult
} from '../../components/runtime';

function getShellTypeFromValue(value: any): string {
  if (!value || typeof value.shellApiType !== 'function') {
    return;
  }

  return value.shellApiType();
}

export function addShellTypeToResult(result: Readonly<InterpreterEvaluationResult>): RuntimeEvaluationResult {
  const runtimeResult = {
    value: result.value,
    apiType: getShellTypeFromValue(result.value)
  };

  return runtimeResult;
}

