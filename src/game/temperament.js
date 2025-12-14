// =====================
// Suspect profiles
// =====================
const TEMPERAMENTS = [
  { baseline: 'флегматичный', voice: 'говорит спокойно, бытовым языком, иногда ворчит' },
  { baseline: 'нервный', voice: 'торопится, оправдывается, путается в деталях' },
  { baseline: 'агрессивный', voice: 'огрызается, давит, но проговаривается под давлением' },
  { baseline: 'усталый', voice: 'вяло, сонно, но выдаёт детали, если прижать фактами' },
]

export function newSuspectProfile() {
  const t = TEMPERAMENTS[Math.floor(Math.random() * TEMPERAMENTS.length)]
  return {
    baseline: t.baseline,
    voice: t.voice,
    quirks: [
      'делает паузу перед неудобными ответами',
      'переводит тему на начальника склада',
      'пытается выглядеть спокойным',
    ],
  }
}
