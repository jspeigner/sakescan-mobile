# Auth Callback Page for sakescan.com

Add this page to your sakescan.com site so password reset (and other auth flows) work when users open links in a browser.

## 1. Create the page

Create a page at **`https://sakescan.com/auth/callback`** (or `/auth/callback.html` depending on your setup).

### HTML (standalone page)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SakeScan - Complete Setup</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 480px;
      margin: 0 auto;
      padding: 40px 24px;
      text-align: center;
    }
    h1 { color: #1a1a1a; font-size: 24px; }
    p { color: #6B6B6B; line-height: 1.6; }
    a {
      display: inline-block;
      margin-top: 24px;
      padding: 14px 28px;
      background: #C9A227;
      color: white;
      text-decoration: none;
      font-weight: 600;
      border-radius: 12px;
    }
    a:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <h1>Almost there</h1>
  <p id="message">Opening SakeScan...</p>
  <a id="openApp" href="#" style="display: none;">Open SakeScan App</a>
  <script>
    (function() {
      const hash = window.location.hash.slice(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      if (accessToken && refreshToken) {
        const appUrl = 'vibecode://reset-password#' + hash;
        const openAppLink = document.getElementById('openApp');
        openAppLink.href = appUrl;

        if (isMobile) {
          window.location.href = appUrl;
        } else {
          document.getElementById('message').textContent =
            'Open the SakeScan app on your phone to complete your password reset. Or click the button below if the app is on this device.';
          openAppLink.style.display = 'inline-block';
          openAppLink.textContent = 'Open SakeScan App';
        }
      } else {
        document.getElementById('message').textContent =
          'This link has expired or was already used. Please request a new password reset from the app.';
      }
    })();
  </script>
</body>
</html>
```

## 2. Supabase configuration

In **Authentication → URL Configuration**:

| Setting | Value |
|---------|-------|
| **Site URL** | `https://sakescan.com` |
| **Redirect URLs** | Add these: |
| | `https://sakescan.com/auth/callback` |
| | `vibecode://**` |
| | `vibecode://reset-password` |
| | `vibecode://auth/callback` |

## 3. Update the app's redirectTo

Change the password reset (and any other auth) to use the web callback first, so it works on both mobile and desktop:

In `src/lib/auth-context.tsx`, update `resetPassword`:

```ts
const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://sakescan.com/auth/callback',
  });
  if (error) throw error;
};
```

The web page will then redirect to `vibecode://` on mobile, or show instructions on desktop.

## Flow

1. User taps "Forgot password" in app → Supabase sends email
2. User taps link in email → Opens in browser
3. Browser goes to Supabase → Supabase redirects to `https://sakescan.com/auth/callback#access_token=...&refresh_token=...&type=recovery`
4. **On mobile:** Page immediately redirects to `vibecode://reset-password#...` → App opens
5. **On desktop:** Page shows "Open app on your phone" with a fallback button

## Hosting

- If sakescan.com is static (Vercel, Netlify, etc.): Add `auth/callback.html` or configure routing so `/auth/callback` serves this page
- If it's a CMS (WordPress, etc.): Create a new page with a custom HTML block containing the script
- If it's a SPA: Add a route for `/auth/callback` that renders this logic
