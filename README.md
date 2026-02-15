# InspectorChure

AI-powered food safety inspection using computer vision to analyze kitchen hygiene compliance.

## Features

- 📹 Browser-based video recording
- 🔍 Computer vision detection (Google Cloud Vision API)
- 📊 Weighted hygiene scoring across 6 categories
- ⚡ Parallel processing for fast analysis
- 💡 Contextual feedback for detected issues
- 🏆 Churred Safety Badge for scores 80% and above
- 👤 User authentication and vendor profiles
- 💾 Database persistence with Supabase
- 📤 Share and download reports

## Setup

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Configure Google Cloud Vision API

1. Enable Vision API: https://console.cloud.google.com/apis/library/vision.googleapis.com
2. Enable billing (first 1,000 requests/month are free)
3. Create API Key: https://console.cloud.google.com/apis/credentials
4. Restrict key to Cloud Vision API only

### 3. Configure Supabase

1. Create project: https://app.supabase.com
2. Run SQL migrations in Supabase SQL Editor (in order):
   - `scripts/001_create_tables.sql`
   - `scripts/002_create_functions.sql`
   - `scripts/003_add_auth_and_badges.sql`
3. Enable Email Auth in Supabase Dashboard → Authentication → Providers

Create `.env.local`:
\`\`\`bash
# Google Cloud Vision API
GOOGLE_CLOUD_VISION_API_KEY=your-api-key-here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
\`\`\`

### 4. Run
\`\`\`bash
npm run dev
\`\`\`

Visit http://localhost:3000

## How It Works

1. **Record** - Capture video via webcam
2. **Extract** - Convert to frames (1 FPS, JPEG 0.95 quality)
3. **Analyze** - Parallel CV detection (5 concurrent requests)
4. **Score** - Weighted algorithm calculates compliance
5. **Save** - Persist results to Supabase database
6. **Badge** - Award Churred Safety Badge for 80%+ scores
7. **Display** - Contextual feedback with scores and suggestions

## Hygiene Categories

- Protective Gloves (30%)
- Bare Hands Detection (25%)
- Hair Net Compliance (15%)
- Clean Surfaces (15%)
- Equipment Usage (10%)
- Cross Contamination (5%)

## Churred Safety Badge

Vendors who score **80% or above** earn the Churred Safety Badge:
- ✅ Badge valid for 90 days
- ✅ Public badge display for vendor websites
- ✅ Track badge history and expiration
- ✅ Re-test before expiration to maintain badge

## Tech Stack

- Next.js 14, React 18, TypeScript
- TailwindCSS
- Supabase (Database + Authentication)
- Google Cloud Vision API

## Tips for Best Results

- Use bright, well-lit environment
- Keep camera stable and focused
- Record 30-60 seconds of food preparation
- Include hands, surfaces, and equipment in frame

## License

Private project - All rights reserved
