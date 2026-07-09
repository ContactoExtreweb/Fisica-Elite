// Layout compartido de la web pública: cabecera + pie en todas las páginas
// del grupo (publica). No afecta al área de alumno ni al panel de admin,
// que tienen su propio layout.
import HeaderPublico from '@/components/HeaderPublico'
import FooterPublico from '@/components/FooterPublico'

export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <div className="pub">
      <HeaderPublico />
      <main className="pub-main">{children}</main>
      <FooterPublico />
    </div>
  )
}
