import { redirect } from 'next/navigation'

// El listado de proyectos se renderiza en el dashboard del portal (/portal).
// Si el cliente teclea /portal/projects, lo mandamos ahí.
export default function PortalProjectsIndex() {
  redirect('/portal')
}
