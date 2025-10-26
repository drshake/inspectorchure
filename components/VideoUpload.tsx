"use client"

import { useState, useRef, useCallback } from "react"
import { Video, Square, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function VideoUpload({
  onAnalysisStart,
}: {
  onAnalysisStart: (blob: Blob, duration: number, fileName: string) => void
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null)
  const [uploading, setUploading] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [showCamera, setShowCamera] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
        // Try to get back camera first
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { exact: "environment" }, // Forces back camera
          },
          audio: false,
        })
      } catch (error) {
        // Fallback to any available camera if back camera fails
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment", // Prefers back camera but allows fallback
          },
          audio: false,
        })
      }

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Auto-start recording immediately
      setTimeout(() => {
        startRecording()
      }, 500)
    } catch (error: any) {
      console.error("Camera error:", error)
      setError("Please allow camera access to record video")
      setShowCamera(false)
    }
  }, [])

  const startRecording = useCallback(() => {
    if (!streamRef.current) return

    try {
      const mediaRecorder = new MediaRecorder(streamRef.current)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" })
        setRecordedVideo(blob)
        setShowCamera(false)

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
          streamRef.current = null
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("Recording error:", error)
      setError("Recording failed. Please try again.")
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [isRecording])

  const closeCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setShowCamera(false)
    setIsRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const uploadRecordedVideo = useCallback(async () => {
    if (!recordedVideo) return

    setUploading(true)
    
    // MIME type validation
    if (!recordedVideo.type.startsWith('video/')) {
      setError('Invalid file type. Please upload a video file.')
      setUploading(false)
      setRecordedVideo(null)
      return
    }
    
    // Basic video validation
    const minDuration = 5 // 5 seconds minimum
    const maxDuration = 300 // 5 minutes maximum
    const maxSize = 100 * 1024 * 1024 // 100 MB
    
    // Validate duration
    if (recordingTime < minDuration) {
      setError(`Video too short. Please record at least ${minDuration} seconds.`)
      setUploading(false)
      setRecordedVideo(null)
      return
    }
    
    if (recordingTime > maxDuration) {
      setError(`Video too long. Maximum duration is ${Math.floor(maxDuration / 60)} minutes.`)
      setUploading(false)
      setRecordedVideo(null)
      return
    }
    
    // Validate size
    if (recordedVideo.size > maxSize) {
      setError(`Video file too large. Maximum size is ${maxSize / (1024 * 1024)} MB.`)
      setUploading(false)
      setRecordedVideo(null)
      return
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-")
    const fileName = `recorded-video-${timestamp}-${recordingTime}s.webm`

    setUploading(false)
    onAnalysisStart(recordedVideo, recordingTime, fileName)

    setRecordedVideo(null)
    setRecordingTime(0)
    setError(null)
  }, [recordedVideo, recordingTime, onAnalysisStart])

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

  // Full-screen camera interface
  if (showCamera) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />

        <div className="absolute inset-0 flex flex-col">
          <div className="flex justify-between items-center p-4 bg-gradient-to-b from-black/50 to-transparent">
            <button
              onClick={closeCamera}
              className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            {isRecording && (
              <div className="flex items-center bg-red-600 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                <span className="text-white text-sm font-medium">{formatTime(recordingTime)}</span>
              </div>
            )}
            <div className="w-10 h-10" />
          </div>

          <div className="flex-1 flex items-center justify-center p-8">
            <div className="relative w-full max-w-sm aspect-square">
              <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-lg" />

              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-white text-lg font-medium mb-2">Recording Kitchen Area</p>
                  <p className="text-white/80 text-sm">Scanning for hygiene factors...</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-gradient-to-t from-black/50 to-transparent">
            <div className="flex items-center justify-center">
              <button
                onClick={stopRecording}
                className="w-20 h-20 rounded-full bg-red-600 border-4 border-white flex items-center justify-center shadow-lg"
              >
                <Square className="w-8 h-8 text-white fill-white" />
              </button>
            </div>

            <div className="text-center mt-4">
              <p className="text-white text-sm">Tap to stop recording</p>
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
        {/* Error state */}
        {error && (
          <>
            <Video className="h-8 w-8 text-red-500 mb-4" />
            <p className="text-red-700 text-center mb-4 max-w-md">{error}</p>
            <Button onClick={startCamera} className="bg-blue-500 hover:bg-blue-600 text-white px-8">
              Try Again
            </Button>
          </>
        )}

        {/* Recorded video state */}
        {recordedVideo && !uploading && !error && (
          <>
            <Video className="h-8 w-8 text-green-500 mb-4" />
            <p className="text-gray-700 text-center mb-2">Video recorded successfully!</p>
            <p className="text-gray-600 text-sm mb-4">Duration: {formatTime(recordingTime)}</p>
            <div className="flex gap-3">
              <Button
                onClick={retakeVideo}
                variant="outline"
                className="border-blue-200 hover:border-blue-300 hover:bg-blue-50 bg-transparent"
              >
                Retake
              </Button>
              <Button onClick={uploadRecordedVideo} className="bg-blue-500 hover:bg-blue-600 text-white">
                <Upload className="mr-2 h-4 w-4" />
                Analyze Video
              </Button>
            </div>
          </>
        )}

        {/* Uploading state */}
        {uploading && !error && (
          <>
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-blue-600">Uploading video for analysis...</p>
          </>
        )}

        {/* Initial state */}
        {!recordedVideo && !uploading && !error && (
          <>
            <Video className="h-8 w-8 text-blue-500 mb-4" />
            <Button onClick={startCamera} className="bg-blue-500 hover:bg-blue-600 text-white px-8">
              Record Video
            </Button>
            <p className="text-gray-500 text-sm mt-4">Click to start recording</p>
          </>
        )}
      </div>
    </div>
  )
}
