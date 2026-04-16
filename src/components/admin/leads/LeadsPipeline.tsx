'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { createClient } from '@/lib/supabase/client';
import { updateLeadStatus } from '@/lib/actions/leads';
import LeadCard from './LeadCard';
import LeadDetailModal from './LeadDetailModal';
import AddLeadModal from './AddLeadModal';
import type { LeadStatus } from '@/lib/supabase/types';
import { LEAD_STATUS_STYLES } from '@/lib/status-colors';

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: LeadStatus;
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
  status: LeadStatus;
  label: string;
  color: string;
}

const COLUMNS: Column[] = [
  { status: 'new',       label: LEAD_STATUS_STYLES['new'].label,       color: LEAD_STATUS_STYLES['new'].color       },
  { status: 'contacted', label: LEAD_STATUS_STYLES['contacted'].label,  color: LEAD_STATUS_STYLES['contacted'].color },
  { status: 'qualified', label: LEAD_STATUS_STYLES['qualified'].label,  color: LEAD_STATUS_STYLES['qualified'].color },
  { status: 'proposal',  label: LEAD_STATUS_STYLES['proposal'].label,   color: LEAD_STATUS_STYLES['proposal'].color  },
  { status: 'won',       label: LEAD_STATUS_STYLES['won'].label,        color: LEAD_STATUS_STYLES['won'].color       },
  { status: 'lost',      label: LEAD_STATUS_STYLES['lost'].label,       color: LEAD_STATUS_STYLES['lost'].color      },
];

// ── Filter types ─────────────────────────────────────────────────────────────

type FilterSource = 'all' | 'web' | 'referral' | 'instagram' | 'whatsapp' | 'manual' | 'other';
type FilterBudget = 'all' | 'none' | 'lt10k' | '10k-50k' | '50k-100k' | 'gt100k';
type FilterAge   = 'all' | 'plus3' | 'plus7' | 'plus14';

const SOURCE_LABELS_FILTER: Record<FilterSource, string> = {
  all:       'Todos los orígenes',
  web:       'Web',
  referral:  'Referido',
  instagram: 'Instagram',
  whatsapp:  'WhatsApp',
  manual:    'Manual',
  other:     'Otro',
};

const BUDGET_LABELS: Record<FilterBudget, string> = {
  all:       'Todos los budgets',
  none:      'Sin definir',
  lt10k:     '< $10k',
  '10k-50k': '$10k–$50k',
  '50k-100k':'$50k–$100k',
  gt100k:    '> $100k',
};

const AGE_LABELS: Record<FilterAge, string> = {
  all:    'Todos (sin contactar)',
  plus3:  'Sin contactar +3 días',
  plus7:  'Sin contactar +7 días',
  plus14: 'Sin contactar +14 días',
};

// ── Budget range matching ─────────────────────────────────────────────────────

function parseBudgetNumber(raw: string): number | null {
  // Try to extract first number from the string, remove $, commas, k/K suffix
  const clean = raw.replace(/[$,\s]/g, '').toLowerCase();
  const kMatch = clean.match(/^(\d+(?:\.\d+)?)k/);
  if (kMatch) return parseFloat(kMatch[1]) * 1000;
  const numMatch = clean.match(/^(\d+(?:\.\d+)?)/);
  if (numMatch) return parseFloat(numMatch[1]);
  return null;
}

function budgetMatchesFilter(budgetRaw: string | null, filter: FilterBudget): boolean {
  if (filter === 'all') return true;
  if (filter === 'none') return budgetRaw === null || budgetRaw.trim() === '';
  if (budgetRaw === null || budgetRaw.trim() === '') return false;

  const num = parseBudgetNumber(budgetRaw);
  if (num === null) return false;

  switch (filter) {
    case 'lt10k':     return num < 10_000;
    case '10k-50k':   return num >= 10_000 && num <= 50_000;
    case '50k-100k':  return num > 50_000 && num <= 100_000;
    case 'gt100k':    return num > 100_000;
    default:          return true;
  }
}

// ── Days since last contact ───────────────────────────────────────────────────

function daysSinceContact(lead: Lead): number {
  const ref = lead.last_contacted_at ?? lead.created_at;
  const diffMs = Date.now() - new Date(ref).getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

// ── Shared input/select style ─────────────────────────────────────────────────

const CONTROL_STYLE: React.CSSProperties = {
  background: '#1C1C1E',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#F5F5F7',
  fontSize: '13px',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
  padding: '7px 12px',
  outline: 'none',
  transition: 'border-color 0.15s',
};

interface LeadsPipelineProps {
  leads: Lead[];
}

// ── FilterChip ────────────────────────────────────────────────────────────────

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'rgba(0,113,227,0.15)',
        color: '#0071E3',
        border: '1px solid rgba(0,113,227,0.3)',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 500,
        padding: '2px 8px 2px 8px',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
        letterSpacing: '-0.01em',
      }}
    >
      {label}
      <button
        onClick={onRemove}
        aria-label={`Quitar filtro ${label}`}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#0071E3',
          padding: '0 0 0 2px',
          lineHeight: 1,
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        &times;
      </button>
    </span>
  );
}

// ── DroppableColumn ──────────────────────────────────────────────────────────

interface DroppableColumnProps {
  col: Column;
  colLeads: Lead[];
  onCardClick: (lead: Lead) => void;
  onColumnAdd: (status: LeadStatus) => void;
}

function DroppableColumn({ col, colLeads, onCardClick, onColumnAdd }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: col.status });

  return (
    <div
      style={{
        background: isOver ? `${col.color}0D` : '#111111',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '200px',
        overflow: 'hidden',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
        outline: isOver ? `1px solid ${col.color}4D` : '1px solid transparent',
        transition: 'outline 0.15s, background 0.15s',
      } as React.CSSProperties}
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

      {/* Cards area — this is the actual droppable zone */}
      <div
        ref={setNodeRef}
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
          <DraggableLeadCard
            key={lead.id}
            lead={lead}
            accentColor={col.color}
            onClick={() => onCardClick(lead)}
          />
        ))}
      </div>

      {/* Add button at column bottom */}
      <div style={{ padding: '8px 10px', flexShrink: 0 }}>
        <button
          onClick={() => onColumnAdd(col.status)}
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
}

// ── DraggableLeadCard ────────────────────────────────────────────────────────

interface DraggableLeadCardProps {
  lead: Lead;
  accentColor: string;
  onClick: () => void;
}

function DraggableLeadCard({ lead, accentColor, onClick }: DraggableLeadCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: transform
          ? `translate(${transform.x}px, ${transform.y}px)`
          : undefined,
        opacity: isDragging ? 0.45 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging ? 1000 : undefined,
        position: isDragging ? 'relative' : undefined,
        transition: isDragging ? undefined : 'opacity 0.15s',
        touchAction: 'none',
      }}
    >
      <LeadCard lead={lead} accentColor={accentColor} onClick={onClick} />
    </div>
  );
}

// ── LeadsPipeline ────────────────────────────────────────────────────────────

export default function LeadsPipeline({ leads }: LeadsPipelineProps) {
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addPresetStatus, setAddPresetStatus] = useState<LeadStatus>('new');
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  // ── Filter state ────────────────────────────────────────────────────────────
  const [searchRaw, setSearchRaw]       = useState('');
  const [search, setSearch]             = useState('');
  const [filterSource, setFilterSource] = useState<FilterSource>('all');
  const [filterBudget, setFilterBudget] = useState<FilterBudget>('all');
  const [filterAge, setFilterAge]       = useState<FilterAge>('all');

  // debounce 200ms
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((val: string) => {
    setSearchRaw(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 200);
  }, []);

  // ── Filtered leads (client-side) ────────────────────────────────────────────
  const filteredLeads = useMemo<Lead[]>(() => {
    return localLeads.filter((lead) => {
      // search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName    = lead.name.toLowerCase().includes(q);
        const matchEmail   = lead.email?.toLowerCase().includes(q) ?? false;
        const matchType    = lead.project_type?.toLowerCase().includes(q) ?? false;
        if (!matchName && !matchEmail && !matchType) return false;
      }
      // source
      if (filterSource !== 'all' && lead.source !== filterSource) return false;
      // budget
      if (!budgetMatchesFilter(lead.budget_range, filterBudget)) return false;
      // age without contact
      if (filterAge !== 'all') {
        const days = daysSinceContact(lead);
        const threshold = filterAge === 'plus3' ? 3 : filterAge === 'plus7' ? 7 : 14;
        if (days < threshold) return false;
      }
      return true;
    });
  }, [localLeads, search, filterSource, filterBudget, filterAge]);

  const hasActiveFilters = search.trim() !== '' || filterSource !== 'all' || filterBudget !== 'all' || filterAge !== 'all';

  // dnd-kit sensors — distance:8 lets normal clicks through
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function handleDragStart({ active }: DragStartEvent) {
    const found = localLeads.find((l) => l.id === active.id);
    setActiveLead(found ?? null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveLead(null);

    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as LeadStatus;
    const lead = localLeads.find((l) => l.id === leadId);

    if (!lead || lead.status === newStatus) return;

    // Verify newStatus is a valid column id
    const validStatuses = COLUMNS.map((c) => c.status);
    if (!validStatuses.includes(newStatus)) return;

    const previousStatus = lead.status;

    // Optimistic update
    setLocalLeads((prev) =>
      prev.map((l) =>
        l.id === leadId
          ? { ...l, status: newStatus, updated_at: new Date().toISOString() }
          : l
      )
    );

    // Keep selected modal in sync
    if (selectedLead?.id === leadId) {
      setSelectedLead((prev) =>
        prev ? { ...prev, status: newStatus, updated_at: new Date().toISOString() } : prev
      );
    }

    // Server action with rollback on failure
    updateLeadStatus(leadId, newStatus).then((result) => {
      if (result.error) {
        setLocalLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? { ...l, status: previousStatus }
              : l
          )
        );
        if (selectedLead?.id === leadId) {
          setSelectedLead((prev) =>
            prev ? { ...prev, status: previousStatus } : prev
          );
        }
      }
    });
  }

  // ── Other handlers ─────────────────────────────────────────────────────────

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

  function handleColumnAdd(status: LeadStatus) {
    setAddPresetStatus(status);
    setShowAdd(true);
  }

  // Resolve accent color for the drag overlay ghost card
  const activeCol = activeLead
    ? COLUMNS.find((c) => c.status === activeLead.status)
    : null;

  return (
    <>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
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

      {/* ── Search + filter bar ─────────────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: '#0A0A0A',
          paddingBottom: '12px',
          marginBottom: '12px',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
        }}
      >
        {/* Row 1: search + selects + counter */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          {/* Search input */}
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px', maxWidth: '320px' }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: '#48484A',
              }}
            >
              <circle cx="6.5" cy="6.5" r="5" stroke="#48484A" strokeWidth="1.5" />
              <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="#48484A" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={searchRaw}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar lead..."
              style={{
                ...CONTROL_STYLE,
                width: '100%',
                paddingLeft: '32px',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,113,227,0.5)'; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
            />
          </div>

          {/* Source select */}
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as FilterSource)}
            style={{ ...CONTROL_STYLE, cursor: 'pointer', appearance: 'none' as const, paddingRight: '28px',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2386868B' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
            }}
          >
            {(Object.keys(SOURCE_LABELS_FILTER) as FilterSource[]).map((k) => (
              <option key={k} value={k} style={{ background: '#1C1C1E' }}>
                {SOURCE_LABELS_FILTER[k]}
              </option>
            ))}
          </select>

          {/* Budget select */}
          <select
            value={filterBudget}
            onChange={(e) => setFilterBudget(e.target.value as FilterBudget)}
            style={{ ...CONTROL_STYLE, cursor: 'pointer', appearance: 'none' as const, paddingRight: '28px',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2386868B' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
            }}
          >
            {(Object.keys(BUDGET_LABELS) as FilterBudget[]).map((k) => (
              <option key={k} value={k} style={{ background: '#1C1C1E' }}>
                {BUDGET_LABELS[k]}
              </option>
            ))}
          </select>

          {/* Age without contact select */}
          <select
            value={filterAge}
            onChange={(e) => setFilterAge(e.target.value as FilterAge)}
            style={{ ...CONTROL_STYLE, cursor: 'pointer', appearance: 'none' as const, paddingRight: '28px',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2386868B' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
            }}
          >
            {(Object.keys(AGE_LABELS) as FilterAge[]).map((k) => (
              <option key={k} value={k} style={{ background: '#1C1C1E' }}>
                {AGE_LABELS[k]}
              </option>
            ))}
          </select>

          {/* Counter */}
          <span
            style={{
              fontSize: '12px',
              color: '#48484A',
              marginLeft: 'auto',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Mostrando {filteredLeads.length} de {localLeads.length} leads
          </span>
        </div>

        {/* Row 2: active filter chips */}
        {hasActiveFilters && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap',
              marginTop: '8px',
            }}
          >
            {search.trim() !== '' && (
              <FilterChip
                label={`"${search.trim()}"`}
                onRemove={() => { setSearchRaw(''); setSearch(''); }}
              />
            )}
            {filterSource !== 'all' && (
              <FilterChip
                label={SOURCE_LABELS_FILTER[filterSource]}
                onRemove={() => setFilterSource('all')}
              />
            )}
            {filterBudget !== 'all' && (
              <FilterChip
                label={BUDGET_LABELS[filterBudget]}
                onRemove={() => setFilterBudget('all')}
              />
            )}
            {filterAge !== 'all' && (
              <FilterChip
                label={AGE_LABELS[filterAge]}
                onRemove={() => setFilterAge('all')}
              />
            )}
            <button
              onClick={() => {
                setSearchRaw(''); setSearch('');
                setFilterSource('all');
                setFilterBudget('all');
                setFilterAge('all');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#48484A',
                fontSize: '11px',
                cursor: 'pointer',
                padding: '2px 4px',
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#86868B'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#48484A'; }}
            >
              Limpiar todo
            </button>
          </div>
        )}
      </div>

      {/* Kanban grid wrapped in DndContext */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
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
            const colLeads = filteredLeads.filter((l) => l.status === col.status);
            return (
              <DroppableColumn
                key={col.status}
                col={col}
                colLeads={colLeads}
                onCardClick={handleCardClick}
                onColumnAdd={handleColumnAdd}
              />
            );
          })}
        </div>

        {/* Drag overlay — ghost card that follows the pointer */}
        <DragOverlay dropAnimation={null}>
          {activeLead ? (
            <div
              style={{
                transform: 'rotate(1.5deg) scale(1.03)',
                opacity: 0.92,
                pointerEvents: 'none',
              }}
            >
              <LeadCard
                lead={activeLead}
                accentColor={activeCol?.color ?? '#86868B'}
                onClick={() => {
                  /* no-op inside overlay */
                }}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
