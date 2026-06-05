# Upload this folder to GitHub

Delete every existing file in the GitHub repository first.
Then upload only these items:

- api/
- public/
- README.md
- UPLOAD_STEPS.md

After Vercel deploys, open:

- /api/prices?symbol=AAPL first. This must return JSON price rows.
- /audit-runner.html second. Run the 1000-symbol audit from the deployed website, not from file://.

For stable production pricing, add ALPHA_VANTAGE_API_KEY in Vercel Project Settings > Environment Variables.
Do not upload server.js, package.json, app.js at repository root, styles.css at repository root, or index.html at repository root.
