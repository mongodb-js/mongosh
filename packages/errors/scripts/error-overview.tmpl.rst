============================
mongosh Error Codes Overview
============================

To quickly find an error by its code, search for the code in this overview.

-----------------
Table of Contents
-----------------

{{#each packages}}
* `{{package}} <#{{package}}>`_
{{/each}}

{{#each packages}}
{{packageHeadlineSeparator}}
{{package}}
{{packageHeadlineSeparator}}

{{#each errors}}
{{codeHeadlineSeparator}}
``{{code}}``
{{codeHeadlineSeparator}}

{{{documentation}}}

{{/each}}
{{/each}}