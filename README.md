# InspectorChure MVP

AI-powered food safety inspection analysis using computer vision.

## Overview

InspectorChure analyzes kitchen preparation videos to detect hygiene compliance issues in real-time using Google Cloud Vision API.

**Core Features:**
- 📹 Video recording via browser (MediaRecorder API)
- 🖼️ Frame extraction at 1 FPS (Canvas API)
- 🔍 Computer vision detection (Google Cloud Vision API)
- 📊 Hygiene scoring with weighted categories
- ⚡ Parallel batch processing (5x faster)

## Tech Stack

- **Framework**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: TailwindCSS
- **CV Service**: Google Cloud Vision API
- **Processing**: Client-side frame extraction, server-side API calls

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Google Cloud Vision API

#### Enable Vision API
1. Go to: https://console.cloud.google.com/apis/library/vision.googleapis.com
2. Enable the API for your project

#### Enable Billing
1. Go to: https://console.cloud.google.com/billing
2. Link billing account (Google offers $300 free credits)
3. **Pricing**: First 1,000 requests/month are FREE
4. Each video frame = 1 request (30-second video ≈ 30 requests)

#### Create API Key
1. Go to: https://console.cloud.google.com/apis/credentials
2. Create Credentials → API Key
3. **Important**: Restrict the key:
   - API restrictions: Check only "Cloud Vision API"
   - Application restrictions: Optional (add website URL)

#### Add to Environment
Create `.env.local` in project root:
```bash
GOOGLE_CLOUD_VISION_API_KEY=your-api-key-here
```

### 3. Run Development Server
```bash
npm run dev
```

Visit http://localhost:3000

### 4. Build for Production
```bash
npm run build
npm start
```

## Architecture

### Pipeline Flow
```
1. Video Recording → MediaRecorder captures WebM
2. Frame Extraction → Canvas extracts JPEG frames at 1 FPS
3. Brightness Check → Validates middle frame (threshold: 30)
4. CV Detection → Parallel batches of 5 frames to Vision API
5. Detection Mapping → Maps CV labels to hygiene categories
6. Scoring → Weighted algorithm calculates compliance scores
7. Results Display → Shows scores, findings, suggestions
```

### Key Components

**Frontend:**
- `app/page.tsx` - Main analysis orchestration
- `components/VideoUpload.tsx` - Camera interface & recording
- `components/ResultsDisplay.tsx` - Analysis results UI

**Backend:**
- `app/api/vision/detect/route.ts` - Vision API endpoint
- `lib/frame-extractor.ts` - Client-side frame extraction
- `lib/cv-service.ts` - Vision API integration (parallel batching)
- `lib/detection-mapper.ts` - CV labels → hygiene categories
- `lib/scoring-engine.ts` - Weighted scoring algorithm
- `lib/video-analyzer.ts` - Complete pipeline orchestration

### Hygiene Categories & Weights

```typescript
{
  protectiveGloves: 30%,      // Most critical
  bareHands: 25%,             // Violation
  hairNet: 15%,
  cleanSurface: 15%,
  equipment: 10%,
  crossContamination: 5%
}
```

## Current Status & Known Issues

### ✅ Working
- Video recording and validation
- Frame extraction (1 FPS, JPEG 0.95 quality)
- Parallel CV API calls (5 concurrent, ~30s for 30 frames)
- Error handling (billing, authentication, quota)
- Brightness validation
- Security (API key in header)

### ⚠️ Active Issues

#### Issue 1: CV Returns Only Color Labels
**Symptom**: Google Vision detects only colors (Orange, Red, Brown) instead of objects (Hand, Glove, Kitchen)

**Root Cause**: Video frame quality insufficient for object detection
- Lighting too dim
- Resolution too low
- Focus unclear

**Solutions Attempted**:
- ✅ Increased JPEG quality: 0.8 → 0.95
- 🔄 Testing with better lit environment

**Next Steps**:
- Test with bright, well-lit video
- If still fails: Increase canvas resolution
- Consider image preprocessing (contrast, brightness adjustment)

#### Issue 2: Misleading "100% Raw Food Safety"
**What it means**: Cross-contamination score = `100 - (detectionRate/40) * 100`
- When detectionRate = 0 (no vegetables detected)
- Score = 100% = "No cross-contamination risk detected"

**Problem**: When CV detects NOTHING, 100% is misleading

**Solution Options**:
- Show "Not Assessed" for 0-detection categories
- Distinguish: Detected-Good vs Detected-Bad vs Not-Detected
- Add minimum detection threshold for scoring

## Testing Checklist

### Manual Testing
- [ ] Record 30-second video in bright lighting
- [ ] Verify CV detects actual objects (not just colors)
- [ ] Check console logs for detection labels
- [ ] Validate scores are realistic
- [ ] Test dark video (should reject with brightness error)
- [ ] Test short video (<5s, should reject)
- [ ] Test long video (>5min, should reject)
- [ ] Test invalid file type

### Performance Validation
- [ ] Parallel processing: ~30s for 30 frames (vs 150s sequential)
- [ ] Browser console shows batches of 5 concurrent requests
- [ ] Progress indicators update smoothly

### Security Check
- [x] API key in header (not URL)
- [x] Error messages don't leak sensitive data
- [x] Build succeeds without errors

## Troubleshooting

### Error: "This API method requires billing"
- Enable billing: https://console.cloud.google.com/billing
- Wait 5-10 minutes for propagation

### Error: "API key not valid"
- Ensure key has Cloud Vision API enabled
- Check restrictions allow your domain
- Verify key copied correctly (no spaces)

### Error: "Quota exceeded"
- Check: https://console.cloud.google.com/apis/api/vision.googleapis.com/quotas
- Free tier: 1,000 requests/month
- Consider upgrading if needed

### Only Color Labels Detected
- Improve lighting (bright, well-lit environment)
- Ensure camera focuses properly
- Try higher resolution if available
- Check frame extraction quality in console

## Cost Estimation

**Free Tier** (1,000 requests/month):
- ~33 videos (30 seconds each @ 1 FPS)
- Perfect for MVP testing!

**Paid Tier** ($1.50 per 1,000 images):
- 1,000 videos/month ≈ $45
- 100 videos/day ≈ $135/month

## Development Notes

### Performance Optimizations
- Parallel batch processing (BATCH_SIZE=5)
- Client-side frame extraction (reduces server load)
- JPEG compression (balance quality vs size)
- Progress callbacks for UX feedback

### Code Quality
- TypeScript for type safety
- Error boundaries and graceful fallbacks
- Detailed console logging for debugging
- Clean separation of concerns

### Future Enhancements (Post-MVP)
- Service account auth (more secure than API key)
- Video upload from file (not just recording)
- Adjustable FPS and resolution
- Custom keyword configuration
- Historical analysis tracking
- Export reports as PDF
- Multi-language support
- Mobile app version

## Contributing

This is an MVP in active development. Current focus:
1. Fix CV object detection (lighting/quality issues)
2. Improve scoring logic for edge cases
3. Complete end-to-end testing
4. Production deployment preparation

## License

Private project - All rights reserved
