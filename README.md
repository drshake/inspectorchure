# InspectorChure

Always on food safety inspection using computer vision to analyze kitchen hygiene compliance.

## Features

- Browser-based video recording
- Computer vision detection (HF token API,HUGGINGFACE_MODEL=Qwen/Qwen2.5-VL-7B-Instruct)
- Weighted hygiene scoring across 8 categories
- Parallel processing for fast analysis
- Contextual feedback for detected issues
- User authentication and vendor profiles
- Database persistence with Supabase
  

## Setup

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Configure HUGGINGFACE QWEN VL API

1. Enable HUGGINGFACE API: HUGGINGFACE_API_TOKEN=
2. Create API Key
3. Restrict key to API only

### 3. Configure Supabase

1. Create project: https://app.supabase.com
2. Run SQL migrations in Supabase SQL Editor (in order):
   - `scripts/001_create_tables.sql`
   - `scripts/002_create_functions.sql`
   - `scripts/003_add_auth_and_badges.sql`
3. Enable Email Auth in Supabase Dashboard → Authentication → Providers

Create `.env.local`:
\`\`\`bash
# HUGGINGFACE API
Hugging Face (Qwen3-VL)
HUGGINGFACE_API_TOKEN
# HUGGINGFACE_MODEL=Qwen/Qwen2.5-VL-7B-Instruct  # 

4. Run
\`\`\`bash
npm run dev
\`\`\`

Visit https://inspector.chureai.com/

## How It Works

1. **Record** - Capture video via camera and sensor
2. **Extract** - Convert to frames 
3. **Analyze** - Parallel CV detection (5 concurrent requests)
4. **Score** - Weighted algorithm calculates compliance
5. **Save** - Persist results to Supabase database
6. **Display** - Contextual feedback with scores and suggestions

## Hygiene Categories

- POSITIVES (things that earn points):
- protectiveGloves
- cleanSurface
- hairNet
- properApron
- handwashStation

VIOLATIONS (things that lose points):
- bareHands
- pestSigns
- crossContamination


## Tech Stack

- Next.js 14, React 18, TypeScript
- TailwindCSS
- Supabase (Database + Authentication)
- Qwen2.5-VL-7B-Instruct(Model)

## Tips for Best Results

- Use bright, well-lit environment
- Keep camera stable and focused
- Record 60-90 seconds of food preparation
- Include hands, surfaces, and equipment in frame

## License

Private project - All rights reserved
