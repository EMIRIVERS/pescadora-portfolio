/**
 * Genera y guarda mensajes de WhatsApp personalizados para todos los leads.
 * Usa la misma lógica que getWaTemplate() en LeadDetailModal.tsx
 */

const SUPABASE_URL = 'https://hncwnykfqeyghlpfygyw.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuY3dueWtmcWV5Z2hscGZ5Z3l3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjI4MTY1MCwiZXhwIjoyMDkxODU3NjUwfQ.nQNFFbfQwo4F6eOSgZQMksFl5cYBjjSGuX1zm5G5Ang'

const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
}

// ── Helpers de categoría ──────────────────────────────────────────────────────

function getPortfolioLink(category) {
  const c = category.toLowerCase()
  if (c.includes('hotel') || c.includes('hospedaje') || c.includes('cabana') || c.includes('resort') || c.includes('hostel') || c.includes('lodge') || c.includes('glamping'))
    return 'xicofilms.com/portfolio/stays'
  if (c.includes('restaurante') || c.includes('café') || c.includes('bar') || c.includes('cocina') || c.includes('kitchen') || c.includes('pizza') || c.includes('cafe') || c.includes('coffee') || c.includes('restaurant') || c.includes('food') || c.includes('grill') || c.includes('bakery') || c.includes('bistro'))
    return 'xicofilms.com/portfolio/food'
  if (c.includes('tour') || c.includes('buceo') || c.includes('snorkel') || c.includes('sailing') || c.includes('diving') || c.includes('fishing') || c.includes('pesca') || c.includes('kayak') || c.includes('adventure') || c.includes('excursion'))
    return 'xicofilms.com/portfolio/adventures'
  if (c.includes('spa') || c.includes('yoga') || c.includes('wellness') || c.includes('bienestar') || c.includes('massage'))
    return 'xicofilms.com/portfolio/lifestyle'
  if (c.includes('real estate') || c.includes('realty') || c.includes('property') || c.includes('properties'))
    return 'xicofilms.com/portfolio/properties'
  return 'xicofilms.com'
}

function getCategory(projectType, notes) {
  const combined = ((projectType ?? '') + ' ' + (notes ?? '')).toLowerCase()
  return combined
}

function isBarter(category) {
  // Barter: tours, snorkeling, diving, sailing, fishing, hotels, hostels, cabanas, beach clubs, resorts
  return (
    category.includes('tour') || category.includes('snorkel') || category.includes('diving') ||
    category.includes('buceo') || category.includes('sailing') || category.includes('fishing') ||
    category.includes('pesca') || category.includes('kayak') || category.includes('adventure') ||
    category.includes('hotel') || category.includes('hostel') || category.includes('resort') ||
    category.includes('cabana') || category.includes('lodge') || category.includes('glamping') ||
    category.includes('beach club') || category.includes('excursion')
  )
}

function getHook(biz, category) {
  const c = category
  if (c.includes('hotel') || c.includes('hospedaje') || c.includes('cabana') || c.includes('resort') || c.includes('hostel') || c.includes('lodge') || c.includes('glamping')) {
    return `Boutique properties like ${biz} deserve visuals that actually do them justice — great photos and video can make a real difference in bookings.`
  }
  if (c.includes('restaurante') || c.includes('café') || c.includes('bar') || c.includes('cocina') || c.includes('kitchen') || c.includes('pizza') || c.includes('cafe') || c.includes('coffee') || c.includes('restaurant') || c.includes('food') || c.includes('grill') || c.includes('bakery') || c.includes('bistro')) {
    return `The food and atmosphere at ${biz} are exactly the kind of thing that drives traffic when captured right.`
  }
  if (c.includes('tour') || c.includes('buceo') || c.includes('snorkel') || c.includes('sailing') || c.includes('diving') || c.includes('fishing') || c.includes('pesca') || c.includes('kayak') || c.includes('adventure') || c.includes('excursion')) {
    return `The experiences you offer at ${biz} are exactly the kind of thing that performs incredibly well with strong visuals — action content like this goes a long way on social.`
  }
  if (c.includes('spa') || c.includes('yoga') || c.includes('wellness') || c.includes('bienestar') || c.includes('massage')) {
    return `${biz} has the kind of calm, beautiful energy that makes for incredible content — the sort of thing that converts browsers into bookings.`
  }
  if (c.includes('real estate') || c.includes('realty') || c.includes('property') || c.includes('properties')) {
    return `High-quality visuals are everything in real estate — we'd love to help ${biz} stand out with content that actually sells.`
  }
  return `We came across ${biz} and honestly see a lot of potential for strong visual content that could really move the needle for you.`
}

function generateMessage(lead) {
  const biz = lead.company || lead.name
  const category = getCategory(lead.project_type, lead.notes)
  const portfolio = getPortfolioLink(category)
  const hook = getHook(biz, category)
  const barterLead = isBarter(category)

  const delivers = `What we can deliver:\n• A revamped, high-converting website (demo ready to show you!)\n• Professional photo & video — fully edited, ready to post\n• Social media content package\n• Fast turnaround`

  // Deterministic variant 0/1/2 based on lead id
  const variant = parseInt(lead.id.replace(/-/g, '').charAt(0), 16) % 3

  if (barterLead) {
    // Barter angle — open to collaboration / trade
    if (variant === 0) {
      return `Hi! My name is Emi — I'm part of Xico Films, a production company focused on high-impact visual content.\n\n${hook}\n\nWe loved it so much that we actually took the initiative to build a custom web demo for ${biz}, showing how a refreshed site paired with professional content could look.\n\nWe'll be on the island May 16–21, which makes it the perfect window to capture fresh footage on-site. We're completely flexible — open to a collaboration or a standard package, whatever fits best.\n\n${delivers}\n\nWould you be open to a quick chat? I'd love to send you the demo link before the trip.\n\n— Emi | Xico Films\n${portfolio}`
    }
    if (variant === 1) {
      return `Hi! I'm Emi from Xico Films — we specialize in high-impact content for businesses like yours.\n\n${hook}\n\nWe're heading to Caye Caulker May 16–21 and we went ahead and built a web demo specifically for ${biz} — a real look at what a refreshed website and fresh content could do for you.\n\nWe're flexible on how we structure it — a collaboration, a package, whatever works on your end.\n\n${delivers}\n\nMind if I shoot you the demo link? It takes about 2 minutes to look at and gives you a real feel for what we're talking about.\n\n— Emi | Xico Films\n${portfolio}`
    }
    return `Hi! Emi here, from Xico Films.\n\n${hook}\n\nWe'll be in Caye Caulker May 16–21 and we took the time to build a demo for ${biz} — a preview of what a fresh website and professional content could look like for you specifically.\n\nHappy to make it work however is easiest — collaboration, package, open to ideas.\n\n${delivers}\n\nCan I send you the link?\n\n— Emi | Xico Films\n${portfolio}`
  } else {
    // Sell angle — restaurants, cafes, real estate (no barter)
    if (variant === 0) {
      return `Hi! My name is Emi — I'm part of Xico Films, a production company specializing in high-impact visual content.\n\n${hook}\n\nWe're heading to Caye Caulker May 16–21 and we built a web demo specifically for ${biz} — showing exactly how a professional website and content package could look for you.\n\n${delivers}\n\nPricing starts at $500 USD and we keep it simple — one package, fully delivered. Would you be open to a quick call? I'd love to send you the demo link.\n\n— Emi | Xico Films\n${portfolio}`
    }
    if (variant === 1) {
      return `Hi! I'm Emi from Xico Films — we create professional visual content for businesses in tourism and hospitality.\n\n${hook}\n\nWe'll be on the island May 16–21 and we put together a custom web demo for ${biz} — a real preview of what elevated content could do for your brand.\n\n${delivers}\n\nPackages from $500 USD. Can I send you the link to take a look?\n\n— Emi | Xico Films\n${portfolio}`
    }
    return `Hi! Emi here, from Xico Films.\n\n${hook}\n\nWe're visiting Caye Caulker May 16–21 and built a demo for ${biz} — a look at what a refreshed website and professional photos/video could do for you.\n\n${delivers}\n\nStarts at $500 USD, fast turnaround. Want me to send you the link?\n\n— Emi | Xico Films\n${portfolio}`
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Fetch all leads
  console.log('Fetching leads...')
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/leads?select=id,name,company,project_type,notes,phone&limit=500`,
    { headers: HEADERS }
  )
  const leads = await res.json()
  console.log(`Found ${leads.length} leads`)

  // 2. Generate messages
  const updates = leads.map((lead) => ({
    id: lead.id,
    wa_message: generateMessage(lead),
  }))

  // 3. Batch update in groups of 20
  const BATCH = 20
  let updated = 0
  let errors = 0

  for (let i = 0; i < updates.length; i += BATCH) {
    const batch = updates.slice(i, i + BATCH)
    await Promise.all(
      batch.map(async ({ id, wa_message }) => {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/leads?id=eq.${id}`,
          {
            method: 'PATCH',
            headers: HEADERS,
            body: JSON.stringify({ wa_message }),
          }
        )
        if (r.ok) {
          updated++
        } else {
          const err = await r.text()
          console.error(`Error updating ${id}: ${err}`)
          errors++
        }
      })
    )
    process.stdout.write(`\r  ${updated + errors}/${updates.length} procesados...`)
  }

  console.log(`\n\nListo! ${updated} mensajes guardados. ${errors} errores.`)

  // 4. Show a sample
  if (updates.length > 0) {
    console.log('\n── Ejemplo (primer lead) ──────────────────────────────')
    const sample = leads[0]
    console.log(`Lead: ${sample.company || sample.name} | Tipo: ${sample.project_type ?? 'sin tipo'}`)
    console.log('─'.repeat(55))
    console.log(updates[0].wa_message)
  }
}

main().catch(console.error)
