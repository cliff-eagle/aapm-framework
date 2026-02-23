# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | ✅ Current release |

## Reporting a Vulnerability

If you discover a security vulnerability in the AAPM Framework, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

### How to Report

1. Email: [INSERT SECURITY CONTACT EMAIL]
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if any)

### Response Timeline

| Action | Timeline |
|--------|----------|
| Acknowledgment of report | Within 48 hours |
| Initial assessment | Within 5 business days |
| Resolution or mitigation plan | Within 15 business days |
| Public disclosure (coordinated) | After fix is released |

### Scope

The following are in scope for security reports:

- **Data exposure**: Any mechanism that could expose learner PII, voice recordings, or behavioral data
- **Authentication/authorization bypass**: Any bypass of access controls in deployed implementations
- **Injection vulnerabilities**: Prompt injection, SQL injection, or XSS in framework components
- **Privacy violations**: Data handling that violates stated privacy commitments (see `docs/security-privacy.md`)
- **Dependency vulnerabilities**: Known CVEs in framework dependencies

### Out of Scope

- Vulnerabilities in third-party AI model providers (OpenAI, Anthropic, etc.)
- Issues requiring physical access to deployment infrastructure
- Social engineering attacks

### Recognition

We will credit security researchers who responsibly disclose vulnerabilities (with their permission) in our CHANGELOG and security advisories.
