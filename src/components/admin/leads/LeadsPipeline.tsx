'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import LeadCard from './LeadCard';
import LeadDetailModal from './LeadDetailModal';
import AddLeadModal from './AddLeadModal';

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
  source: 'manual' | 'referral' | 'instagram' | 'web' | 'whatsapp' | 'other';
  notes: string | null;
  budget_range: string | null;
  project_type: string | null;
  assigned_to: string | null;
  last_contacted_at: string | null;
  expected_close_date: string | null;
  converted_to_client_id: string | null;
}

interface Column {
  status: Lead['status'];
  label: string;
  color: string;
}

const COLUMNS: Column[] = [
  { status: 'new',       label: 'Nuevo',      color: '#0071E3' },
  { status: 'contacted', label: 'Contactado',  color: '#BF5AF2' },
  { status: 'qualified', label: 'Calificado',  color: '#FF9F0A' },
  { status: 'proposal',  label: 'Propuesta',   color: '#FF6961' },
  { status: 'won',       label: 'Ganado',      color: '#30D158' },
  { status: 'lost',      label: 'Perdido',     color: '#48484A' },
];

interface LeadsPipelineProps {
  leads: Lead[];
}

export default function LeadsPipeline({ leads }: LeadsPipelineProps) {
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addPresetStatus, setAddPresetStatus] = useState<Lead['status']>('new');

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLocalLeads((prev) => [payload.new as Lead, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setLocalLeads((prev) =>
              prev.map((l) => (l.id === (payload.new as Lead).id ? (payload.new as Lead) : l))
            );
          } else if (payload.eventType === 'DELETE') {
            setLocalLeads((prev) =>
              prev.filter((l) => l.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function handleCardClick(lead: Lead) {
    setSelectedLead(lead);
  }

  function handleStatusChange(leadId: string, newStatus: Lead['status']) {
    setLocalLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, status: newStatus, updated_at: new Date().toISOString() }
          : l
      )
    );
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) =>
        prev ? { ...prev, status: newStatus, updated_at: new Date().toISOString() } : prev
      );
    }
  }

  function handleLeadUpdate(updated: Lead) {
    setLocalLeads((prev) =>
      prev.map((l) => (l.id === updated.id ? updated : l))
    );
    setSelectedLead(updated);
  }

  function handleAddLead(lead: Lead) {
    setLocalLeads((prev) => [lead, ...prev]);
    setShowAdd(false);
  }

  function handleDeleteLead(leadId: string) {
    setLocalLeads((prev) => prev.filter((l) => l.id !== leadId));
    setSelectedLead(null);
  }

  function handleColumnAdd(status: Lead['status']) {
    setAddPresetStatus(status);
    setShowAdd(true);
  }

  return (
    <>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 600,
              color: '#F5F5F7',
              letterSpacing: '-0.01em',
            }}
          >
            Pipeline de Leads
          </h2>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '13px',
              color: '#86868B',
            }}
          >
            {localLeads.length} lead{localLeads.length !== 1 ? 's' : ''} en total
          </p>
        </div>

        <button
          onClick={() => {
            setAddPresetStatus('new');
            setShowAdd(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#0071E3',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
            cursor: 'pointer',
            letterSpacing: '-0.01em',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#0062C4';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#0071E3';
          }}
        >
          <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
          Nuevo Lead
        </button>
      </div>

      {/* Kanban grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 260px)',
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '20px',
        }}
      >
        {COLUMNS.map((col) => {
          const colLeads = localLeads.filter((l) => l.status === col.status);

          return (
            <div
              key={col.status}
              style={{
                background: '#111111',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '200px',
                overflow: 'hidden',
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
              }}
            >
              {/* Column header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: col.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#F5F5F7',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {col.label}
                  </span>
                </div>

                <span
                  style={{
                    background: '#1C1C1E',
                    color: '#86868B',
                    borderRadius: '10px',
                    padding: '1px 8px',
                    fontSize: '11px',
                    fontWeight: 500,
                    minWidth: '22px',
                    textAlign: 'center',
                  }}
                >
                  {colLeads.length}
                </span>
              </div>

              {/* Cards area */}
              <div
                style={{
                  flex: 1,
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  overflowY: 'auto',
                  maxHeight: '70vh',
                }}
              >
                {colLeads.length === 0 && (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#2C2C2E',
                      fontSize: '11px',
                      letterSpacing: '0.05em',
                      padding: '24px 0',
                    }}
                  >
                    — vacio —
                  </div>
                )}

                {colLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    accentColor={col.color}
                    onClick={() => handleCardClick(lead)}
                  />
                ))}
              </div>

              {/* Add button at column bottom */}
              <div
                style={{
                  padding: '8px 10px',
                  flexShrink: 0,
                }}
              >
                <button
                  onClick={() => handleColumnAdd(col.status)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#48484A',
                    fontSize: '12px',
                    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
                    padding: '6px',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s, color 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.borderColor = col.color;
                    el.style.color = col.color;
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLButtonElement;
                    el.style.borderColor = 'rgba(255,255,255,0.1)';
                    el.style.color = '#48484A';
                  }}
                >
                  <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span>
                  agregar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onStatusChange={handleStatusChange}
          onUpdate={handleLeadUpdate}
          onDelete={handleDeleteLead}
        />
      )}

      {/* Add lead modal */}
      {showAdd && (
        <AddLeadModal
          defaultStatus={addPresetStatus}
          onClose={() => setShowAdd(false)}
          onCreated={handleAddLead}
        />
      )}
    </>
  );
}
