import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'

interface SignaturePadProps {
  width?: number
  height?: number
  onEnd?: (signatureData: string
}

export interface SignaturePadRef {
  clear: () => void
  isEmpty: () => boolean
  toDataURL: () => string
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ width = 400, height = 200, onEnd }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const isDrawing = useRef(false)
    const lastPoint = useRef<{ x: number, y: number } | null>(null)

    useImperativeHandle(ref, () => ({
      clear: () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.fillStyle = '#fff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      },
      isEmpty: () => {
        const canvas = canvasRef.current
        if (!canvas) return true
        const ctx = canvas.getContext('2d')
        if (!ctx) return true
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 255) return false
        }
        return true
      },
      toDataURL: () => {
        const canvas = canvasRef.current
        return canvas?.toDataURL('image/png') || ''
      }
    }))

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#fff'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.strokeStyle = '#000'
          ctx.lineWidth = 2
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
        }
      }
    }, [])

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      let clientX: number, clientY: number
      if ('touches' in e) {
        clientX = e.touches[0].clientX
        clientY = e.touches[0].clientY
      } else {
        clientX = e.clientX
        clientY = e.clientY
      }
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
      }
    }

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      isDrawing.current = true
      lastPoint.current = getPos(e)
    }

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault()
      if (!isDrawing.current || !lastPoint.current) return
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const { x, y } = getPos(e)
      ctx.beginPath()
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y)
      ctx.lineTo(x, y)
      ctx.stroke()
      lastPoint.current = { x, y }
    }

    const endDrawing = () => {
      isDrawing.current = false
      lastPoint.current = null
      onEnd?.(canvasRef.current?.toDataURL('image/png') || '')
    }

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="signature-pad"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
      />
    )
  }
)

SignaturePad.displayName = 'SignaturePad'

export default SignaturePad
