'use client'

// Botón «Enviarme un aviso de prueba» del Dashboard del preparador.
//
// Los avisos normales se mandan en segundo plano: si algo falla, solo queda
// en el log de Vercel y desde fuera parece que no pasa nada. Esto manda uno
// al propio preparador, espera, y dice en pantalla qué ha pasado con el
// correo y con el push.
import { useState, useTransition } from 'react'
import { probarAvisos, type ResultadoPrueba } from '@/app/admin/avisos-actions'

export default function ProbarAvisos() {
  const [resultado, setResultado] = useState<ResultadoPrueba | null>(null)
  const [enviando, enviar] = useTransition()

  return (
    <div className="avprueba">
      <button
        type="button"
        className="avprueba-boton"
        disabled={enviando}
        onClick={() =>
          enviar(async () => {
            setResultado(await probarAvisos())
          })
        }
      >
        {enviando ? 'Enviando…' : 'Enviarme un aviso de prueba'}
      </button>
      {resultado && (
        <dl className="avprueba-res">
          <dt>Correo</dt>
          <dd>{resultado.correo}</dd>
          <dt>Móvil</dt>
          <dd>{resultado.push}</dd>
        </dl>
      )}
    </div>
  )
}
