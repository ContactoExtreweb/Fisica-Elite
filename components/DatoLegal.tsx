// Pinta un dato de las páginas legales. Si todavía no nos lo ha dado el
// cliente, lo resalta en amarillo para que sea imposible publicar la web
// sin verlo.
import { estaPendiente } from '@/lib/legal'

export default function DatoLegal({ valor }: { valor: string | null }) {
  if (!valor) return null
  if (estaPendiente(valor)) {
    return <mark className="legal-pendiente">{valor}</mark>
  }
  return <>{valor}</>
}
