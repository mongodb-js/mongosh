# https://rpm-packaging-guide.github.io/#what-is-a-spec-file
%define _binary_payload w2.xzdio
# https://jira.mongodb.org/browse/MONGOSH-1159
%define _build_id_links none
# Work around https://salsa.debian.org/debian/debhelper/-/commit/8f29a0726bdebcb01b6fd768fde8016fcd5dc3f4
# (only relevant when building from Debian/Ubuntu)
%undefine _libexecdir
%define _libexecdir %{_exec_prefix}/libexec

Name: {{rpmName}}
Provides: {{provides}}
Version: {{version}}
Release: 1%{?dist}
Group: Development/Tools
Summary: {{description}}
License: {{licenseRpm}}
URL: {{homepage}}

%description
{{description}}

%install
{{installscriptRpm}}

%files
{{filelistRpm}}
