// Shell común de las páginas legales: misma cabecera y pie que el resto
// de la web pública (NavPublica + FooterPublico), como el resto de páginas públicas.
import NavPublica from '@/components/NavPublica'
import FooterPublico from '@/components/FooterPublico'

export default function LayoutLegal({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavPublica />
      <main className="pub">
        <div className="legal">{children}</div>
      </main>
      <FooterPublico />
    </>
  )
}
