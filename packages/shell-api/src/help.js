import i18n from 'mongosh-i18n';

// TODO: This probably should be in i18n itself
function safeTranslateApiHelp(help) {
  try {
    return i18n.translateApiHelp(help);
  } catch (e) {
    return help || '';
  }
}

export class Help {
  constructor({help, docs, attr = []} = {}) {
    this.help = safeTranslateApiHelp(help);
    this.docs = docs;
    this.attr = attr.map(Object.entries)
      .map(entries => entries[0])
      .map(([k, v]) => ({[k]: safeTranslateApiHelp(v)}));
  }

  shellApiType() {
    return 'Help';
  }

  toReplString() {
    return this.help;
  }
}
