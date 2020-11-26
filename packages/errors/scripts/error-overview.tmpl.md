# mongosh Error Codes Overview

To quickly find an error by it's code just search for the code in this overview.

## Table of Contents
{{#each packages}}
* [{{package}}](#{{package}})
{{/each}}

{{#each packages}}

## {{package}}
{{#each errors}}
#### `{{code}}`
{{{documentation}}}
{{/each}}

{{/each}}