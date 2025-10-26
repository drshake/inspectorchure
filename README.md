# InspectorChure

AI-powered food safety inspection using computer vision to analyze kitchen hygiene compliance.

## Features

- 📹 Browser-based video recording
- 🔍 Computer vision detection (Google Cloud Vision API)
- 📊 Weighted hygiene scoring across 6 categories
- ⚡ Parallel processing for fast analysis
- 💡 Contextual feedback for detected issues

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Google Cloud Vision API

1. Enable Vision API: https://console.cloud.google.com/apis/library/vision.googleapis.com
2. Enable billing (first 1,000 requests/month are free)
3. Create API Key: https://console.cloud.google.com/apis/credentials
4. Restrict key to Cloud Vision API only

Create `.env.local`:
```bash
GOOGLE_CLOUD_VISION_API_KEY=your-api-key-here
```

### 3. Run
```bash
npm run dev
```

Visit http://localhost:3000

## How It Works

1. **Record** - Capture video via webcam
2. **Extract** - Convert to frames (1 FPS, JPEG 0.95 quality)
3. **Analyze** - Parallel CV detection (5 concurrent requests)
4. **Score** - Weighted algorithm calculates compliance
5. **Display** - Contextual feedback with scores and suggestions

## Hygiene Categories

- Protective Gloves (30%)
- Bare Hands Detection (25%)
- Hair Net Compliance (15%)
- Clean Surfaces (15%)
- Equipment Usage (10%)
- Cross Contamination (5%)

## Tech Stack

- Next.js 14, React 18, TypeScript
- TailwindCSS
- Google Cloud Vision API

## Tips for Best Results

- Use bright, well-lit environment
- Keep camera stable and focused
- Record 30-60 seconds of food preparation
- Include hands, surfaces, and equipment in frame

## License

Private project - All rights reserved
