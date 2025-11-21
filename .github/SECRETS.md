# GitHub Secrets Configuration

## Required Secrets

Configure these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

### Authentication Secrets

- `NEXTAUTH_SECRET` - NextAuth.js secret for session encryption (generate with `openssl rand -base64 32`)
- `GITHUB_CLIENT_ID` - GitHub OAuth App Client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth App Client Secret
- `GOOGLE_CLIENT_ID` - Google OAuth Client ID (optional)
- `GOOGLE_CLIENT_SECRET` - Google OAuth Client Secret (optional)

### API Keys

- `ANTHROPIC_API_KEY` - Anthropic Claude API key for AI features
- `ENCRYPTION_KEY` - 64-character hex key for token encryption (generate with `openssl rand -hex 32`)

## Security Notes

### Immediate Action Required

⚠️ **CRITICAL**: If you've used this repository before this security fix, you must:

1. **Rotate all OAuth credentials** - The old hardcoded values were exposed in git history
2. **Generate new encryption key** - Replace any existing `ENCRYPTION_KEY`
3. **Update NextAuth secret** - Generate a fresh `NEXTAUTH_SECRET`

### Generation Commands

```bash
# Generate NextAuth secret
openssl rand -base64 32

# Generate encryption key
openssl rand -hex 32
```

### OAuth App Setup

#### GitHub OAuth App

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create new OAuth App with:
   - Homepage URL: `https://your-domain.com`
   - Authorization callback URL: `https://your-domain.com/api/auth/callback/github`
3. Copy Client ID and Client Secret to GitHub Secrets

#### Google OAuth (Optional)

1. Go to Google Cloud Console > APIs & Credentials
2. Create OAuth 2.0 Client ID with:
   - Authorized origins: `https://your-domain.com`
   - Authorized redirect URIs: `https://your-domain.com/api/auth/callback/google`
3. Copy Client ID and Client Secret to GitHub Secrets

## Testing

The CI workflow will use safe fallback values if secrets are not configured, allowing tests to run in forks and development environments without exposing production credentials.

## Verification

After configuring secrets, verify the setup by:

1. Checking that CI tests pass without hardcoded values
2. Testing OAuth login in your deployed application
3. Confirming no secrets appear in workflow logs
