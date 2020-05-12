import { Evaluable, EvaluationResult, toEvaluationResult } from './evaluable';

export class CommandResult implements Evaluable {
  private _type: string;
  private _value: any;

  constructor(type, value) {
    this._type = type;
    this._value = value;
  }

  async [toEvaluationResult](): Promise<EvaluationResult> {
    return {
      type: this._type,
      value: this._value
    };
  }
}
