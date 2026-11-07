import { SKILL_GROUPS, type SkillId } from './skillsCatalog'

/**
 * Suggestions de compétences à partir du nom (et de la catégorie en repli).
 * Mots-clés sans accents, en minuscules. Les mots courts (≤ 3 lettres) doivent
 * correspondre exactement ; les autres peuvent commencer un mot (« muscu » → « musculation »).
 */
const RULES: readonly { skill: SkillId; words: readonly string[] }[] = [
  { skill: 'strength', words: ['muscu', 'salle', 'gym', 'pompe', 'traction', 'squat', 'abdo', 'renfo', 'haltere', 'fitness', 'anytime', 'bench', 'dips', 'gainage', 'crossfit'] },
  { skill: 'cardio', words: ['cardio', 'course', 'courir', 'run', 'jogging', 'footing', 'velo', 'marche', 'natation', 'nager', 'hiit', 'fractionne', 'corde', 'boxe', 'tennis', 'foot', 'basket'] },
  { skill: 'aesthetics', words: ['skincare', 'soin', 'peau', 'cheveux', 'coiffeur', 'barbe', 'rasage', 'manucure', 'beaute', 'creme', 'masque', 'parfum', 'tenue', 'style'] },
  { skill: 'nutrition', words: ['eau', 'manger', 'repas', 'cuisine', 'cuisiner', 'proteine', 'nutrition', 'diete', 'legume', 'fruit', 'jeune', 'vitamine', 'complement', 'calorie', 'meal', 'sucre', 'alcool'] },
  { skill: 'sleep', words: ['dormir', 'sommeil', 'coucher', 'sieste', 'lit', 'nuit'] },
  { skill: 'mental', words: ['meditation', 'mediter', 'respiration', 'journal', 'journaling', 'affirmation', 'visualisation', 'gratitude', 'therapie', 'yoga', 'mindset', 'priere', 'stretching', 'detente'] },
  { skill: 'reading', words: ['lire', 'lecture', 'livre', 'chapitre', 'kindle', 'roman', 'page'] },
  { skill: 'learning', words: ['apprendre', 'formation', 'former', 'cours', 'etude', 'etudier', 'anglais', 'langue', 'duolingo', 'tuto', 'tutoriel', 'reviser', 'masterclass', 'podcast'] },
  { skill: 'practical', words: ['menage', 'lessive', 'linge', 'bricol', 'reparer', 'demenag', 'administratif', 'papier', 'voiture', 'vaisselle', 'nettoyer', 'courses', 'rdv', 'medecin', 'dentiste'] },
  { skill: 'entrepreneurship', words: ['agence', 'client', 'business', 'outreach', 'prospect', 'vente', 'chatter', 'marketing', 'tool', 'compte', 'modele', 'va', 'recrut', 'sop', 'instagram', 'contenu', 'app', 'code', 'coder', 'dev', 'lance', 'campagne', 'infrastructure', 'warmup', 'reel', 'post', 'shift', 'onlyfans', 'ofm', 'myrrh', 'projet'] },
  { skill: 'finance', words: ['budget', 'argent', 'depense', 'epargne', 'compta', 'comptable', 'facture', 'payer', 'impot', 'banque', 'wise', 'revolut', 'skrill', 'salaire', 'paie'] },
  { skill: 'investing', words: ['invest', 'crypto', 'bourse', 'action', 'etf', 'kraken', 'trading', 'bitcoin', 'portefeuille'] },
  { skill: 'organization', words: ['organis', 'planifi', 'priorit', 'agenda', 'ranger', 'rangement', 'todo', 'semaine', 'bilan', 'notion', 'trier', 'mail', 'email', 'inbox', 'objectif', 'planning', 'preparer'] },
  { skill: 'focus', words: ['travail profond', 'deep work', 'focus', 'concentration', 'pomodoro', 'sans telephone', 'deconnexion'] },
  { skill: 'relationships', words: ['couple', 'copine', 'copain', 'chérie', 'cherie', 'romantique', 'cadeau', 'rendez vous', 'date'] },
  { skill: 'family', words: ['famille', 'maman', 'mere', 'papa', 'pere', 'frere', 'soeur', 'ami', 'amis', 'pote', 'soiree', 'anniversaire'] },
  { skill: 'creativity', words: ['ecri', 'dessin', 'musique', 'photo', 'video', 'montage', 'design', 'blog', 'peinture', 'chanson'] },
  { skill: 'leisure', words: ['jeu', 'jeux', 'jouer', 'gaming', 'film', 'serie', 'sortie', 'voyage', 'balade', 'cinema', 'zomboid', 'switch', 'bowling', 'visite'] },
]

const CATEGORY_FALLBACK: Record<string, { task: SkillId; habit: SkillId }> = {
  Travail: { task: 'entrepreneurship', habit: 'focus' },
  Sport: { task: 'cardio', habit: 'cardio' },
  Apprentissage: { task: 'learning', habit: 'learning' },
  Personnel: { task: 'organization', habit: 'mental' },
}

const normalize = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

export function suggestSkills(title: string, category: string, kind: 'task' | 'habit', max = 3): SkillId[] {
  const text = normalize(title)
  const tokens = text.split(' ').filter(Boolean)
  const found: { skill: SkillId; at: number }[] = []
  for (const rule of RULES) {
    let at = -1
    for (const word of rule.words) {
      const w = normalize(word)
      let index: number
      if (w.includes(' ')) {
        const char = ` ${text} `.indexOf(` ${w} `)
        index = char < 0 ? -1 : text.slice(0, char).split(' ').filter(Boolean).length
      } else {
        index = tokens.findIndex(token => w.length <= 3 ? token === w : token.startsWith(w))
      }
      if (index >= 0 && (at < 0 || index < at)) at = index
    }
    if (at >= 0) found.push({ skill: rule.skill, at })
  }
  found.sort((a, b) => a.at - b.at)
  const result: SkillId[] = found.map(f => f.skill)
  if (!result.length && CATEGORY_FALLBACK[category]) result.push(CATEGORY_FALLBACK[category][kind])
  // Une habitude entretient toujours la régularité.
  if (kind === 'habit') {
    const primary = result.filter(skill => skill !== 'consistency').slice(0, max - 1)
    return [...primary, 'consistency']
  }
  return result.slice(0, max)
}

const NAMES: Record<string, string> = Object.fromEntries(SKILL_GROUPS.flatMap(group => group.skills.map(skill => [skill.id, skill.name])))
export const skillName = (id: string) => NAMES[id] ?? id
