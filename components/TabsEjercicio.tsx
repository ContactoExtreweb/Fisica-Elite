'use client'

import { useState } from 'react'

type Tab = { clave: string; etiqueta: string; contenido: string | null }

export default function TabsEjercicio({ tabs }: { tabs: Tab[] }) {
  // Solo pestañas con contenido
  const disponibles = tabs.filter((t) => t.contenido && t.contenido.trim())
  const [activa, setActiva] = useState(disponibles[0]?.clave ?? '')

  if (disponibles.length === 0) {
    return (
      <p style={{ color: 'var(--ink-muted)', fontSize: 14 }}>
        Tu preparador aún no ha añadido la descripción de este ejercicio.
      </p>
    )
  }

  const actual = disponibles.find((t) => t.clave === activa) ?? disponibles[0]

  return (
    <>
      <div className="tabs">
        {disponibles.map((t) => (
          <button
            key={t.clave}
            type="button"
            className={`tab ${t.clave === activa ? 'active' : ''}`}
            onClick={() => setActiva(t.clave)}
          >
            {t.etiqueta}
          </button>
        ))}
      </div>
      <div className="contenido-tab">{actual.contenido}</div>
    </>
  )
}
