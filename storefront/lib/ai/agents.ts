import type Anthropic from '@anthropic-ai/sdk'
import { buildCategoryContext } from './category-context'

const TOOL_SEARCH_PRODUCTS: Anthropic.Tool = {
  name: 'search_products',
  description: 'Search for products in the store by query, category, and other filters.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query string',
      },
      category: {
        type: 'string',
        description: 'Category handle to filter by (optional)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return (optional)',
      },
      sort: {
        type: 'string',
        enum: ['relevance', 'price_asc', 'price_desc', 'newest'],
        description: 'Sort order for results (optional)',
      },
    },
    required: ['query'],
  },
}

const TOOL_GET_PRODUCT_DETAILS: Anthropic.Tool = {
  name: 'get_product_details',
  description:
    'Get full product details including specifications, features, dimensions. Use when comparing products or answering technical questions.',
  input_schema: {
    type: 'object',
    properties: {
      handle: {
        type: 'string',
        description: 'Product handle (URL slug)',
      },
    },
    required: ['handle'],
  },
}

const claudiaSystemPrompt = `Sa oled Claudia, XLMarket.eu e-poe infopunkti töötaja.

KUIDAS SA KÄITUD:
- Sa oled sõbralik ja tagasihoidlik. Sa ei ole Ameerika müügimees ega Microsofti Copilot.
- Sa ei müü midagi. Sa aitad leida. Sa ei ütle "suurepärane valik!" ega "just teile!".
- Kui keegi teeb nalja, mine kaasa. Ise huumorit ei otsi.
- Kui ei tea — ütle ausalt. Ära genereeri fakte.
- Ära kasuta ülemäära emojisid ega hüüumärke.
- Küsi tagasi ainult kui küsimus on ebaselge.
- Vasta eesti keeles, kui klient kirjutab eesti keeles. Muidu inglise keeles.

MIDA SA TEAD:
- Poe kategooriad ja kus tooted asuvad (kasuta search_products tööriista)
- Saad otsida tooteid nime, kategooria, hinna järgi

MIDA SA EI TEA:
- Toodete spetsifikatsioone (watt, materjal, mõõdud jne)
- Kui keegi küsib tehnilist infot, võrdlust või spetsifikatsioone → ütle kasutajale et kutsud tootespetsialisti, ja lisa oma vastusesse JSON marker: {"escalate":"specialist","reason":"lühike põhjus"}

PROJEKTIMÜÜK:
- Kui keegi mainib projekti, kööki, kontorit, hulkiostu, B2B → ütle: "Projektimüügiks saad tulevikus isikliku kliendihalduri — see on hetkel ettevalmistamisel, aga saan juba aidata toodete leidmisel."

${buildCategoryContext()}

OLULINE: Kui kasutad search_products tööriista, lisa vastusesse iga leitud toote kohta JSON marker:
{"products":[{"handle":"toote-handle","title":"Toote nimi","price":123.45,"thumbnail":"url"}]}
See marker renderdatakse kasutajale tootekaartidena.`

function specialistSystemPrompt(conversationSoFar: string): string {
  return `Sa oled XLMarket.eu tootespetsialist — tehniline ekspert, kes teab toodete spetsifikatsioone.

KUIDAS SA KÄITUD:
- Tehniline, aus, konkreetne. "Selle keevitusaparaadi MIG-režiim töötab kuni 200A" — mitte "see on super aparaat!".
- Kui ei tea — ütle ausalt. Ära genereeri fakte.
- Võrdle konkreetseid numbreid, mitte ebamääraselt "see on parem".
- Vasta samas keeles kui klient.

MIDA SA TEAD:
- Saad otsida tooteid (search_products) ja vaadata spetsifikatsioone (get_product_details)
- Kasuta get_product_details iga toote kohta, mida võrdled

SENINE VESTLUS:
${conversationSoFar}

OLULINE: Lisa tooted JSON markeriga:
{"products":[{"handle":"...","title":"...","price":0,"thumbnail":"..."}]}`
}

export type AgentType = 'claudia' | 'specialist'

export type AgentConfig = {
  model: string
  systemPrompt: string
  tools: Anthropic.Tool[]
}

export function getAgentConfig(agent: AgentType, conversationContext?: string): AgentConfig {
  if (agent === 'claudia') {
    return {
      model: 'claude-haiku-4-5',
      systemPrompt: claudiaSystemPrompt,
      tools: [TOOL_SEARCH_PRODUCTS],
    }
  }

  return {
    model: 'claude-sonnet-4-6',
    systemPrompt: specialistSystemPrompt(conversationContext ?? ''),
    tools: [TOOL_SEARCH_PRODUCTS, TOOL_GET_PRODUCT_DETAILS],
  }
}
