/**
 * Captures frames from a video element at specified timestamps
 * @param videoEl - The video element to capture frames from
 * @param timesSec - Array of timestamps in seconds to capture frames at
 * @returns Array of base64-encoded JPEG images
 */
export async function captureFrames(videoEl: HTMLVideoElement, timesSec: number[] = [0, 2, 4]): Promise<string[]> {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not get canvas context")

  const frames: string[] = []

  if (!videoEl.videoWidth || !videoEl.videoHeight) {
    throw new Error("Video has no dimensions - cannot capture frames")
  }

  canvas.width = videoEl.videoWidth
  canvas.height = videoEl.videoHeight

  console.log("[v0] Canvas size set to:", canvas.width, "x", canvas.height)

  const seekTo = (t: number) =>
    new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Seek timeout"))
      }, 5000) // Added timeout for seeking

      const onSeeked = () => {
        clearTimeout(timeout)
        videoEl.removeEventListener("seeked", onSeeked)
        resolve()
      }
      videoEl.addEventListener("seeked", onSeeked)
      videoEl.currentTime = Math.min(t, videoEl.duration - 0.1)
    })

  for (const t of timesSec) {
    try {
      await seekTo(t)
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
      const frameData = canvas.toDataURL("image/jpeg", 0.95)

      if (!frameData || frameData.length < 100) {
        throw new Error("Failed to capture frame data")
      }

      frames.push(frameData)
      console.log("[v0] Captured frame at", t, "seconds, size:", frameData.length, "bytes")
    } catch (error) {
      console.error("[v0] Error capturing frame at", t, "seconds:", error)
      throw error
    }
  }

  return frames
}

/**
 * Runs hygiene analysis on a recorded video
 * @param vendorId - The vendor ID to associate with the analysis
 * @param videoEl - The video element containing the recorded video
 * @returns Analysis results including hygiene score and categories
 */
export async function runAnalysis(vendorId: string, videoEl: HTMLVideoElement) {
  console.log("[v0] Starting analysis for vendor:", vendorId)
  console.log("[v0] Video dimensions:", videoEl.videoWidth, "x", videoEl.videoHeight)
  console.log("[v0] Video duration:", videoEl.duration)

  const frames = await captureFrames(videoEl)
  console.log("[v0] Captured frames:", frames.length)
  console.log("[v0] First frame preview:", frames[0]?.substring(0, 100))

  const response = await fetch("/api/analyzeFrames", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ vendorId, frames }),
  })

  console.log("[v0] API response status:", response.status)

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[v0] API error response:", errorText)
    throw new Error(`Analysis failed: ${errorText}`)
  }

  const data = await response.json()
  console.log("[v0] Analysis data received:", data)
  return data // { ok, hygieneScore, categories, analysisId }
}
