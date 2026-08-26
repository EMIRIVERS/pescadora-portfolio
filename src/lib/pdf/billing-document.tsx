/**
 * src/lib/pdf/billing-document.tsx
 *
 * Documento PDF compartido para FACTURAS y COTIZACIONES (XICO Films).
 * Renderizado en servidor con @react-pdf/renderer (runtime Node, sin navegador).
 * Replica la estética del documento HTML imprimible de /admin/invoices/[id]:
 * filete rojo de marca, encabezado XICO, tabla de conceptos, desglose fiscal CFDI.
 *
 * Una sola plantilla cubre ambos giros; las diferencias (títulos, etiquetas,
 * pie de página) se derivan de `kind`. Las páginas/rutas alimentan este módulo
 * con datos ya normalizados vía `invoiceToPdfData` / `proposalToPdfData`.
 */
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { QuoteLine, FiscalData } from '@/lib/billing/catalog'
import type { TaxBreakdown } from '@/lib/billing/tax'

// ── Marca ────────────────────────────────────────────────────────────────────
const XICO_RED = '#e8341a'
const INK = '#1a1a1a'

export type BillingKind = 'invoice' | 'quote'

/** Forma normalizada que consume el documento PDF. */
export interface BillingPdfData {
  kind: BillingKind
  /** Folio (factura) o referencia generada (cotización). */
  reference: string
  title: string | null
  statusLabel: string
  statusColor: string
  issueDate: string | null
  /** Vencimiento (factura) o validez (cotización). */
  secondaryDate: string | null
  secondaryDateLabel: string
  currency: string
  recipient: { name: string | null; company: string | null; email: string | null }
  projectTitle: string | null
  fiscal: FiscalData | null
  items: QuoteLine[]
  totals: TaxBreakdown
  notes: string | null
}

function fmt(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: INK,
    position: 'relative',
  },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 5, backgroundColor: XICO_RED },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: INK,
    paddingBottom: 20,
    marginBottom: 28,
  },
  brand: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: INK },
  brandRed: { color: XICO_RED },
  brandSub: { fontSize: 9, color: '#555555', marginTop: 3 },
  docTitle: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: INK, textAlign: 'right' },
  docRef: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#333333', textAlign: 'right', marginTop: 3 },
  badge: {
    marginTop: 6,
    alignSelf: 'flex-end',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  metaCol: { width: '48%' },
  label: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#888888', letterSpacing: 1, marginBottom: 5 },
  recipientName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: INK },
  line: { fontSize: 10, color: '#444444', marginTop: 3 },
  fiscalBox: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#e5e5e5' },
  fiscalLine: { fontSize: 9, color: '#555555', marginBottom: 2 },
  dateBlock: { marginBottom: 10, alignItems: 'flex-end' },
  dateValue: { fontSize: 10, color: INK },
  // Tabla
  tHead: { flexDirection: 'row', backgroundColor: INK },
  tHeadCell: { color: '#ffffff', fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5, paddingVertical: 7, paddingHorizontal: 10 },
  tRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e5e5e5' },
  tCell: { fontSize: 9.5, color: INK, paddingVertical: 9, paddingHorizontal: 10 },
  colDesc: { width: '46%' },
  colQty: { width: '14%', textAlign: 'right' },
  colUnit: { width: '20%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  // Totales
  totalsWrap: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14, borderTopWidth: 2, borderTopColor: INK, paddingTop: 12 },
  totals: { width: 240 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, paddingHorizontal: 10 },
  totalsLabel: { fontSize: 9.5, color: '#555555' },
  totalsValue: { fontSize: 9.5, color: '#555555' },
  retLabel: { fontSize: 9.5, color: '#b91c1c' },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: INK,
    marginTop: 4,
    borderLeftWidth: 4,
    borderLeftColor: XICO_RED,
  },
  grandLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  grandValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  notes: { marginTop: 28, padding: 14, backgroundColor: '#f5f5f5', borderLeftWidth: 3, borderLeftColor: INK },
  notesText: { fontSize: 9.5, color: '#333333', lineHeight: 1.5 },
  footer: { marginTop: 36, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#e5e5e5', textAlign: 'center' },
  footerLead: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: INK, textAlign: 'center' },
  footerText: { fontSize: 8.5, color: '#888888', textAlign: 'center', marginTop: 4, lineHeight: 1.4 },
})

export function BillingDocument({ data }: { data: BillingPdfData }) {
  const isInvoice = data.kind === 'invoice'
  const docTitle = isInvoice ? 'FACTURA' : 'COTIZACIÓN'
  const recipientLabel = isInvoice ? 'Facturado a' : 'Cotización para'
  const footerText = isInvoice
    ? 'Términos de pago: 30 días neto a partir de la fecha de emisión. Para consultas sobre esta factura contacte a hola@xicofilms.com'
    : 'Precios en la moneda indicada, sujetos a cambio una vez vencida la validez. Para aceptar esta cotización contacte a hola@xicofilms.com'

  const t = data.totals
  const hasLines = data.items.length > 0

  return (
    <Document title={`${docTitle} ${data.reference}`} author="XICO Films">
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar} fixed />

        {/* Encabezado */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>
              <Text style={styles.brandRed}>XICO</Text> FILMS
            </Text>
            <Text style={styles.brandSub}>Producción audiovisual</Text>
            <Text style={styles.brandSub}>México</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>{docTitle}</Text>
            <Text style={styles.docRef}>{data.reference}</Text>
            <Text
              style={[
                styles.badge,
                { color: data.statusColor, backgroundColor: data.statusColor + '22' },
              ]}
            >
              {data.statusLabel.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Receptor + fechas */}
        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.label}>{recipientLabel.toUpperCase()}</Text>
            {data.recipient.name ? (
              <>
                <Text style={styles.recipientName}>{data.recipient.name}</Text>
                {data.recipient.company ? <Text style={styles.line}>{data.recipient.company}</Text> : null}
                {data.recipient.email ? <Text style={styles.line}>{data.recipient.email}</Text> : null}
              </>
            ) : (
              <Text style={styles.line}>Sin destinatario asignado</Text>
            )}
            {data.projectTitle ? <Text style={styles.line}>Proyecto: {data.projectTitle}</Text> : null}

            {data.fiscal ? (
              <View style={styles.fiscalBox}>
                <Text style={styles.label}>DATOS FISCALES</Text>
                {data.fiscal.razonSocial ? <Text style={styles.fiscalLine}>{data.fiscal.razonSocial}</Text> : null}
                {data.fiscal.rfc ? <Text style={styles.fiscalLine}>RFC: {data.fiscal.rfc}</Text> : null}
                {data.fiscal.regimenFiscal ? <Text style={styles.fiscalLine}>Régimen fiscal: {data.fiscal.regimenFiscal}</Text> : null}
                {data.fiscal.usoCfdi ? <Text style={styles.fiscalLine}>Uso de CFDI: {data.fiscal.usoCfdi}</Text> : null}
                {data.fiscal.codigoPostal ? <Text style={styles.fiscalLine}>Código postal: {data.fiscal.codigoPostal}</Text> : null}
                {data.fiscal.emailFacturacion ? <Text style={styles.fiscalLine}>{data.fiscal.emailFacturacion}</Text> : null}
              </View>
            ) : null}
          </View>

          <View style={styles.metaCol}>
            <View style={styles.dateBlock}>
              <Text style={styles.label}>FECHA DE EMISIÓN</Text>
              <Text style={styles.dateValue}>{fmtDate(data.issueDate)}</Text>
            </View>
            {data.secondaryDate ? (
              <View style={styles.dateBlock}>
                <Text style={styles.label}>{data.secondaryDateLabel.toUpperCase()}</Text>
                <Text style={styles.dateValue}>{fmtDate(data.secondaryDate)}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Conceptos */}
        <View style={styles.tHead}>
          <Text style={[styles.tHeadCell, styles.colDesc]}>Descripción</Text>
          <Text style={[styles.tHeadCell, styles.colQty]}>Cantidad</Text>
          <Text style={[styles.tHeadCell, styles.colUnit]}>Precio unitario</Text>
          <Text style={[styles.tHeadCell, styles.colTotal]}>Total</Text>
        </View>
        {hasLines ? (
          data.items.map((linea) => (
            <View key={linea.id} style={styles.tRow} wrap={false}>
              <Text style={[styles.tCell, styles.colDesc]}>{linea.name}</Text>
              <Text style={[styles.tCell, styles.colQty]}>{linea.qty}</Text>
              <Text style={[styles.tCell, styles.colUnit]}>{fmt(linea.unitPrice, data.currency)}</Text>
              <Text style={[styles.tCell, styles.colTotal, { fontFamily: 'Helvetica-Bold' }]}>
                {fmt(linea.unitPrice * linea.qty, data.currency)}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.tRow} wrap={false}>
            <Text style={[styles.tCell, styles.colDesc]}>
              {data.projectTitle
                ? `Servicios de producción — ${data.projectTitle}`
                : 'Servicios de producción audiovisual'}
            </Text>
            <Text style={[styles.tCell, styles.colQty]}>1</Text>
            <Text style={[styles.tCell, styles.colUnit]}>{fmt(t.total, data.currency)}</Text>
            <Text style={[styles.tCell, styles.colTotal, { fontFamily: 'Helvetica-Bold' }]}>
              {fmt(t.total, data.currency)}
            </Text>
          </View>
        )}

        {/* Totales */}
        <View style={styles.totalsWrap}>
          <View style={styles.totals}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{fmt(t.subtotal, data.currency)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>IVA (16%)</Text>
              <Text style={styles.totalsValue}>{fmt(t.iva, data.currency)}</Text>
            </View>
            {t.retIsr != null ? (
              <View style={styles.totalsRow}>
                <Text style={styles.retLabel}>Ret. ISR (10%)</Text>
                <Text style={styles.retLabel}>- {fmt(t.retIsr, data.currency)}</Text>
              </View>
            ) : null}
            {t.retIva != null ? (
              <View style={styles.totalsRow}>
                <Text style={styles.retLabel}>Ret. IVA (10.666%)</Text>
                <Text style={styles.retLabel}>- {fmt(t.retIva, data.currency)}</Text>
              </View>
            ) : null}
            <View style={styles.grandRow}>
              <Text style={styles.grandLabel}>TOTAL</Text>
              <Text style={styles.grandValue}>{fmt(t.total, data.currency)} {data.currency}</Text>
            </View>
          </View>
        </View>

        {/* Notas */}
        {data.notes ? (
          <View style={styles.notes} wrap={false}>
            <Text style={styles.label}>NOTAS</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        ) : null}

        {/* Pie */}
        <View style={styles.footer}>
          <Text style={styles.footerLead}>Gracias por confiar en nosotros.</Text>
          <Text style={styles.footerText}>{footerText}</Text>
        </View>
      </Page>
    </Document>
  )
}
