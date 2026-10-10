# Security policy

## Supported versions

Before the first published release, security fixes target `main`. After releases begin, the latest stable release is supported; fixes for older versions are not guaranteed.

## Report a vulnerability privately

Use [GitHub private vulnerability reporting](https://github.com/AlexisRellon/TestWeave/security/advisories/new). Include affected versions, reproduction steps, impact, and a proposed fix if available. Remove real credentials and customer data. Do not open a public issue for an undisclosed vulnerability.

The maintainer will review the report, coordinate a fix, and agree on disclosure where possible. This is a volunteer project and response times are not guaranteed.

TestWeave executes locally with your user's permissions and can write configured Git hooks and IDE files. Only initialize trusted workspaces. LLM requests are made only when explicitly requested through the adapter API; provide only context that you are authorized to send to the chosen provider.
