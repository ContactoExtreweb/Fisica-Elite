'use client'

// Subida directa navegador → Bunny (TUS, reanudable). El archivo NUNCA
// pasa por nuestro servidor: solo viajan firmas temporales.
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as tus from 'tus-js-client'
import {
  iniciarSubidaVideo,
  confirmarVideo,
  quitarVideo,
} from '@/app/admin/ejercicios/video-actions'

const MAX_MB = 500

export default function SubirVideo({
  ejercicioId,
  embedUrl,
}: {
  ejercicioId: string
  embedUrl: string | null
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [pct, setPct] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const elegirArchivo = () => inputRef.current?.click()

  const onArchivo = async (file: File | undefined) => {
    if (!file) return
    setError(null)

    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`El vídeo supera los ${MAX_MB} MB`)
      return
    }

    setSubiendo(true)
    setPct(0)

    // 1 · El servidor crea el vídeo en Bunny y nos da una firma temporal
    const inicio = await iniciarSubidaVideo(ejercicioId, file.name)
    if ('error' in inicio) {
      setError(inicio.error)
      setSubiendo(false)
      return
    }

    // 2 · Subida directa a Bunny con TUS (reanudable, con progreso)
    const upload = new tus.Upload(file, {
      endpoint: 'https://video.bunnycdn.com/tusupload',
      retryDelays: [0, 3000, 8000, 15000],
      headers: {
        AuthorizationSignature: inicio.firma,
        AuthorizationExpire: String(inicio.expiracion),
        VideoId: inicio.guid,
        LibraryId: String(inicio.libraryId),
      },
      metadata: { filetype: file.type, title: file.name },
      onError: () => {
        setError('Fallo en la subida. Comprueba la conexión e inténtalo de nuevo.')
        setSubiendo(false)
      },
      onProgress: (enviado, total) => {
        setPct(Math.round((enviado / total) * 100))
      },
      onSuccess: async () => {
        // 3 · Asociamos el vídeo al ejercicio en la BBDD
        setGuardando(true)
        const res = await confirmarVideo(ejercicioId, inicio.guid)
        setSubiendo(false)
        setGuardando(false)
        if (res.error) setError(res.error)
        else router.refresh()
      },
    })

    upload.start()
  }

  const onQuitar = async () => {
    if (!confirm('¿Quitar el vídeo de este ejercicio? Se borrará también de Bunny.')) return
    const res = await quitarVideo(ejercicioId)
    if (res.error) setError(res.error)
    else router.refresh()
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        style={{ display: 'none' }}
        onChange={(e) => onArchivo(e.target.files?.[0])}
      />

      {embedUrl ? (
        <>
          <div className="video-frame">
            <iframe
              src={embedUrl}
              loading="lazy"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title="Vídeo del ejercicio"
            />
          </div>
          <div className="video-acciones">
            <button
              type="button"
              className="faq-btn-mini"
              onClick={elegirArchivo}
              disabled={subiendo}
            >
              {subiendo ? `Subiendo… ${pct}%` : 'Reemplazar vídeo'}
            </button>
            <button
              type="button"
              className="faq-btn-mini gris"
              onClick={onQuitar}
              disabled={subiendo}
            >
              Quitar vídeo
            </button>
          </div>
          {subiendo && (
            <div className="barra-progreso">
              <div className="fill" style={{ width: `${pct}%` }}></div>
            </div>
          )}
        </>
      ) : (
        <div className="video-upload-zona">
          <div className="titulo">
            {subiendo
              ? guardando
                ? 'Guardando…'
                : `Subiendo vídeo… ${pct}%`
              : 'Este ejercicio aún no tiene vídeo'}
          </div>
          <div className="sub">MP4, MOV o WEBM · hasta {MAX_MB} MB · va directo a Bunny</div>
          {!subiendo && (
            <button type="button" className="admin-topbar-cta" onClick={elegirArchivo}>
              Seleccionar vídeo
            </button>
          )}
          {subiendo && (
            <div className="barra-progreso">
              <div className="fill" style={{ width: `${pct}%` }}></div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="form-error" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
    </div>
  )
}
