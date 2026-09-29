import { describe, it, expect } from 'vitest'
import questions from '../src/data/sample_questions.json'

describe('SKD Question Bank', () => {
  const twk = questions.filter((q) => q.category === 'TWK')
  const tiu = questions.filter((q) => q.category === 'TIU')
  const tkp = questions.filter((q) => q.category === 'TKP')

  it('has exactly 110 questions', () => {
    expect(questions).toHaveLength(110)
  })

  it('has 30 TWK, 35 TIU, 45 TKP', () => {
    expect(twk).toHaveLength(30)
    expect(tiu).toHaveLength(35)
    expect(tkp).toHaveLength(45)
  })

  it('every question has 5 options A-E', () => {
    for (const q of questions) {
      expect(q.options).toHaveLength(5)
      expect(q.options.map((o) => o.id)).toEqual(['A', 'B', 'C', 'D', 'E'])
    }
  })

  it('TWK & TIU options have exactly one score 5 and four score 0', () => {
    for (const q of [...twk, ...tiu]) {
      const scores = q.options.map((o) => o.score).sort((a, b) => a - b)
      expect(scores).toEqual([0, 0, 0, 0, 5])
    }
  })

  it('TKP options have scores 1..5', () => {
    for (const q of tkp) {
      const scores = q.options.map((o) => o.score).sort((a, b) => a - b)
      expect(scores).toEqual([1, 2, 3, 4, 5])
    }
  })

  it('all questions have non-empty text, subCategory, and explanation', () => {
    for (const q of questions) {
      expect(q.text.length).toBeGreaterThan(0)
      expect(q.subCategory.length).toBeGreaterThan(0)
      expect(q.explanation.length).toBeGreaterThan(0)
    }
  })
})
