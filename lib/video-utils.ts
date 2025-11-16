/**
 * Gets the best supported video MIME type for the current browser
 * Prefers MP4/H.264, falls back to WebM
 */
export function getBestVideoMimeType(): string | null {
  const types = ["video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      console.log("[v0] Selected MIME type:", type)
      return type
    }
  }

  console.warn("[v0] No supported MIME types, using default")
  return null
}

/**
 * Quick sanity checks for file health
 */
export function assertFileHealthy(file: File | Blob) {
  if (!file) throw new Error("No file provided")
  if (!file.size || file.size < 1000) throw new Error("File is empty or corrupted")
  console.log("[v0] File health check passed - size:", file.size, "type:", file.type)
}

/**
 * Validates that a video blob can be loaded and checks minimum duration
 */
export async function validateVideo(blob: Blob, minDuration = 5): Promise<number> {
  const url = URL.createObjectURL(blob)
  const video = document.createElement("video")
  video.preload = "metadata"
  video.muted = true
  video.playsInline = true

  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Video load timeout")), 10000)

      video.onloadedmetadata = () => {
        clearTimeout(timeout)
        resolve(video.duration)
      }

      video.onerror = () => {
        clearTimeout(timeout)
        reject(new Error("Cannot load video"))
      }

      video.src = url
      video.load()
    })

    URL.revokeObjectURL(url)

    if (duration < minDuration) {
      throw new Error(`Video too short: ${duration.toFixed(1)}s. Need at least ${minDuration}s.`)
    }

    console.log("[v0] Video validated - duration:", duration, "seconds")
    return duration
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

/**
 * Properly finalizes MediaRecorder and waits for all data
 */
export async function finalizeRecording(mediaRecorder: MediaRecorder, chunks: Blob[]): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Recording timeout")), 10000)

    mediaRecorder.onstop = () => {
      clearTimeout(timeout)

      if (chunks.length === 0) {
        reject(new Error("No video data recorded"))
        return
      }

      const blob = new Blob(chunks, { type: mediaRecorder.mimeType || "video/webm" })
      console.log("[v0] Recording finalized - size:", blob.size, "type:", blob.type)
      resolve(blob)
    }

    mediaRecorder.onerror = (event: any) => {
      clearTimeout(timeout)
      reject(new Error(`Recording error: ${event.error?.message || "Unknown error"}`))
    }

    if (mediaRecorder.state === "recording") {
      mediaRecorder.requestData()
      mediaRecorder.stop()
    } else if (mediaRecorder.state === "inactive" && chunks.length > 0) {
      clearTimeout(timeout)
      const blob = new Blob(chunks, { type: mediaRecorder.mimeType || "video/webm" })
      resolve(blob)
    }
  })
}

/**
 * Simple video processing - just validate and return
 */
export async function processRecordedVideo(blob: Blob, minDuration = 5): Promise<Blob> {
  console.log("[v0] Processing video - size:", blob.size, "type:", blob.type)

  assertFileHealthy(blob)
  await validateVideo(blob, minDuration)

  console.log("[v0] Video processing complete")
  return blob
}

let codecInfoLogged = false

/**
 * Extracts codec information from a video blob
 */
async function getCodecInfo(blob: Blob): Promise<{ videoCodec: string; audioCodec: string }> {
  try {
    let videoCodec = "unknown"
    let audioCodec = "unknown"

    if (blob.type.includes("codecs=")) {
      const codecMatch = blob.type.match(/codecs=([^;]+)/)
      if (codecMatch) {
        const codecs = codecMatch[1].split(",").map((c) => c.trim())
        videoCodec = codecs[0] || "unknown"
        audioCodec = codecs[1] || "none"
      }
    } else if (blob.type.includes("mp4")) {
      videoCodec = "h264"
      audioCodec = "aac"
    } else if (blob.type.includes("webm")) {
      videoCodec = "vp8/vp9"
      audioCodec = "opus"
    } else if (blob.type.includes("quicktime")) {
      videoCodec = "h264"
      audioCodec = "aac"
    }

    return { videoCodec, audioCodec }
  } catch (error) {
    return { videoCodec: "unknown", audioCodec: "unknown" }
  }
}

/**
 * Main video processing pipeline
 * Handles validation and final checks
 */
export async function processVideoPipeline(blob: Blob, minDuration = 5): Promise<Blob> {
  console.log("[v0] Starting video processing pipeline...")
  console.log("[v0] Input blob - size:", blob.size, "type:", blob.type)

  assertFileHealthy(blob)

  try {
    const duration = await validateVideo(blob, minDuration)

    if (!codecInfoLogged) {
      const codecInfo = await getCodecInfo(blob)
      console.info("[Recorder] codec", {
        videoCodec: codecInfo.videoCodec,
        audioCodec: codecInfo.audioCodec,
        mimeType: blob.type,
        size: blob.size,
        duration: duration,
      })
      codecInfoLogged = true
    }

    console.info("[Recorder] Processing complete", {
      duration: duration,
      type: blob.type,
      size: blob.size,
      format: blob.type.includes("mp4") ? "MP4" : blob.type.includes("webm") ? "WebM" : "Other",
    })

    console.log("[v0] Video processing complete - final size:", blob.size, "type:", blob.type)
    return blob
  } catch (error: any) {
    console.error("[v0] Video processing failed:", error)
    throw error
  }
}

export function resetCodecLogging() {
  codecInfoLogged = false
}
