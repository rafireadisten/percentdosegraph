#!/bin/bash

# GitHub Repository Setup Helper
# This script guides you through creating a GitHub repo and pushing code

set -e

echo "================================"
echo "GitHub Repository Setup Helper"
echo "================================"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install git first."
    exit 1
fi

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI not found."
    echo "Install it for automated setup: https://cli.github.com"
    echo ""
    echo "For now, using manual setup instructions..."
    MANUAL_ONLY=true
else
    MANUAL_ONLY=false
fi

echo "Step 1: Check GitHub authentication"
if [ "$MANUAL_ONLY" = false ]; then
    if gh auth status &>/dev/null; then
        echo "✅ GitHub CLI authenticated"
        GITHUB_USER=$(gh api user -q .login)
        echo "✅ Logged in as: $GITHUB_USER"
        echo ""
    else
        echo "❌ GitHub CLI not authenticated"
        echo "Run: gh auth login"
        exit 1
    fi
else
    echo "⚠️  Manual setup required"
    echo "Visit: https://github.com/login"
    echo ""
fi

echo "Step 2: Repository information"
REPO_NAME="percentdosegraph"
REPO_DESC="A lightweight clinical dosing visualization tool for pharmacists and clinicians"

echo "Repository name: $REPO_NAME"
echo "Description: $REPO_DESC"
echo ""

if [ "$MANUAL_ONLY" = false ]; then
    echo "Step 3: Creating repository on GitHub..."
    
    # Check if repo already exists
    if gh repo view $GITHUB_USER/$REPO_NAME &>/dev/null 2>&1; then
        echo "⚠️  Repository already exists"
        read -p "Do you want to continue with existing repo? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        gh repo create $REPO_NAME --public --description "$REPO_DESC" --source=. --remote=origin --push
        echo "✅ Repository created and code pushed!"
    fi
    
    REPO_URL="https://github.com/$GITHUB_USER/$REPO_NAME.git"
else
    echo "Step 3: Manual repository creation"
    echo ""
    echo "Please follow these steps:"
    echo "1. Go to: https://github.com/new"
    echo "2. Enter Repository name: $REPO_NAME"
    echo "3. Enter Description: $REPO_DESC"
    echo "4. Select: Public"
    echo "5. Click 'Create repository'"
    echo ""
    read -p "What is your GitHub username? " GITHUB_USER
    REPO_URL="https://github.com/$GITHUB_USER/$REPO_NAME.git"
    echo "Your repository URL: $REPO_URL"
fi

echo ""
echo "================================"
echo "Step 4: Push code to GitHub"
echo "================================"
echo ""

cd "$(git rev-parse --show-toplevel)" || exit 1

# Check if remote exists
if git remote get-url origin &>/dev/null; then
    echo "Git remote 'origin' already exists:"
    git remote get-url origin
    read -p "Do you want to replace it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote remove origin
    else
        echo "Keeping existing remote"
        exit 0
    fi
fi

echo "Setting up remote: $REPO_URL"
git remote add origin "$REPO_URL"
git branch -M main
git push -u origin main

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "Your repository is now on GitHub:"
echo "📍 Web: https://github.com/$GITHUB_USER/percentdosegraph"
echo "📍 Git: $REPO_URL"
echo ""
echo "Next steps:"
echo "1. Go to GitHub Settings → Secrets and variables → Actions"
echo "2. Add these secrets:"
echo "   - JWT_SECRET (required for auth)"
echo "   - GOOGLE_CLIENT_ID (optional)"
echo "   - GOOGLE_CLIENT_SECRET (optional)"
echo ""
echo "3. Watch the Actions tab for automatic deployment:"
echo "   https://github.com/$GITHUB_USER/percentdosegraph/actions"
echo ""
echo "4. Your frontend will deploy to:"
echo "   https://$GITHUB_USER.github.io/percentdosegraph"
echo ""
