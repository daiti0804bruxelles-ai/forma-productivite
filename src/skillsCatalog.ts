/** Catalogue officiel et fermé des compétences de Forma. Ne pas ajouter de compétence sans décision produit. */
export const SKILL_GROUPS = [
  { id: 'appearance', name: 'Apparence & Physique', skills: [
    { id: 'aesthetics', name: 'Esthétique & Soins' },
    { id: 'strength', name: 'Musculation' },
    { id: 'cardio', name: 'Cardio & Endurance' },
  ] },
  { id: 'health', name: 'Santé & Équilibre', skills: [
    { id: 'nutrition', name: 'Nutrition' },
    { id: 'sleep', name: 'Sommeil & Récupération' },
    { id: 'mental', name: 'Bien-être mental' },
  ] },
  { id: 'knowledge', name: 'Connaissances', skills: [
    { id: 'reading', name: 'Lecture' },
    { id: 'learning', name: 'Apprentissage' },
    { id: 'practical', name: 'Compétences pratiques' },
  ] },
  { id: 'ambition', name: 'Ambition & Finances', skills: [
    { id: 'entrepreneurship', name: 'Entrepreneuriat' },
    { id: 'finance', name: 'Finances personnelles' },
    { id: 'investing', name: 'Investissement' },
  ] },
  { id: 'discipline', name: 'Discipline & Maîtrise', skills: [
    { id: 'consistency', name: 'Régularité' },
    { id: 'organization', name: 'Organisation' },
    { id: 'focus', name: 'Concentration' },
  ] },
  { id: 'relations', name: 'Relations & Épanouissement', skills: [
    { id: 'relationships', name: 'Couple & Relations' },
    { id: 'family', name: 'Famille & Vie sociale' },
    { id: 'creativity', name: 'Créativité' },
    { id: 'leisure', name: 'Loisirs & Découvertes' },
  ] },
] as const

export type SkillId = (typeof SKILL_GROUPS)[number]['skills'][number]['id']
export const SKILL_IDS: readonly string[] = SKILL_GROUPS.flatMap(group => group.skills.map(skill => skill.id))
export const isSkillId = (value: unknown): value is SkillId =>
  typeof value === 'string' && SKILL_IDS.includes(value)
