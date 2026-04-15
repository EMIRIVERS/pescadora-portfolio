'use client';

import { useState } from 'react';
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
  { status: 'new',       label: 'Nuevo',      color: '#3b82f6' },
  { status: 'contacted', label: 'Contactado',  color: '#8b5cf6' },
  { status: 'qualified', label: 'Calificado',  color: '#f59e0b' },
  { status: 'proposal',  label: 'Propuesta',   color: '#e8341a' },
  { status: 'won',       label: 'Ganado',      color: '#10b981' },
  { status: 'lost',      label: 'Perdido',     color: '#6b7280' },
];

interface LeadsPipelineProps {
  leads: Lead[];
}

export default function LeadsPipeline({ leads }: LeadsPipelineProps) {
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addPresetStatus, setAddPresetStatus] = useState<Lead['status']>('new');

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
          marginBottom: '20px',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: '#e8e8e8',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              letterSpacing: '0.02em',
            }}
          >
            Pipeline de Leads
          </h2>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '12px',
              color: '#555',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
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
            background: '#e8341a',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            cursor: 'pointer',
            letterSpacing: '0.02em',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#c42a14';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#e8341a';
          }}
        >
          <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
          Nuevo lead
        </button>
      </div>

      {/* Kanban grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 280px)',
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '1rem',
        }}
      >
        {COLUMNS.map((col) => {
          const colLeads = localLeads.filter((l) => l.status === col.status);

          return (
            <div
              key={col.status}
              style={{
                background: '#111',
                border: '1px solid #1a1a1a',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '200px',
                overflow: 'hidden',
              }}
            >
              {/* Column header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderBottom: '1px solid #1a1a1a',
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
                      color: '#e8e8e8',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {col.label}
                  </span>
                </div>

                <span
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #222',
                    color: '#888',
                    borderRadius: '10px',
                    padding: '1px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
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
                }}
              >
                {colLeads.length === 0 && (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#2a2a2a',
                      fontSize: '11px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      letterSpacing: '0.05em',
                      padding: '24px 0',
                    }}
                  >
                    — vacío —
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
                  borderTop: '1px solid #1a1a1a',
                  flexShrink: 0,
                }}
              >
                <button
                  onClick={() => handleColumnAdd(col.status)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: '1px dashed #222',
                    borderRadius: '5px',
                    color: '#444',
                    fontSize: '12px',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
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
                    el.style.borderColor = '#222';
                    el.style.color = '#444';
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
