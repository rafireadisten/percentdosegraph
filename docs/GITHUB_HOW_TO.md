# Easy GitHub Setup Guide

## Super Quick Steps

### 1️⃣ **Automated Setup (Recommended)**

If you have the GitHub CLI installed:
```bash
cd /Users/readisten/Documents/percentdosegraph
./setup-github.sh
```

This will:
- Check your GitHub login
- Create the repository automatically
- Push all your code
- Show you the GitHub URL

### 2️⃣ **Manual Setup (No Tools Needed)**

**Step A: Create GitHub Repo**
1. Go to: https://github.com/new
2. Enter:
   - Repository name: `percentdosegraph`
   - Description: `A lightweight clinical dosing visualization tool`
3. Choose: **Public**
4. Click: **Create repository**

**Step B: Push Your Code**

GitHub will show you commands. Run these instead:

```bash
cd /Users/readisten/Documents/percentdosegraph
git remote add origin https://github.com/YOUR_USERNAME/percentdosegraph.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub account name.

### 3️⃣ **The URL You'll Get**

After pushing, your repo URL will be:
```
https://github.com/YOUR_USERNAME/percentdosegraph.git
```

Example:
```
https://github.com/john-doe/percentdosegraph.git
```

## Don't Have GitHub?

1. Go to: https://github.com/signup
2. Choose username (this becomes YOUR_USERNAME)
3. Verify email
4. Then follow the setup above

## Common Errors

**"fatal: not a git repository"**
```bash
cd /Users/readisten/Documents/percentdosegraph
```

**"permission denied: ./setup-github.sh"**
```bash
chmod +x setup-github.sh
./setup-github.sh
```

**"remote origin already exists"**
```bash
git remote remove origin
# Then run setup again
```

---

**That's it!** Your code is now on GitHub and ready for multi-machine development.
