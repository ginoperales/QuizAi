<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Quiz AI

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1ud61jfvUifjWZHpAeU0QtiMWNzM3vE4p

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in `.env.local` to your Gemini API key
3. Run the app:
   `npm run dev`

## Security notes

- Never put provider secrets such as DeepSeek keys in frontend code or `VITE_*` variables. Those values are included in the browser bundle. AI provider calls should be moved to a trusted server before a public production deployment.
- The current Gemini integration is client-side for compatibility with the original AI Studio project. Restrict its key in Google Cloud and migrate it to a server-side proxy for production.
- New accounts are always created as `student`. Create the first administrator from a trusted environment (Firebase Console/Admin SDK) by changing the user's `role` to `admin`; the browser must never decide who becomes administrator.
- Deploy Firestore rules together with application changes: `firebase deploy --only firestore:rules,hosting`.
- Run `npm run check` and `npm audit` before deployment.

If the historical DeepSeek key was ever deployed or committed, revoke and rotate it at the provider. Removing it from the latest source does not invalidate copies in Git history or old bundles.
