import i18n from '@mongosh/i18n';
import { ShellResult } from './decorators';

type HelpProperties = {
  help: string;
  docs?: string;
  attr?: HelpPropertiesAttr[];
};

type HelpPropertiesAttr = {
  name?: string;
  description: string;
};

type HelpOptions = {
  translate?(string): string;
};

const DEFAULT_TRANSLATE = i18n.translateApiHelp.bind(i18n);

export default class Help {
  private help: string;
  private docs: string;
  private attr: HelpPropertiesAttr[] = [];

  constructor(properties: HelpProperties, options: HelpOptions = { translate: DEFAULT_TRANSLATE }) {
    this.help = options.translate(properties.help);
    this.docs = options.translate(properties.docs);
    this.attr = (properties.attr || [])
      .map((attr) => ({
        name: attr.name,
        description: options.translate(attr.description),
      })).filter(
        attr => attr.description // at least the description should be there
      );
  }

  asPrintable(): HelpProperties {
    const { help, docs, attr } = this;
    return { help, docs, attr };
  }

  async asShellResult(): Promise<ShellResult> {
    return {
      type: 'Help',
      value: await this.asPrintable()
    };
  }
}
