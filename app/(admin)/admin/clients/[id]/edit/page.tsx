import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { EditClientForm } from './edit-client-form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditClientPage({ params }: Props) {
  const { id } = await params
  const db = createServiceClient()

  const { data: client, error } = await db
    .from('clients')
    .select('id, name, email, company')
    .eq('id', id)
    .single()

  if (error || !client) notFound()

  return (
    <div
      style={{
        padding: '40px 32px',
        minHeight: '100%',
        backgroundColor: '#000000',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 600,
            color: '#F5F5F7',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          Editar cliente
        </h1>
        <p
          style={{
            marginTop: '6px',
            fontSize: '13px',
            color: '#86868B',
            letterSpacing: '-0.01em',
          }}
        >
          {client.name}
        </p>
      </div>

      {/* Card */}
      <div
        style={{
          maxWidth: '560px',
          backgroundColor: '#111111',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '28px',
        }}
      >
        <EditClientForm
          id={client.id}
          initialName={client.name}
          initialEmail={client.email ?? ''}
          initialCompany={client.company ?? ''}
        />
      </div>
    </div>
  )
}
