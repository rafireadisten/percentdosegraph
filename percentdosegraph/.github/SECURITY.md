# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in PercentDoseGraph, please **do not** open a public GitHub issue. Instead, please email security concerns to rafi@readisten.com with:

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested fix (if available)

We take security seriously and will respond promptly to validate and address any concerns.

## Security Considerations

This is a clinical application that handles medication dosing information. Users should:

1. **Data Protection**: Ensure patient data is handled according to HIPAA or relevant regulations
2. **Browser Security**: Use the latest version of your web browser
3. **Network**: Use HTTPS when deploying to production
4. **Database**: Secure your PostgreSQL installation and use strong credentials

## Dependencies

This project uses:
- Express.js - Backend framework
- Drizzle ORM - Database abstraction
- React - Frontend framework
- Recharts - Charting library

We monitor dependencies for vulnerabilities and keep them updated.

### Known Limitations

- This is a reference implementation and not FDA-approved
- The bundled drug library is a starter reference, not a validated clinical formulary
- Always verify medication dosing against authoritative clinical sources
