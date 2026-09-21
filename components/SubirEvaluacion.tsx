'use client'

// El alumno graba su prueba real y la sube. Subida directa navegador →
// Bunny con TUS: el archivo NUNCA pasa por nuestro servidor, solo viajan
// firmas temporales. Mismo patrón que la subida del admin.
//
// Pensado para grabar con el móvil: se aceptan los formatos que sacan
// iPhone y Android, y el aviso de tamaño va por delante para que nadie
// espere diez minutos a que falle.
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as tus from 'tus-js-client'
import {
  iniciarSubidaEvaluacion,
  confirmarEvaluacion,
} from '@/app/evaluaciones/actions'

const MAX_MB = 500

export default function SubirEvaluacion({
  categoriaId,
  categoria,
}: {
  categoriaId: string
  categoria: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [abierto, setAbierto] = useState(false)
  const [notas, setNotas] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [pct, setPct] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const onArchivo = async (file: File | undefined) => {
    if (!file) return
    setError(null)

    if (file.size > MAX_MB * 1024 * 1024) {
      setError(
        `El vídeo ocupa ${Math.round(file.size / 1024 / 1024)} MB y el máximo son ${MAX_MB} MB. Graba en menos calidad o córtalo.`
      )
      return
    }

    setSubiendo(true)
    setPct(0)

    // 1 · El servidor comprueba que puedes subir y te da una firma
    const inicio = await iniciarSubidaEvaluacion(categoriaId, file.name)
    if ('error' in inicio) {
      setError(inicio.error)
      setSubiendo(false)
      return
    }

    // 2 · Subida directa a Bunny (reanudable, con progreso)
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
        setError('Se cortó la subida. Comprueba la conexión e inténtalo otra vez.')
        setSubiendo(false)
      },
      onProgress: (enviado, total) => {
        setPct(Math.round((enviado / total) * 100))
      },
      onSuccess: async () => {
        // 3 · Registramos la prueba para que la vea el preparador
        setGuardando(true)
        const res = await confirmarEvaluacion(categoriaId, inicio.guid, notas, inicio.sello)
        setSubiendo(false)
        setGuardando(false)
        if (res.error) {
          setError(res.error)
        } else {
          setNotas('')
          setAbierto(false)
          router.refresh()
        }
      },
    })

    upload.start()
  }

  if (!abierto) {
    return (
      <button type="button" className="eval-btn" onClick={() => setAbierto(true)}>
        Subir mi prueba de {categoria}
      </button>
    )
  }

  return (
    <div className="eval-subida">
      <label className="eval-subida-label" htmlFor={`notas-${categoriaId}`}>
        ¿Algo que contarle a tu preparador? (opcional)
      </label>
      <textarea
        id={`notas-${categoriaId}`}
        rows={3}
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        placeholder="Ej.: la grabé después de currar y estaba cansado. En la segunda serie noté el hombro."
        disabled={subiendo || guardando}
      />

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        style={{ display: 'none' }}
        onChange={(e) => onArchivo(e.target.files?.[0])}
      />

      {error && <p className="form-error">{error}</p>}

      {subiendo || guardando ? (
        <div className="eval-progreso">
          <div className="eval-barra">
            <span style={{ width: `${pct}%` }} />
          </div>
          <span>{guardando ? 'Guardando…' : `Subiendo… ${pct}%`}</span>
        </div>
      ) : (
        <div className="eval-subida-acciones">
          <button
            type="button"
            className="eval-btn"
            onClick={() => inputRef.current?.click()}
          >
            Elegir vídeo
          </button>
          <button
            type="button"
            className="eval-btn-fantasma"
            onClick={() => {
              setAbierto(false)
              setError(null)
            }}
          >
            Cancelar
          </button>
        </div>
      )}

      <p className="eval-ayuda">
        Graba de frente, que se te vea entero y se note la ejecución. Máximo{' '}
        {MAX_MB} MB. No cierres esta página mientras sube.
      </p>
    </div>
  )
}
