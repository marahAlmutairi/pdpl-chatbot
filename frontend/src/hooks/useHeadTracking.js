import { useEffect, useRef, useState, useCallback } from 'react'
import * as faceapi from '@vladmandic/face-api'

const MODEL_URL   = '/models'
const DETECT_OPTS = new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4, inputSize: 224 })

// Face-api.js 68-point landmark indices
// In original camera frame (not mirrored):
//   pts[0]  = leftmost jaw point  = user's RIGHT cheek
//   pts[16] = rightmost jaw point = user's LEFT cheek
//   pts[30] = nose tip
// Yaw formula:  noseOffset = (nose.x - center.x) / faceWidth
//               positive offset => nose moved right => user turned LEFT
//               negate so yaw > 0 = user turned RIGHT

export function useHeadTracking({ onYaw, enabled = true, threshold = 15 }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const loaded    = useRef(false)

  const [status, setStatus] = useState('loading')   // loading | ready | noface | error
  const [yawLive, setYawLive] = useState(0)

  /* ─── Load models ────────────────────────────────── */
  useEffect(() => {
    if (!enabled) return
    setStatus('loading')
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    ])
      .then(() => { loaded.current = true; startCamera() })
      .catch(() => setStatus('error'))

    return () => {
      cancelAnimationFrame(animRef.current)
      stopCamera()
    }
  }, [enabled])

  /* ─── Camera ─────────────────────────────────────── */
  const stopCamera = () => {
    const video = videoRef.current
    video?.srcObject?.getTracks().forEach(t => t.stop())
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      video.onloadedmetadata = () => {
        video.play()
        animRef.current = requestAnimationFrame(loop)
      }
    } catch {
      setStatus('error')
    }
  }

  /* ─── Detection loop ─────────────────────────────── */
  const loop = useCallback(async () => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !loaded.current) {
      animRef.current = requestAnimationFrame(loop)
      return
    }

    // Sync canvas to video
    if (canvas.width !== video.videoWidth && video.videoWidth > 0) {
      canvas.width  = video.videoWidth
      canvas.height = video.videoHeight
    }

    const W = canvas.width  || 640
    const H = canvas.height || 480
    const ctx = canvas.getContext('2d')

    // Draw mirrored video
    ctx.save()
    ctx.scale(-1, 1)
    ctx.translate(-W, 0)
    ctx.drawImage(video, 0, 0, W, H)
    ctx.restore()

    // Detect
    const result = await faceapi
      .detectSingleFace(video, DETECT_OPTS)
      .withFaceLandmarks(true)

    if (result) {
      const pts = result.landmarks.positions
      drawMesh(ctx, pts, W, H)
      const yaw = calcYaw(pts)
      setYawLive(yaw)
      setStatus('ready')
      onYaw(yaw)
    } else {
      setStatus('noface')
      setYawLive(0)
      onYaw(0)
    }

    animRef.current = requestAnimationFrame(loop)
  }, [onYaw])

  /* ─── Yaw calculation ────────────────────────────── */
  function calcYaw(pts) {
    const left   = pts[0]
    const right  = pts[16]
    const nose   = pts[30]
    const width  = right.x - left.x
    if (width < 10) return 0
    const centerX = (left.x + right.x) / 2
    const offset  = (nose.x - centerX) / width
    return -offset * 90   // negate: positive = user's right
  }

  /* ─── Face mesh drawing ──────────────────────────── */
  function drawMesh(ctx, pts, W, H) {
    ctx.save()
    ctx.scale(-1, 1)
    ctx.translate(-W, 0)

    const seg = (indices, color, lw = 1) => {
      ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = lw
      ctx.moveTo(pts[indices[0]].x, pts[indices[0]].y)
      for (let i = 1; i < indices.length; i++)
        ctx.lineTo(pts[indices[i]].x, pts[indices[i]].y)
      ctx.stroke()
    }

    // Jawline
    seg([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16], 'rgba(15,138,95,0.30)')
    // Eyebrows
    seg([17,18,19,20,21], 'rgba(139,92,246,0.55)', 1.5)
    seg([22,23,24,25,26], 'rgba(139,92,246,0.55)', 1.5)
    // Nose bridge + base
    seg([27,28,29,30],    'rgba(15,138,95,0.70)', 1.5)
    seg([31,32,33,34,35,30], 'rgba(15,138,95,0.50)')
    // Left eye
    seg([36,37,38,39,40,41,36], 'rgba(99,102,241,0.75)', 1.8)
    // Right eye
    seg([42,43,44,45,46,47,42], 'rgba(99,102,241,0.75)', 1.8)
    // Outer lips
    seg([48,49,50,51,52,53,54,55,56,57,58,59,48], 'rgba(15,138,95,0.40)')
    // Inner lips
    seg([60,61,62,63,64,65,66,67,60], 'rgba(15,138,95,0.30)')

    // Dots on all landmarks
    pts.forEach((p, i) => {
      const key = [0,4,8,12,16,30,36,39,42,45,48,54].includes(i)
      ctx.beginPath()
      ctx.arc(p.x, p.y, key ? 3.5 : 1.8, 0, Math.PI * 2)
      ctx.fillStyle = key ? 'rgba(15,138,95,1)' : 'rgba(15,138,95,0.55)'
      ctx.fill()
    })

    // Nose tip pulse ring
    ctx.beginPath()
    ctx.arc(pts[30].x, pts[30].y, 9, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(15,138,95,0.9)'
    ctx.lineWidth = 2.5
    ctx.stroke()

    ctx.restore()
  }

  return { videoRef, canvasRef, status, yawLive }
}
