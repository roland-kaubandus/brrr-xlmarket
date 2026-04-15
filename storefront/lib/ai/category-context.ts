import { BRANCHES } from '../branches'

export function buildCategoryContext(): string {
  const header = [
    'POOD: xlmarket.store — Professional tools & equipment, half the price',
    '',
    'TARNE: 4.99€, tasuta alates 99€',
    'TAGASTUS: 30 päeva',
    'BRÄND: VEVOR — professionaalsed tööriistad ja seadmed',
    '',
  ]

  const categories = BRANCHES.filter((branch) => branch.categoryHandle !== null)
    .map((branch) => `- ${branch.nameEn} (${branch.name}) → /${branch.slug}`)

  return [...header, ...categories].join('\n')
}
