"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { getBestVideoMimeType, finalizeRecording, processVideoPipeline } from "@/lib/video-utils"

export default function VideoUpload({
  onAnalysisStart,
  vendorId,
}: {
  onAnalysisStart: (fileName: string, videoBlob: Blob) => void
  vendorId?: string
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null)
  const [uploading, setUploading] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [showCamera, setShowCamera] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      setShowCamera(true)

      let stream: MediaStream

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: "environment" } },
          audio: false,
        })
      } catch (error) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        })
      }

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setTimeout(() => startRecording(), 500)
    } catch (error: any) {
      console.error("[v0] Camera error:", error)
      setError("Camera access denied. Please allow camera permissions and try again.")
      setShowCamera(false)
    }
  }, [])

  const startRecording = useCallback(() => {
    if (!streamRef.current) return

    try {
      const mimeType = getBestVideoMimeType()

      if (!mimeType) {
        setError("Your browser doesn't support video recording.")
        return
      }

      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType,
        videoBitsPerSecond: 2500000,
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.start(1000)
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error: any) {
      console.error("[v0] Recording error:", error)
      setError("Failed to start recording. Please try again.")
    }
  }, [])

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || !isRecording) return

    setIsRecording(false)
    setIsProcessing(true)

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    try {
      const blob = await finalizeRecording(mediaRecorderRef.current, chunksRef.current)
      const processedBlob = await processVideoPipeline(blob, 5)

      setRecordedVideo(processedBlob)
      setShowCamera(false)

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    } catch (error: any) {
      console.error("[v0] Recording error:", error)

      let userMessage = "Recording failed. Please try again."

      if (error.message?.includes("too short")) {
        userMessage = "Video is too short. Please record at least 5 seconds."
      } else if (error.message?.includes("timeout")) {
        userMessage = "Recording timed out. Please try again."
      } else if (error.message?.includes("empty") || error.message?.includes("corrupted")) {
        userMessage = "Recording failed to save. Please try again."
      }

      setError(userMessage)
      setRecordedVideo(null)

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      setShowCamera(false)
    } finally {
      setIsProcessing(false)
    }
  }, [isRecording])

  const closeCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    setShowCamera(false)
    setIsRecording(false)
    setIsProcessing(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const uploadRecordedVideo = useCallback(async () => {
    if (!recordedVideo) return

    console.log("[v0] ========== UPLOAD START ==========")
    console.log("[v0] Recorded video size:", recordedVideo.size, "bytes")
    console.log("[v0] Recorded video type:", recordedVideo.type)
    console.log("[v0] Recording duration:", recordingTime, "seconds")

    setUploading(true)
    setError(null)

    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
      const extension = recordedVideo.type.includes("mp4") ? "mp4" : "webm"
      const fileName = `recorded-${timestamp}.${extension}`

      console.log("[v0] Calling onAnalysisStart with fileName:", fileName)
      onAnalysisStart(fileName, recordedVideo)

      setUploading(false)
      setRecordedVideo(null)
      setRecordingTime(0)
    } catch (error: any) {
      console.error("[v0] ❌ Upload error:", error)
      setUploading(false)
      setError("Failed to start analysis. Please try again.")
    }
  }, [recordedVideo, onAnalysisStart, recordingTime])

  const retakeVideo = useCallback(() => {
    setRecordedVideo(null)
    setRecordingTime(0)
    setError(null)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  if (showCamera) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />

        <div className="absolute inset-0 flex flex-col">
          <div className="flex justify-between items-center p-4 bg-gradient-to-b from-black/50 to-transparent">
            <button
              onClick={closeCamera}
              disabled={isProcessing}
              className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center disabled:opacity-50"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {isRecording && (
              <div className="flex items-center bg-red-600 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                <span className="text-white text-sm font-medium">{formatTime(recordingTime)}</span>
              </div>
            )}
            {isProcessing && (
              <div className="flex items-center bg-blue-600 px-3 py-1 rounded-full">
                <div className="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                <span className="text-white text-sm font-medium">Processing...</span>
              </div>
            )}
            <div className="w-10 h-10" />
          </div>

          <div className="flex-1" />

          <div className="p-8 bg-gradient-to-t from-black/50 to-transparent">
            <div className="flex items-center justify-center">
              <button
                onClick={stopRecording}
                disabled={isProcessing || !isRecording}
                className="w-20 h-20 rounded-full bg-red-600 border-4 border-white flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-8 h-8 text-white fill-white" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" />
                </svg>
              </button>
            </div>
            <div className="text-center mt-4">
              <p className="text-white text-sm">{isProcessing ? "Processing..." : "Tap to stop"}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div
        className={`
          border-2 border-dashed rounded-lg
          ${error ? "border-red-300 bg-red-50" : recordedVideo ? "border-green-300 bg-green-50" : "border-blue-200 hover:border-blue-300 bg-blue-50/50"}
          transition-colors duration-200
          flex flex-col items-center justify-center
          px-6 py-12
        `}
      >
        {error && (
          <>
            <svg className="h-8 w-8 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-red-700 text-center mb-4 max-w-md">{error}</p>
            <div className="flex gap-3">
              <Button onClick={() => setError(null)} variant="outline" className="border-red-300">
                Dismiss
              </Button>
              <Button onClick={startCamera} className="bg-blue-500 hover:bg-blue-600 text-white">
                Try Again
              </Button>
            </div>
          </>
        )}

        {recordedVideo && !uploading && !error && (
          <>
            <svg className="h-8 w-8 text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-gray-700 text-center mb-2">Video ready!</p>
            <p className="text-gray-600 text-sm mb-4">Duration: {formatTime(recordingTime)}</p>
            <div className="flex gap-3">
              <Button onClick={retakeVideo} variant="outline">
                Retake
              </Button>
              <Button onClick={uploadRecordedVideo} className="bg-blue-500 hover:bg-blue-600 text-white">
                Analyze Video
              </Button>
            </div>
          </>
        )}

        {uploading && !error && (
          <>
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-blue-600">Starting analysis...</p>
          </>
        )}

        {!recordedVideo && !uploading && !error && (
          <>
            <svg className="h-8 w-8 text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            <Button onClick={startCamera} className="bg-blue-500 hover:bg-blue-600 text-white px-8">
              Record Video
            </Button>
            <p className="text-gray-500 text-sm mt-4">click to start recording, min 5 seconds</p>
          </>
        )}
      </div>
    </div>
  )
}
