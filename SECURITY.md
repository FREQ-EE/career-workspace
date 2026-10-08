# Security and privacy

This starter is empty; it is designed for one person per deployment. Keep personal copies and records private. Repository ownership and commit authorship are GitHub metadata; sanitising file contents does not make a GitHub account anonymous.

The default Node commands bind to 127.0.0.1. `APP_RUNTIME=local` rejects non-loopback hostnames when no password is configured. Do not use host-header checks as an internet-facing authentication system. For ordinary remote Node hosting set `APP_RUNTIME=server`, configure a strong `APP_PASSWORD` in runtime secrets, and serve through HTTPS. The supplied request proxy enforces HTTP Basic authentication on pages and APIs. Basic authentication is unsuitable over unencrypted public HTTP.

For Sites use `APP_RUNTIME=sites` only on a newly provisioned **owner-private** Site. Sites dispatch then provides the access boundary for both pages and APIs. Do not broaden that Site's audience: a shared token and data store do not provide tenant isolation. A public or multi-user deployment requires a different authorisation and storage design.

Never expose `GITHUB_TOKEN` in a browser, build-time public environment variable, source file or log. `.env.local` is ignored. Fine-grained credentials should be scoped to one repository. Revoke a leaked credential; deleting the latest file does not remove a secret from Git history.

Mutations require same-origin JSON requests. Record paths are allowlisted, schema validation rejects unsupported shapes, revisions prevent silent whole-file replacement, and field-level updates preserve unrelated data. External reference links and recipe content remain untrusted data.

Offline reading and pending kitchen drafts can retain personal content in the browser profile. Turn off offline reading and clear site data when handing a device to someone else. Local backups and exported CVs/records need the same care as the private repository.

Report a vulnerability privately to the repository maintainer through a GitHub private security advisory if available. Do not include real credentials or personal records in a public issue. No contact address is embedded in this starter.
