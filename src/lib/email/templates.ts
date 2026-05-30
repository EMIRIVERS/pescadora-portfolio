// ---------------------------------------------------------------------------
// Email HTML Templates — XICO Films
// All templates use inline styles for broad email client compatibility.
// ---------------------------------------------------------------------------

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://xicofilms.com'

/** Escapes user/DB-derived values before interpolating them into email HTML. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// ---------------------------------------------------------------------------
// Shared layout helpers
// ---------------------------------------------------------------------------

function baseWrapper(body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>XICO Films</title>
</head>
<body style="margin:0;padding:0;background-color:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#050505;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">
          ${header()}
          <tr>
            <td style="background-color:#111111;border:1px solid #222222;border-top:none;border-radius:0 0 12px 12px;padding:32px 40px;">
              ${body}
            </td>
          </tr>
          ${footer()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function header(): string {
  return `<tr>
    <td style="background-color:#111111;border:1px solid #222222;border-bottom:1px solid #1a1a1a;border-radius:12px 12px 0 0;padding:32px 40px 24px;text-align:center;">
      <span style="font-size:22px;font-weight:700;letter-spacing:0.2em;color:#ffffff;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">XICO FILMS</span>
    </td>
  </tr>`
}

function footer(): string {
  return `<tr>
    <td style="padding:24px 40px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#555555;letter-spacing:0.05em;">
        XICO Films &middot; <a href="https://xicofilms.com" style="color:#555555;text-decoration:none;">xicofilms.com</a>
      </p>
    </td>
  </tr>`
}

function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="border-radius:8px;background-color:#0071E3;">
        <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.02em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${label}</a>
      </td>
    </tr>
  </table>`
}

function divider(): string {
  return `<tr><td style="height:1px;background-color:#222222;margin:24px 0;font-size:0;line-height:0;">&nbsp;</td></tr>`
}

function sectionTitle(text: string): string {
  return `<p style="margin:0 0 16px;font-size:11px;font-weight:600;letter-spacing:0.15em;color:#555555;text-transform:uppercase;">${text}</p>`
}

function bodyText(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#cccccc;">${text}</p>`
}

// ---------------------------------------------------------------------------
// 1. Lead welcome — sent to the lead when they submit the quote form
// ---------------------------------------------------------------------------

export function leadWelcomeTemplate(name: string, projectType: string | null): string {
  const typeLabel = projectType ? ` para <strong style="color:#ffffff;">${esc(projectType)}</strong>` : ''

  const body = `
    ${sectionTitle('Confirmacion de solicitud')}
    ${bodyText(`Hola <strong style="color:#ffffff;">${esc(name)}</strong>,`)}
    ${bodyText(`Recibimos tu solicitud de cotizacion${typeLabel}. Nuestro equipo la revisara y se pondra en contacto contigo en menos de <strong style="color:#ffffff;">24 horas habiles</strong>.`)}
    ${bodyText('Mientras tanto, si tienes algun detalle adicional que quieras compartir, puedes responder directamente a este correo.')}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      ${divider()}
    </table>
    ${bodyText('Gracias por confiar en nosotros.')}
    <p style="margin:0;font-size:15px;line-height:1.6;color:#cccccc;">El equipo de <strong style="color:#ffffff;">XICO Films</strong></p>
  `
  return baseWrapper(body)
}

// ---------------------------------------------------------------------------
// 2. Admin notification — sent to the team when a new lead arrives
// ---------------------------------------------------------------------------

export interface LeadNotifyData {
  name: string
  email: string | null
  phone: string | null
  company: string | null
  project_type: string | null
  budget_range: string | null
  notes: string | null
  source: string
}

function leadRow(label: string, value: string | null): string {
  if (!value) return ''
  return `<tr>
    <td style="padding:10px 16px;font-size:12px;font-weight:600;letter-spacing:0.08em;color:#888888;text-transform:uppercase;width:140px;vertical-align:top;border-bottom:1px solid #1a1a1a;">${label}</td>
    <td style="padding:10px 16px;font-size:14px;color:#dddddd;border-bottom:1px solid #1a1a1a;word-break:break-word;">${esc(value)}</td>
  </tr>`
}

export function leadAdminNotifyTemplate(lead: LeadNotifyData): string {
  const dashboardUrl = `${SITE_URL}/admin/leads`

  const tableRows = [
    leadRow('Nombre', lead.name),
    leadRow('Email', lead.email),
    leadRow('Telefono', lead.phone),
    leadRow('Empresa', lead.company),
    leadRow('Tipo de proyecto', lead.project_type),
    leadRow('Presupuesto', lead.budget_range),
    leadRow('Fuente', lead.source),
    leadRow('Notas', lead.notes),
  ].join('')

  const body = `
    ${sectionTitle('Nuevo lead recibido')}
    ${bodyText(`Ha llegado una nueva solicitud de cotizacion. Aqui estan los detalles:`)}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #222222;border-radius:8px;overflow:hidden;margin:0 0 24px;">
      ${tableRows}
    </table>
    ${ctaButton('Ver lead en dashboard', dashboardUrl)}
  `
  return baseWrapper(body)
}

// ---------------------------------------------------------------------------
// 3. Lead status update — sent to the lead when status changes to qualified/proposal
// ---------------------------------------------------------------------------

function statusMessage(name: string, newStatus: string): string {
  if (newStatus === 'qualified') {
    return `
      ${bodyText(`Hola <strong style="color:#ffffff;">${esc(name)}</strong>,`)}
      ${bodyText('Tenemos buenas noticias. Tu solicitud ha sido revisada y tu proyecto es exactamente el tipo de trabajo que nos apasiona.')}
      ${bodyText('Un miembro de nuestro equipo se comunicara contigo muy pronto para agendar una llamada y profundizar en los detalles.')}
      ${bodyText('Gracias por tu paciencia, estamos emocionados de conocer mas sobre tu vision.')}
    `
  }
  if (newStatus === 'proposal') {
    return `
      ${bodyText(`Hola <strong style="color:#ffffff;">${esc(name)}</strong>,`)}
      ${bodyText('Hemos preparado una propuesta personalizada para tu proyecto. La recibiras en detalle en los proximos momentos.')}
      ${bodyText('Tomatelo con calma, revisa cada punto y no dudes en contactarnos con cualquier pregunta o ajuste.')}
      ${bodyText('Estamos comprometidos a que esto quede exactamente como lo imaginas.')}
    `
  }
  return bodyText(`Tu solicitud ha avanzado al estado: <strong style="color:#ffffff;">${esc(newStatus)}</strong>. Pronto estaremos en contacto.`)
}

export function leadStatusUpdateTemplate(name: string, newStatus: string): string {
  const body = `
    ${sectionTitle('Actualizacion de tu solicitud')}
    ${statusMessage(name, newStatus)}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      ${divider()}
    </table>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#cccccc;">El equipo de <strong style="color:#ffffff;">XICO Films</strong></p>
  `
  return baseWrapper(body)
}

// ---------------------------------------------------------------------------
// 4. Project started — sent to the client when their project is created
// ---------------------------------------------------------------------------

export function projectStartedTemplate(clientName: string, projectTitle: string): string {
  const portalUrl = `${SITE_URL}/portal`

  const body = `
    ${sectionTitle('Tu proyecto ha comenzado')}
    ${bodyText(`Hola <strong style="color:#ffffff;">${esc(clientName)}</strong>,`)}
    ${bodyText(`Nos complace informarte que tu proyecto <strong style="color:#ffffff;">${esc(projectTitle)}</strong> ha dado inicio oficialmente.`)}
    ${bodyText('Desde el portal de clientes podras hacer seguimiento a cada etapa del proceso: desde la pre-produccion hasta la entrega final.')}
    ${bodyText('Nos estaremos comunicando contigo en cada avance importante. Gracias por ser parte de este proyecto.')}
    ${ctaButton('Ver mi proyecto', portalUrl)}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      ${divider()}
    </table>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#cccccc;">El equipo de <strong style="color:#ffffff;">XICO Films</strong></p>
  `
  return baseWrapper(body)
}

// ---------------------------------------------------------------------------
// 5. Project status update — sent to client when project status changes
// ---------------------------------------------------------------------------

function projectStatusMessage(status: string): string {
  switch (status) {
    case 'pre_production':
      return bodyText('Tu proyecto se encuentra en la fase de <strong style="color:#ffffff;">pre-produccion</strong>. Estamos afinando los detalles, la planeacion y la logistica para asegurarnos de que todo salga perfecto.')
    case 'production':
      return bodyText('Tu proyecto ha entrado en fase de <strong style="color:#ffffff;">produccion</strong>. El equipo esta en accion: grabando, capturando y dando vida a tu vision.')
    case 'post_production':
      return bodyText('Tu proyecto esta en <strong style="color:#ffffff;">post-produccion</strong>. El equipo de edicion esta trabajando en los detalles finales: color, sonido y efectos para entregar algo que supere tus expectativas.')
    case 'delivered':
      return bodyText('Tu proyecto ha sido <strong style="color:#ffffff;">entregado</strong>. Fue un placer trabajar contigo. Revisa el material en tu portal y haznos saber si tienes algun comentario.')
    default:
      return bodyText(`El estado de tu proyecto ha cambiado a: <strong style="color:#ffffff;">${esc(status)}</strong>.`)
  }
}

export function projectStatusUpdateTemplate(
  clientName: string,
  projectTitle: string,
  status: string
): string {
  const portalUrl = `${SITE_URL}/portal`

  const body = `
    ${sectionTitle('Actualizacion de proyecto')}
    ${bodyText(`Hola <strong style="color:#ffffff;">${esc(clientName)}</strong>,`)}
    ${bodyText(`Hay novedades sobre tu proyecto <strong style="color:#ffffff;">${esc(projectTitle)}</strong>:`)}
    <div style="background-color:#0a0a0a;border:1px solid #222222;border-left:3px solid #0071E3;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;">
      ${projectStatusMessage(status)}
    </div>
    ${ctaButton('Ver mi proyecto', portalUrl)}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
      ${divider()}
    </table>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#cccccc;">El equipo de <strong style="color:#ffffff;">XICO Films</strong></p>
  `
  return baseWrapper(body)
}

// ---------------------------------------------------------------------------
// 6. Deadline reminder — sent to admin team with upcoming project deadlines
// ---------------------------------------------------------------------------

export interface DeadlineProject {
  title: string
  clientName: string
  daysLeft: number
  endDate: string
}

function urgencyColor(daysLeft: number): string {
  if (daysLeft <= 1) return '#FF3B30'
  if (daysLeft <= 3) return '#FF9500'
  return '#30D158'
}

function deadlineRow(project: DeadlineProject): string {
  const color = urgencyColor(project.daysLeft)
  const daysLabel = project.daysLeft === 0
    ? 'Hoy'
    : project.daysLeft === 1
      ? '1 dia'
      : `${project.daysLeft} dias`

  return `<tr>
    <td style="padding:14px 16px;border-bottom:1px solid #1a1a1a;vertical-align:top;">
      <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#ffffff;">${esc(project.title)}</p>
      <p style="margin:0;font-size:12px;color:#888888;">${esc(project.clientName)}</p>
    </td>
    <td style="padding:14px 16px;border-bottom:1px solid #1a1a1a;vertical-align:top;text-align:center;">
      <p style="margin:0;font-size:12px;color:#888888;">${esc(project.endDate)}</p>
    </td>
    <td style="padding:14px 16px;border-bottom:1px solid #1a1a1a;vertical-align:top;text-align:right;">
      <span style="display:inline-block;padding:4px 10px;border-radius:20px;background-color:${color}22;color:${color};font-size:12px;font-weight:600;">${daysLabel}</span>
    </td>
  </tr>`
}

export function deadlineReminderTemplate(
  projects: Array<DeadlineProject>
): string {
  const dashboardUrl = `${SITE_URL}/admin/leads`

  const projectRows = projects.map(deadlineRow).join('')

  const body = `
    ${sectionTitle('Recordatorio de entregas proximas')}
    ${bodyText(`Hay <strong style="color:#ffffff;">${projects.length} proyecto${projects.length !== 1 ? 's' : ''}</strong> con entrega en menos de 7 dias:`)}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #222222;border-radius:8px;overflow:hidden;margin:0 0 24px;">
      <tr style="background-color:#0a0a0a;">
        <th style="padding:10px 16px;font-size:11px;font-weight:600;letter-spacing:0.1em;color:#555555;text-transform:uppercase;text-align:left;">Proyecto</th>
        <th style="padding:10px 16px;font-size:11px;font-weight:600;letter-spacing:0.1em;color:#555555;text-transform:uppercase;text-align:center;">Fecha limite</th>
        <th style="padding:10px 16px;font-size:11px;font-weight:600;letter-spacing:0.1em;color:#555555;text-transform:uppercase;text-align:right;">Tiempo restante</th>
      </tr>
      ${projectRows}
    </table>
    ${ctaButton('Ver proyectos', dashboardUrl)}
  `
  return baseWrapper(body)
}
