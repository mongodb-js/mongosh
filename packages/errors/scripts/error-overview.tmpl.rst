{{#each packages}}
{{package}}
{{packageHeadlineSeparator}}

{{#each errors}}
``{{code}}``
{{codeHeadlineSeparator}}

{{{documentation}}}

{{/each}}
{{/each}}