#!/bin/bash
set -e
set -x

pnpm run create-static-analysis-report -- --first-party-deps-list-files="${FIRST_PARTY_DEPENDENCY_FILENAMES}"
(cd .sbom && tar czvf ../static-analysis-report.tgz codeql.md codeql.sarif.json)
