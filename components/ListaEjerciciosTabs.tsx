'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export type EjercicioItem = {
  id: string
  slug: string
  titulo: string
  descripcion: string | null
  nivel: string
  nFaqs: number
  completado: boolean
}

const NIVELES_ORDEN = ['iniciado', 'avanzado', 'profesional'] as const
const NOMBRE_NIVEL: Record<string, string> = {
  iniciado: 'Iniciado',
  avanzado: 'Avanzado',
  profesional: 'Profesional',
}

export default function ListaEjerciciosTabs({
  ejercicios,
  nivelAlumno,
}: {
  ejercicios: EjercicioItem[]
  nivelAlumno: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Niveles desbloqueados presentes en la lista
  const rangoAlumno = NIVELES_ORDEN.indexOf(nivelAlumno as (typeof NIVELES_ORDEN)[number])
  const nivelesDisponibles = NIVELES_ORDEN.filter((n, i) => {
    const hay = ejercicios.some((e) => e.nivel === n)
    return hay && (rangoAlumno < 0 || i <= rangoAlumno)
  })
  const mostrarTabs = nivelesDisponibles.length > 1

  // La pestaña activa vive en la URL (?nivel=...), así se mantiene al
  // entrar a una clase y volver atrás. Por defecto, "todos".
  const tabURL = searchParams.get('nivel') ?? 'todos'
  const tab = tabURL !== 'todos' && nivelesDisponibles.includes(tabURL as (typeof NIVELES_ORDEN)[number])
    ? tabURL
    : 'todos'

  const [busqueda, setBusqueda] = useState('')

  const cambiarTab = (nuevo: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (nuevo === 'todos') params.delete('nivel')
    else params.set('nivel', nuevo)
    // scroll: false para no saltar arriba; replace para no llenar el historial
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  // Filtrado: por pestaña y por texto de búsqueda
  const termino = busqueda.trim().toLowerCase()
  const visibles = ejercicios
    .filter((e) => (tab === 'todos' ? true : e.nivel === tab))
    .filter((e) => (termino ? e.titulo.toLowerCase().includes(termino) : true))

  return (
    <>
      {/* Buscador */}
      <div className="ej-buscador">
        <svg className="ej-buscador-lupa" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar un ejercicio por nombre…"
        />
        {busqueda && (
          <button type="button" className="ej-buscador-limpiar" onClick={() => setBusqueda('')} aria-label="Limpiar">
            ✕
          </button>
        )}
      </div>

      {mostrarTabs && (
        <div className="ej-tabs">
          <button type="button" className={`ej-tab ${tab === 'todos' ? 'activo' : ''}`} onClick={() => cambiarTab('todos')}>
            Todos
          </button>
          {nivelesDisponibles.map((n) => (
            <button key={n} type="button" className={`ej-tab ${tab === n ? 'activo' : ''}`} onClick={() => cambiarTab(n)}>
              {NOMBRE_NIVEL[n]}
            </button>
          ))}
        </div>
      )}

      <div className="ex-list">
        {visibles.length === 0 ? (
          <div className="admin-tabla-vacia">
            {termino ? `No hay ejercicios que coincidan con "${busqueda}".` : 'No hay ejercicios en este nivel.'}
          </div>
        ) : (
          visibles.map((e) => (
            <Link
              key={e.id}
              href={`/ejercicio/${e.slug}?nivel=${tab}`}
              className={`ex-list-row ${e.completado ? 'completado' : ''}`}
              style={{ cursor: 'pointer' }}
            >
              <div className={`ex-thumb ${e.completado ? 'hecho' : ''}`}>
                {e.completado && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div>
                <div className="ex-list-name">{e.titulo}</div>
                <div className="ex-list-meta">
                  {e.descripcion
                    ? e.descripcion.length > 90
                      ? e.descripcion.slice(0, 90) + '…'
                      : e.descripcion
                    : 'Sin descripción'}
                  {e.nFaqs > 0 && ` · ${e.nFaqs} pregunta${e.nFaqs === 1 ? '' : 's'} frecuente${e.nFaqs === 1 ? '' : 's'}`}
                </div>
              </div>
              <span className={`tag ${e.nivel}`}>{e.nivel}</span>
            </Link>
          ))
        )}
      </div>
    </>
  )
}
