import i18n from '@mongosh/i18n';

import { Evaluable, toEvaluationResult, EvaluationResult } from './evaluable';

export type HelpProperties = {
  help: string;
  docs?: string;
  attr?: HelpPropertiesAttr[];
};

type HelpPropertiesAttr = {
  name: string;
  description: string;
};

type HelpOptions = {
  translate?(string): string;
};

const DEFAULT_TRANSLATE = i18n.translateApiHelp.bind(i18n);

export class Help implements Evaluable {
  private _properties: HelpProperties;
  private _translate?(string): string;

  constructor(
    properties: HelpProperties,
    options: HelpOptions = { translate: DEFAULT_TRANSLATE }
  ) {
    this._properties = properties;
    this._translate = options.translate;
  }

  async [toEvaluationResult](): Promise<EvaluationResult> {
    return {
      type: 'Help',
      value: {
        help: this._translate(this._properties.help),
        docs: this._translate(this._properties.docs),
        attr: (this._properties.attr || []).map((attr) => ({
          name: attr.name,
          description: this._translate(attr.description)
        }))
      }
    };
  }
}
