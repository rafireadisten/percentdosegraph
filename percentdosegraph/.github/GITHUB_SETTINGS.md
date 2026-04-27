# GitHub Repository Settings

This repository is configured with the following access model:

## Visibility
- **Repository**: Private (restricted read access)
- **License**: MIT (open source)

## Access & Contributions
- **Push access**: Invited collaborators only
- **Pull requests**: Approved collaborators only
- **Issues & Discussions**: Collaborators only

## Recommended GitHub Settings

To set up this repository with the intended access model, configure the following in GitHub repository settings:

### 1. Repository Settings → General
- Repository type: **Private** ✓
- **Description**: A lightweight clinical dosing visualization tool for pharmacists and clinicians

### 2. Repository Settings → Access
- Default branch: `main`
- Manage access → Invite specific collaborators as needed
- Branch protection rules:
  - Require pull request reviews before merging
  - Require status checks to pass before merging
  - Require branches to be up to date

### 3. Repository Settings → Discussions
- Enable Discussions: **Off** (or restricted to collaborators)
- Enable Issues: **On** (collaborators only)

### 4. Collaborators & Teams
- Add team members with appropriate permissions:
  - **Maintain**: Can merge PRs, manage settings
  - **Write**: Can push to branches, open PRs  
  - **Triage**: Can manage issues without write access
  - **Read**: Can view only (reference/audit access)

## Open Source License

Despite being a private repository, this project is licensed under MIT. This allows:
- **Collaborators**: Full rights to use, modify, and distribute
- **Future**: If made public, maintains open source licensing
- **Compliance**: Meets open source software principles

## Why Private + MIT?

This approach is suitable for:
- **Clinical tools** requiring controlled access and review
- **Internal tools** that will eventually be distributed to specific organizations
- **Research** that needs vetting before wider release
- **Projects** transitioning from private to open source

---

**Note**: To change from private to public later, simply update repository visibility in GitHub settings. The MIT license remains valid.
