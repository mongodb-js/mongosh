# mongosh Error Codes Overview

{{#each packages}}

## {{package}}

| Error Code | Documentation |
| ---------- | ------------- |
{{#each errors}}
| `{{code}}` | {{{documentation}}} |
{{/each}}

{{/each}}