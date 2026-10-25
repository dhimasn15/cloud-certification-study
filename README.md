# Cloud Certification Study

A minimal Next.js study dashboard for reviewing Google Cloud certification exam results.

## How It Works

1. Run the local Playwright scraper if a Moodle review needs to be exported.
2. Open the dashboard and choose **Add exam review**.
3. Enter a label and upload the generated CSV.
4. Review questions, answers, correct/incorrect status, and local explanations in the browser.

The web app does not use a database or an AI API. CSV files are parsed client-side, which makes the app suitable for a static/serverless deployment on Vercel.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
```

## Local CSV Scraper

The scraper requires a local Brave installation and an interactive login:

```bash
node opencode-brave-scrape/open.js "REVIEW_URL" "result.csv"
```

The scraper is intentionally not executed by Vercel. Upload its CSV output through the dashboard instead.
