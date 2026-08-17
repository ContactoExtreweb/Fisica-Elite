'use client'

// Historial de marcas del alumno, agrupado por fecha.
// El botón de borrar solo aparece en sus propios registros (en la vista
// del preparador se pasa `soloLectura`).
import { useState, useTransition } from 'react'
import { borrarMarca } from '@/app/registro/actions'
import {
  textoMarca,
  formateaTiempo,
  fechaRelativa,
  type RegistroFila,
  type Parcial,
} from '@/lib/marcas'

export type CatInfo = { id: string; nombre: string; metrica: string; unidad: string }

export default function HistorialMarcas({
  registros,
  categorias,
  soloLectura = false,
  vacioTexto = 'Todavía no has apuntado ninguna marca.',
}: {
  registros: RegistroFila[]
  categorias: CatInfo[]
  soloLectura?: boolean
  vacioTexto?: string
}) {
  const [borrando, startBorrar] = useTransition()
  const [abierto, setAbierto] = useState<string | null>(null)

  const mapaCat = new Map(categorias.map((c) => [c.id, c]))

  if (registros.length === 0) {
    return <p className="marca-vacio">{vacioTexto}</p>
  }

  // Agrupar por fecha, manteniendo el orden (ya vienen ordenados desc)
  const porFecha = new Map<string, RegistroFila[]>()
  for (const r of registros) {
    if (!porFecha.has(r.fecha)) porFecha.set(r.fecha, [])
    porFecha.get(r.fecha)!.push(r)
  }

  const borrar = (id: string) => {
    if (!confirm('¿Borrar esta marca?')) return
    startBorrar(async () => {
      await borrarMarca(id)
    })
  }

  return (
    <div className="hist">
      {[...porFecha.entries()].map(([fecha, items]) => (
        <div key={fecha} className="hist-dia">
          <div className="hist-fecha">{fechaRelativa(fecha)}</div>
          <div className="hist-items">
            {items.map((r) => {
              const cat = mapaCat.get(r.categoria_id)
              const parciales = (r.series ?? []) as Parcial[]
              const tieneDetalle = parciales.length > 0 || !!r.notas
              return (
                <div key={r.id} className="hist-item">
                  <div className="hist-item-cab">
                    <div className="hist-item-info">
                      <span className="hist-cat">{cat?.nombre ?? 'Ejercicio'}</span>
                      <span className="hist-marca">
                        {textoMarca(r, cat?.metrica ?? 'repeticiones', cat?.unidad ?? '')}
                      </span>
                      {/* En carrera, el tiempo acompaña a la distancia */}
                      {cat?.metrica === 'distancia' && r.tiempo_seg !== null && (
                        <span className="hist-extra">en {formateaTiempo(r.tiempo_seg)}</span>
                      )}
                    </div>
                    <div className="hist-item-acciones">
                      {tieneDetalle && (
                        <button
                          type="button"
                          className="hist-toggle"
                          onClick={() => setAbierto(abierto === r.id ? null : r.id)}
                        >
                          {abierto === r.id ? 'Ocultar' : 'Ver detalle'}
                        </button>
                      )}
                      {!soloLectura && (
                        <button
                          type="button"
                          className="hist-borrar"
                          onClick={() => borrar(r.id)}
                          disabled={borrando}
                          aria-label="Borrar marca"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {abierto === r.id && tieneDetalle && (
                    <div className="hist-detalle">
                      {parciales.length > 0 && (
                        <div className="hist-parciales">
                          {parciales.map((p, i) => (
                            <div key={i} className="hist-parcial">
                              <span>{p.metros} m</span>
                              <strong>{formateaTiempo(p.segundos)}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                      {r.notas && <p className="hist-notas">{r.notas}</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
