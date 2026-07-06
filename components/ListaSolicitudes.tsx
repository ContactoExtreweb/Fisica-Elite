'use client'

// Envuelve la lista de tarjetas y hospeda el modal de credenciales.
// El modal vive AQUÍ (nivel de página), no dentro de la tarjeta, así
// sobrevive aunque la tarjeta procesada desaparezca de la lista.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TarjetaSolicitud, { type Solicitud } from '@/components/TarjetaSolicitud'
import ModalCredenciales from '@/components/ModalCredenciales'
import type { Credenciales } from '@/app/admin/solicitudes/actions'

export default function ListaSolicitudes({ solicitudes }: { solicitudes: Solicitud[] }) {
  const [cred, setCred] = useState<Credenciales | null>(null)
  const router = useRouter()

  return (
    <>
      <div className="solicitudes-lista">
        {solicitudes.map((s) => (
          <TarjetaSolicitud key={s.id} solicitud={s} onCreada={setCred} />
        ))}
      </div>

      {cred && (
        <ModalCredenciales
          cred={cred}
          onCerrar={() => {
            setCred(null)
            router.refresh() // ahora sí: refresca la lista (quita la procesada)
          }}
        />
      )}
    </>
  )
}
