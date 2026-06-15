'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
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
import { LayoutGrid, List, Columns3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { updateLeadStatus } from '@/lib/actions/leads';
import LeadCard from './LeadCard';
import LeadDetailModal from './LeadDetailModal';
import AddLeadModal from './AddLeadModal';
import LeadsImporter from './LeadsImporter';
import type { LeadStatus } from '@/lib/supabase/types';
import { LEAD_STATUS_STYLES } from '@/lib/status-colors';

type ViewMode = 'kanban' | 'list' | 'gallery';
const VIEW_STORAGE_KEY = 'leads-view-mode';

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
  wa_message: string | null;
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
type SortOption  = 'date_desc' | 'date_asc' | 'priority_desc' | 'rating_desc' | 'stale_desc';

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

const SORT_LABELS: Record<SortOption, string> = {
  date_desc:     'Más reciente',
  date_asc:      'Más antiguo',
  priority_desc: 'Mayor prioridad',
  rating_desc:   'Mayor rating',
  stale_desc:    'Más tiempo sin mover',
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

// ── Parse priority from notes ─────────────────────────────────────────────────

function parsePriority(notes: string | null): number {
  if (!notes) return 0;
  const m = notes.match(/PRIORIDAD\s+(\d)/i);
  return m ? parseInt(m[1], 10) : 0;
}

// ── Parse rating from notes ───────────────────────────────────────────────────

function parseRating(notes: string | null): number {
  if (!notes) return 0;
  const m = notes.match(/Rating:\s*([\d.]+)/i);
  return m ? parseFloat(m[1]) : 0;
}

// ── Format budget total for column header ─────────────────────────────────────

function formatBudgetTotal(total: number): string {
  if (total === 0) return '';
  const k = total / 1000;
  if (k < 10) {
    return `$${k.toFixed(1)}k`;
  }
  return `$${Math.round(k)}k`;
}

// ── Sort leads ────────────────────────────────────────────────────────────────

function sortLeads(leads: Lead[], sort: SortOption): Lead[] {
  const copy = [...leads];
  switch (sort) {
    case 'date_desc':
      return copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'date_asc':
      return copy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    case 'priority_desc':
      return copy.sort((a, b) => parsePriority(b.notes) - parsePriority(a.notes));
    case 'rating_desc':
      return copy.sort((a, b) => parseRating(b.notes) - parseRating(a.notes));
    case 'stale_desc':
      return copy.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
  }
}

// ── WA templates ─────────────────────────────────────────────────────────────

const WA_TEMPLATE_COBRAR =
  `Hi! My name is Emi, I'm a professional photographer & content creator based in Mexico, currently visiting Caye Caulker.\n\nI'd love to create professional photography & video content for your business — photos and video you can use on Instagram, Google, and your website.\n\nWould you be open to a quick chat?\n\n— Emi | XICO Films\nxicofilms.com`;

const WA_TEMPLATE_INTERCAMBIO =
  `Hi! I'm Emi, a professional photographer visiting Caye Caulker.\n\nI'd like to propose a collaboration: I'll create professional photos & video content for your business in exchange for [accommodation / meals / a tour / store credit].\n\nNo cost to you. You get content that brings in more customers.\n\nInterested?\n\n— Emi | XICO Films\nxicofilms.com`;

// ── Shared input/select style ─────────────────────────────────────────────────

const CONTROL_STYLE: React.CSSProperties = {
  background: 'var(--dash-surface-2)',
  border: '1px solid var(--dash-border)',
  borderRadius: '8px',
  color: 'var(--dash-text-primary)',
  fontSize: '13px',
  fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  padding: '7px 12px',
  outline: 'none',
  transition: 'border-color 0.15s',
};

const SELECT_DROPDOWN_STYLE: React.CSSProperties = {
  ...CONTROL_STYLE,
  cursor: 'pointer',
  appearance: 'none' as const,
  paddingRight: '28px',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2386868B' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
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
        background: 'rgba(var(--dash-accent-rgb),0.15)',
        color: 'var(--dash-accent)',
        border: '1px solid rgba(var(--dash-accent-rgb),0.3)',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 500,
        padding: '2px 8px 2px 8px',
        fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
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
          color: 'var(--dash-accent)',
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

// ── WA Bulk Modal ─────────────────────────────────────────────────────────────

interface WABulkModalProps {
  selectedLeads: Lead[];
  onClose: () => void;
}

function WABulkModal({ selectedLeads, onClose }: WABulkModalProps) {
  const [template, setTemplate] = useState<'cobrar' | 'intercambio'>('cobrar');
  const [copied, setCopied] = useState(false);

  const templateText = template === 'cobrar' ? WA_TEMPLATE_COBRAR : WA_TEMPLATE_INTERCAMBIO;

  function handleOpenAll() {
    const withPhone = selectedLeads.filter((l) => l.phone);
    const toOpen = withPhone.slice(0, 10);
    if (withPhone.length > 10) {
      alert(`Solo se abriran los primeros 10 de ${withPhone.length} leads con telefono.`);
    }
    for (const lead of toOpen) {
      const phone = lead.phone!.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(templateText)}`, '_blank');
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(templateText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '520px',
          maxWidth: '92vw',
          background: 'var(--dash-surface-1)',
          border: '1px solid var(--dash-border)',
          borderRadius: '16px',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--dash-text-primary)', letterSpacing: '-0.01em' }}>
              Envio WA masivo
            </div>
            <div style={{ fontSize: '12px', color: 'var(--dash-text-tertiary)', marginTop: '2px' }}>
              {selectedLeads.filter((l) => l.phone).length} de {selectedLeads.length} leads tienen telefono
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--dash-text-tertiary)',
              fontSize: '20px',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '4px',
            }}
          >
            &times;
          </button>
        </div>

        {/* Template selector */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['cobrar', 'intercambio'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTemplate(t)}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '10px',
                border: `1px solid ${template === t ? 'var(--dash-accent)' : 'var(--dash-border)'}`,
                background: template === t ? 'rgba(var(--dash-accent-rgb),0.12)' : 'var(--dash-surface-2)',
                color: template === t ? 'var(--dash-accent)' : 'var(--dash-text-secondary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}
            >
              {t === 'cobrar' ? 'Cobrar' : 'Intercambio'}
            </button>
          ))}
        </div>

        {/* Template preview */}
        <div
          style={{
            background: 'var(--dash-surface-2)',
            border: '1px solid var(--dash-border)',
            borderRadius: '10px',
            padding: '14px',
            fontSize: '13px',
            color: 'var(--dash-text-secondary)',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            maxHeight: '220px',
            overflowY: 'auto',
          }}
        >
          {templateText}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleOpenAll}
            style={{
              flex: '1 1 auto',
              padding: '10px 16px',
              borderRadius: '10px',
              border: 'none',
              background: '#25D366',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1da851'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#25D366'; }}
          >
            Abrir todos en WA
          </button>
          <button
            onClick={handleCopy}
            style={{
              flex: '0 0 auto',
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid var(--dash-border)',
              background: 'var(--dash-surface-2)',
              color: copied ? '#25D366' : 'var(--dash-text-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              transition: 'all 0.15s',
            }}
          >
            {copied ? 'Copiado' : 'Copiar mensaje'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Kanban animation variants ─────────────────────────────────────────────────

const colVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.2 } },
};

// ── DroppableColumn ──────────────────────────────────────────────────────────

interface DroppableColumnProps {
  col: Column;
  colLeads: Lead[];
  onCardClick: (lead: Lead) => void;
  onColumnAdd: (status: LeadStatus) => void;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onSelectLead: (id: string) => void;
}

function DroppableColumn({ col, colLeads, onCardClick, onColumnAdd, selectionMode, selectedIds, onSelectLead }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: col.status });

  // Compute budget total
  const budgetTotal = useMemo(() => {
    let total = 0;
    for (const lead of colLeads) {
      if (lead.budget_range) {
        const n = parseBudgetNumber(lead.budget_range);
        if (n !== null) total += n;
      }
    }
    return total;
  }, [colLeads]);

  const budgetLabel = formatBudgetTotal(budgetTotal);

  return (
    <div
      style={{
        background: isOver ? `${col.color}0D` : 'var(--dash-surface-1)',
        border: '1px solid var(--dash-border)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '200px',
        overflow: 'hidden',
        fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
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
          borderBottom: '1px solid var(--dash-border)',
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
              color: 'var(--dash-text-primary)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {col.label}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {budgetLabel && (
            <span
              style={{
                fontSize: '10px',
                color: 'var(--dash-text-tertiary)',
              }}
            >
              {budgetLabel}
            </span>
          )}
          <span
            style={{
              background: 'var(--dash-surface-2)',
              color: 'var(--dash-text-secondary)',
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
      </div>

      {/* Cards area — this is the actual droppable zone */}
      <motion.div
        ref={setNodeRef}
        variants={colVariants}
        initial="hidden"
        animate="show"
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
              color: 'var(--dash-surface-3)',
              fontSize: '11px',
              letterSpacing: '0.05em',
              padding: '24px 0',
            }}
          >
            — vacío —
          </div>
        )}

        {colLeads.map((lead) => (
          <motion.div key={lead.id} variants={cardVariants}>
            <DraggableLeadCard
              lead={lead}
              accentColor={col.color}
              onClick={() => onCardClick(lead)}
              isSelected={selectedIds.has(lead.id)}
              selectionMode={selectionMode}
              onSelect={onSelectLead}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Add button at column bottom */}
      <div style={{ padding: '8px 10px', flexShrink: 0 }}>
        <button
          onClick={() => onColumnAdd(col.status)}
          style={{
            width: '100%',
            background: 'transparent',
            border: '1px dashed var(--dash-border)',
            borderRadius: '8px',
            color: 'var(--dash-text-tertiary)',
            fontSize: '12px',
            fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
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
            el.style.borderColor = 'var(--dash-border)';
            el.style.color = 'var(--dash-text-tertiary)';
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
  isSelected: boolean;
  selectionMode: boolean;
  onSelect: (id: string) => void;
}

function DraggableLeadCard({ lead, accentColor, onClick, isSelected, selectionMode, onSelect }: DraggableLeadCardProps) {
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
        position: 'relative',
        transition: isDragging ? undefined : 'opacity 0.15s',
        touchAction: 'none',
      }}
    >
      {selectionMode && (
        <div
          onClick={(e) => { e.stopPropagation(); onSelect(lead.id); }}
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            zIndex: 10,
            width: '18px',
            height: '18px',
            borderRadius: '4px',
            border: `2px solid ${isSelected ? 'var(--dash-accent)' : 'rgba(255,255,255,0.4)'}`,
            background: isSelected ? 'var(--dash-accent)' : 'rgba(0,0,0,0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isSelected && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      )}
      <LeadCard lead={lead} accentColor={accentColor} onClick={onClick} />
    </div>
  );
}

// ── LeadsPipeline ────────────────────────────────────────────────────────────

export default function LeadsPipeline({ leads }: LeadsPipelineProps) {
  const router = useRouter();
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addPresetStatus, setAddPresetStatus] = useState<LeadStatus>('new');
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'kanban';
    return (localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode) ?? 'kanban';
  });

  function changeView(v: ViewMode) {
    setView(v);
    localStorage.setItem(VIEW_STORAGE_KEY, v);
  }

  // ── Filter state ────────────────────────────────────────────────────────────
  const [searchRaw, setSearchRaw]       = useState('');
  const [search, setSearch]             = useState('');
  const [filterSource, setFilterSource] = useState<FilterSource>('all');
  const [filterBudget, setFilterBudget] = useState<FilterBudget>('all');
  const [filterAge, setFilterAge]       = useState<FilterAge>('all');
  const [sortBy, setSortBy]             = useState<SortOption>('date_desc');
  const [segmentFilter, setSegmentFilter] = useState<string | null>(null);

  // ── Selection state ─────────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  const [showWAModal, setShowWAModal]     = useState(false);

  function toggleSelectionMode() {
    setSelectionMode((prev) => {
      if (prev) {
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }

  function toggleSelectId(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // debounce 200ms
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((val: string) => {
    setSearchRaw(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(val), 200);
  }, []);

  // ── Filtered leads (client-side) ────────────────────────────────────────────
  const filteredLeads = useMemo<Lead[]>(() => {
    let result = localLeads.filter((lead) => {
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

    // Apply segment filter
    if (segmentFilter === 'p5_sin_contactar') {
      result = result.filter(
        (l) => l.notes?.includes('PRIORIDAD 5') && l.status === 'new'
      );
    } else if (segmentFilter === 'hoteles') {
      result = result.filter((l) =>
        /(hotel|hospedaje)/i.test(l.project_type ?? '')
      );
    } else if (segmentFilter === 'tours') {
      result = result.filter((l) =>
        /(tour|buceo)/i.test(l.project_type ?? '')
      );
    } else if (segmentFilter === 'restaurantes') {
      result = result.filter((l) =>
        /(restaurante|bar|caf[ée])/i.test(l.project_type ?? '')
      );
    } else if (segmentFilter === 'con_tel') {
      result = result.filter((l) => l.phone !== null);
    }

    return sortLeads(result, sortBy);
  }, [localLeads, search, filterSource, filterBudget, filterAge, segmentFilter, sortBy]);

  const hasActiveFilters = search.trim() !== '' || filterSource !== 'all' || filterBudget !== 'all' || filterAge !== 'all' || segmentFilter !== null;

  // Selected leads objects
  const selectedLeadsArr = useMemo(
    () => filteredLeads.filter((l) => selectedIds.has(l.id)),
    [filteredLeads, selectedIds]
  );

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

  // ── Segment definitions ───────────────────────────────────────────────────

  const SEGMENTS: { id: string; label: string }[] = [
    { id: 'p5_sin_contactar', label: 'P5 sin contactar' },
    { id: 'hoteles',          label: 'Hoteles' },
    { id: 'tours',            label: 'Tours' },
    { id: 'restaurantes',     label: 'Restaurantes' },
    { id: 'con_tel',          label: 'Con tel.' },
  ];

  return (
    <>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--dash-text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            Pipeline de Leads
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Seleccionar toggle */}
          <button
            onClick={toggleSelectionMode}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              border: `1px solid ${selectionMode ? 'var(--dash-accent)' : 'var(--dash-border)'}`,
              borderRadius: '8px',
              background: selectionMode ? 'rgba(var(--dash-accent-rgb),0.12)' : 'var(--dash-surface-2)',
              color: selectionMode ? 'var(--dash-accent)' : 'var(--dash-text-secondary)',
              fontSize: '12px',
              fontWeight: 500,
              fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              cursor: 'pointer',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            Seleccionar
          </button>

          {/* View toggle */}
          <div
            style={{
              display: 'flex',
              background: 'var(--dash-surface-2)',
              border: '1px solid var(--dash-border)',
              borderRadius: '8px',
              overflow: 'hidden',
              flexShrink: 0,
              position: 'relative',
            }}
          >
            {([
              { id: 'kanban', icon: <Columns3 size={14} />, label: 'Kanban' },
              { id: 'list',   icon: <List size={14} />,     label: 'Lista' },
              { id: 'gallery',icon: <LayoutGrid size={14} />,label: 'Galeria' },
            ] as { id: ViewMode; icon: React.ReactNode; label: string }[]).map((v) => (
              <button
                key={v.id}
                title={v.label}
                aria-label={v.label}
                onClick={() => changeView(v.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  border: 'none',
                  background: 'transparent',
                  color: view === v.id ? '#fff' : 'var(--dash-text-secondary)',
                  fontSize: '12px',
                  fontWeight: 500,
                  fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  cursor: 'pointer',
                  position: 'relative',
                  zIndex: 1,
                  transition: 'color 0.15s',
                }}
              >
                {view === v.id && (
                  <motion.div
                    layoutId="view-indicator"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'var(--dash-accent)',
                      borderRadius: '6px',
                      zIndex: -1,
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                {v.icon}
                {v.label}
              </button>
            ))}
          </div>
          <LeadsImporter onDone={() => { router.refresh() }} />
          <button
            onClick={() => {
              setAddPresetStatus('new');
              setShowAdd(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--dash-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              cursor: 'pointer',
              letterSpacing: '-0.01em',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--dash-accent-hover)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--dash-accent)';
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
            Nuevo Lead
          </button>
        </div>
      </div>

      {/* ── Search + filter bar ─────────────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'var(--dash-bg)',
          paddingBottom: '12px',
          marginBottom: '12px',
          fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
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
                color: 'var(--dash-text-tertiary)',
              }}
            >
              <circle cx="6.5" cy="6.5" r="5" stroke="var(--dash-text-tertiary)" strokeWidth="1.5" />
              <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="var(--dash-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
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
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(var(--dash-accent-rgb),0.5)'; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = 'var(--dash-border)'; }}
            />
          </div>

          {/* Source select */}
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as FilterSource)}
            style={SELECT_DROPDOWN_STYLE}
          >
            {(Object.keys(SOURCE_LABELS_FILTER) as FilterSource[]).map((k) => (
              <option key={k} value={k} style={{ background: 'var(--dash-surface-2)' }}>
                {SOURCE_LABELS_FILTER[k]}
              </option>
            ))}
          </select>

          {/* Budget select */}
          <select
            value={filterBudget}
            onChange={(e) => setFilterBudget(e.target.value as FilterBudget)}
            style={SELECT_DROPDOWN_STYLE}
          >
            {(Object.keys(BUDGET_LABELS) as FilterBudget[]).map((k) => (
              <option key={k} value={k} style={{ background: 'var(--dash-surface-2)' }}>
                {BUDGET_LABELS[k]}
              </option>
            ))}
          </select>

          {/* Age without contact select */}
          <select
            value={filterAge}
            onChange={(e) => setFilterAge(e.target.value as FilterAge)}
            style={SELECT_DROPDOWN_STYLE}
          >
            {(Object.keys(AGE_LABELS) as FilterAge[]).map((k) => (
              <option key={k} value={k} style={{ background: 'var(--dash-surface-2)' }}>
                {AGE_LABELS[k]}
              </option>
            ))}
          </select>

          {/* Sort select */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            style={SELECT_DROPDOWN_STYLE}
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((k) => (
              <option key={k} value={k} style={{ background: 'var(--dash-surface-2)' }}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>

          {/* Counter */}
          <span
            style={{
              fontSize: '12px',
              color: 'var(--dash-text-tertiary)',
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
                color: 'var(--dash-text-tertiary)',
                fontSize: '11px',
                cursor: 'pointer',
                padding: '2px 4px',
                fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--dash-text-secondary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--dash-text-tertiary)'; }}
            >
              Limpiar todo
            </button>
          </div>
        )}

        {/* Row 3: Segments */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'wrap',
            marginTop: '8px',
          }}
        >
          <span style={{ fontSize: '10px', color: 'var(--dash-text-tertiary)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>
            Segmentos:
          </span>
          {SEGMENTS.map((seg) => {
            const isActive = segmentFilter === seg.id;
            return (
              <button
                key={seg.id}
                onClick={() => setSegmentFilter(isActive ? null : seg.id)}
                style={{
                  padding: '3px 10px',
                  borderRadius: '20px',
                  border: `1px solid ${isActive ? 'var(--dash-accent)' : 'var(--dash-border)'}`,
                  background: isActive ? 'var(--dash-accent)' : 'var(--dash-surface-2)',
                  color: isActive ? '#fff' : 'var(--dash-text-secondary)',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {seg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Animated view container ───────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {view === 'kanban' && (
          <motion.div
            key="kanban"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {/* ── Kanban view ────────────────────────────────────────────── */}
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
                      selectionMode={selectionMode}
                      selectedIds={selectedIds}
                      onSelectLead={toggleSelectId}
                    />
                  );
                })}
              </div>

              {/* Drag overlay */}
              <DragOverlay dropAnimation={null}>
                {activeLead ? (
                  <div style={{ transform: 'rotate(1.5deg) scale(1.03)', opacity: 0.92, pointerEvents: 'none' }}>
                    <LeadCard
                      lead={activeLead}
                      accentColor={activeCol?.color ?? 'var(--dash-text-secondary)'}
                      onClick={() => {/* no-op */}}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </motion.div>
        )}

        {view === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {/* ── List view ──────────────────────────────────────────────── */}
            <div style={{ overflowX: 'auto', paddingBottom: '20px' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: '0 4px',
                  fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                  fontSize: '13px',
                }}
              >
                <thead>
                  <tr>
                    {selectionMode && <th style={{ width: '36px', padding: '6px 8px', borderBottom: '1px solid var(--dash-border)' }} />}
                    {['Nombre / Empresa', 'Tipo', 'Teléfono', 'Estado', 'Origen', 'Budget', 'Creado'].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '6px 12px',
                          fontSize: '10px',
                          fontWeight: 600,
                          letterSpacing: '0.07em',
                          textTransform: 'uppercase',
                          color: 'var(--dash-text-tertiary)',
                          borderBottom: '1px solid var(--dash-border)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => {
                    const col = COLUMNS.find((c) => c.status === lead.status);
                    const waPhone = lead.phone?.replace(/\D/g, '');
                    const isSelected = selectedIds.has(lead.id);
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => selectionMode ? toggleSelectId(lead.id) : handleCardClick(lead)}
                        style={{ cursor: 'pointer', outline: isSelected ? '1px solid var(--dash-accent)' : undefined, borderRadius: '8px' }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.opacity = '0.8';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.opacity = '1';
                        }}
                      >
                        {/* Checkbox */}
                        {selectionMode && (
                          <td
                            style={{ padding: '10px 8px', background: 'var(--dash-surface-1)', borderRadius: '8px 0 0 8px' }}
                            onClick={(e) => { e.stopPropagation(); toggleSelectId(lead.id); }}
                          >
                            <div
                              style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '4px',
                                border: `2px solid ${isSelected ? 'var(--dash-accent)' : 'rgba(255,255,255,0.3)'}`,
                                background: isSelected ? 'var(--dash-accent)' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {isSelected && (
                                <svg width="9" height="7" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </div>
                          </td>
                        )}
                        {/* Name / Company */}
                        <td
                          style={{
                            padding: '10px 12px',
                            background: 'var(--dash-surface-1)',
                            borderRadius: selectionMode ? '0' : '8px 0 0 8px',
                            borderLeft: `3px solid ${col?.color ?? 'var(--dash-border)'}`,
                            maxWidth: '220px',
                          }}
                        >
                          <div style={{ fontWeight: 600, color: 'var(--dash-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {lead.name}
                          </div>
                          {lead.company && (
                            <div style={{ fontSize: '11px', color: 'var(--dash-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {lead.company}
                            </div>
                          )}
                        </td>
                        {/* Type */}
                        <td style={{ padding: '10px 12px', background: 'var(--dash-surface-1)', color: 'var(--dash-text-secondary)', maxWidth: '160px' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {lead.project_type ?? '—'}
                          </span>
                        </td>
                        {/* Phone */}
                        <td style={{ padding: '10px 12px', background: 'var(--dash-surface-1)', whiteSpace: 'nowrap' }}>
                          {lead.phone ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: 'var(--dash-text-secondary)', fontSize: '12px' }}>{lead.phone}</span>
                              {waPhone && (
                                <a
                                  href={`https://wa.me/${waPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '4px',
                                    background: 'rgba(37,211,102,0.15)',
                                    color: '#25D366',
                                    flexShrink: 0,
                                    textDecoration: 'none',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                  }}
                                  title="WhatsApp"
                                >
                                  W
                                </a>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--dash-text-tertiary)' }}>—</span>
                          )}
                        </td>
                        {/* Status */}
                        <td style={{ padding: '10px 12px', background: 'var(--dash-surface-1)', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: '10px',
                              fontWeight: 600,
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: col ? `${col.color}1A` : 'var(--dash-border)',
                              color: col?.color ?? 'var(--dash-text-secondary)',
                            }}
                          >
                            {col?.label ?? lead.status}
                          </span>
                        </td>
                        {/* Source */}
                        <td style={{ padding: '10px 12px', background: 'var(--dash-surface-1)', color: 'var(--dash-text-tertiary)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                          {lead.source}
                        </td>
                        {/* Budget */}
                        <td style={{ padding: '10px 12px', background: 'var(--dash-surface-1)', color: 'var(--dash-text-secondary)', whiteSpace: 'nowrap', fontSize: '12px' }}>
                          {lead.budget_range ?? '—'}
                        </td>
                        {/* Created */}
                        <td
                          style={{
                            padding: '10px 12px',
                            background: 'var(--dash-surface-1)',
                            borderRadius: '0 8px 8px 0',
                            color: 'var(--dash-text-tertiary)',
                            fontSize: '11px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {new Date(lead.created_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredLeads.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--dash-text-tertiary)', fontSize: '14px' }}>
                  Sin leads que mostrar
                </div>
              )}
            </div>
          </motion.div>
        )}

        {view === 'gallery' && (
          <motion.div
            key="gallery"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {/* ── Gallery view ────────────────────────────────────────────── */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '12px',
                paddingBottom: '20px',
              }}
            >
              {filteredLeads.map((lead, idx) => {
                const col = COLUMNS.find((c) => c.status === lead.status);
                const waPhone = lead.phone?.replace(/\D/g, '');
                const notesPreview = lead.notes
                  ? lead.notes.slice(0, 80) + (lead.notes.length > 80 ? '...' : '')
                  : null;
                const isSelected = selectedIds.has(lead.id);
                return (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -2, boxShadow: '0 6px 24px rgba(0,0,0,0.3)' }}
                    transition={{ duration: 0.18, delay: idx * 0.03 }}
                    onClick={() => selectionMode ? toggleSelectId(lead.id) : handleCardClick(lead)}
                    style={{
                      background: 'var(--dash-surface-1)',
                      borderRadius: '14px',
                      border: `1px solid ${isSelected ? 'var(--dash-accent)' : 'var(--dash-border)'}`,
                      borderTop: `3px solid ${col?.color ?? 'var(--dash-border)'}`,
                      padding: '16px',
                      cursor: 'pointer',
                      fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      position: 'relative',
                    }}
                  >
                    {/* Checkbox overlay */}
                    {selectionMode && (
                      <div
                        onClick={(e) => { e.stopPropagation(); toggleSelectId(lead.id); }}
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          zIndex: 5,
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          border: `2px solid ${isSelected ? 'var(--dash-accent)' : 'rgba(255,255,255,0.5)'}`,
                          background: isSelected ? 'var(--dash-accent)' : 'rgba(0,0,0,0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        {isSelected && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4l2.5 2.5L9 1" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    )}

                    {/* Status pill */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          padding: '2px 8px',
                          borderRadius: '5px',
                          background: col ? `${col.color}1A` : 'var(--dash-border)',
                          color: col?.color ?? 'var(--dash-text-tertiary)',
                        }}
                      >
                        {col?.label ?? lead.status}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--dash-text-tertiary)' }}>
                        {new Date(lead.created_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    {/* Name */}
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--dash-text-primary)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lead.name}
                    </div>

                    {/* Company */}
                    {lead.company && (
                      <div style={{ fontSize: '12px', color: 'var(--dash-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lead.company}
                      </div>
                    )}

                    {/* Type badge */}
                    {lead.project_type && (
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '10px',
                          color: 'var(--dash-text-secondary)',
                          background: 'var(--dash-surface-2)',
                          border: '1px solid var(--dash-border)',
                          borderRadius: '5px',
                          padding: '2px 7px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                        }}
                      >
                        {lead.project_type}
                      </span>
                    )}

                    {/* Notes preview */}
                    {notesPreview && (
                      <div style={{ fontSize: '11px', color: 'var(--dash-text-tertiary)', lineHeight: 1.5, flexGrow: 1 }}>
                        {notesPreview}
                      </div>
                    )}

                    {/* Bottom: phone + WA */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '4px', borderTop: '1px solid var(--dash-border)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--dash-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                        {lead.phone ?? lead.email ?? '—'}
                      </span>
                      {waPhone && (
                        <a
                          href={`https://wa.me/${waPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: 'rgba(37,211,102,0.15)',
                            color: '#25D366',
                            fontSize: '11px',
                            fontWeight: 700,
                            textDecoration: 'none',
                            flexShrink: 0,
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(37,211,102,0.28)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(37,211,102,0.15)'; }}
                        >
                          WA
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              {filteredLeads.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 0', color: 'var(--dash-text-tertiary)', fontSize: '14px', fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif" }}>
                  Sin leads que mostrar
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating selection action bar ────────────────────────────────── */}
      {selectionMode && selectedIds.size > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1500,
            background: 'var(--dash-surface-1)',
            border: '1px solid var(--dash-border)',
            borderRadius: '14px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: '13px', color: 'var(--dash-text-secondary)', fontWeight: 500 }}>
            {selectedIds.size} leads seleccionados
          </span>
          <button
            onClick={() => setShowWAModal(true)}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: 'none',
              background: '#25D366',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#1da851'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#25D366'; }}
          >
            Enviar WA masivo
          </button>
          <button
            onClick={clearSelection}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid var(--dash-border)',
              background: 'var(--dash-surface-2)',
              color: 'var(--dash-text-secondary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            }}
          >
            Deseleccionar todo
          </button>
        </div>
      )}

      {/* WA Bulk Modal */}
      {showWAModal && (
        <WABulkModal
          selectedLeads={selectedLeadsArr}
          onClose={() => setShowWAModal(false)}
        />
      )}

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
