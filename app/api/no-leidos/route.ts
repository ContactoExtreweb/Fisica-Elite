// Devuelve el nº de mensajes no leídos del usuario actual.
// Lo consume BadgeNoLeidos para refrescar el contador en vivo.
import { NextResponse } from 'next/server'
import { contarNoLeidos } from '@/lib/no-leidos'

export async function GET() {
  const n = await contarNoLeidos()
  return NextResponse.json({ n })
}
