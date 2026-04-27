# Development Roles & Responsibilities

This private repository uses role-based access control. Here are the typical roles and their responsibilities:

## Maintainer
- Reviews and merges pull requests
- Manages milestones and releases
- Oversees breaking changes and version bumps
- Administers GitHub repository settings

## Collaborators (Writers)
- Can push to branches
- Can open and review pull requests
- Can manage issues
- Should follow contribution guidelines

## Reviewers (Triage)
- Review pull requests and provide feedback
- Can label and manage issues
- Cannot merge or push directly
- Help maintain code quality

## Read-Only Access
- Can view code and documentation
- Useful for auditing, compliance, or external stakeholders
- Cannot make changes

## Code Review Process

1. **Create feature branch**: `feature/your-feature` or `bugfix/issue-number`
2. **Push to branch**: Direct commits to `main` are prevented
3. **Open Pull Request**: 
   - Link related issues
   - Describe changes clearly
   - Request review from maintainers
4. **Address feedback**: Make requested changes
5. **Approval & Merge**:
   - At least 1 approval required
   - All CI checks must pass
   - Branch must be up to date with main

## Clinical Considerations

Given the clinical nature of this tool:
- **Double-check dosing logic**: Verify against clinical guidelines
- **Test with realistic data**: Use real-world scenarios
- **Document assumptions**: Clearly state any simplifications
- **Add comments**: Explain clinical decisions in code

## Release Process

Before releasing a new version:
1. Update CHANGELOG.md
2. Update version in package.json
3. Tag release: `git tag v1.0.0`
4. Push tags: `git push origin --tags`
