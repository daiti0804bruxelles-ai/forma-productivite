import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_AVATAR, isAvatarConfig } from '../src/avatarModel.ts'

test('une apparence sauvegardée survit à un export JSON', () => {
  const avatar = { ...DEFAULT_AVATAR, name: 'Exploratrice', hair: 'bob', clothing: 'explorer', skin: 3, outfit: 1 }
  assert.equal(isAvatarConfig(JSON.parse(JSON.stringify(avatar))), true)
})
test('une sauvegarde invalide ne peut fournir de couleurs ou options hors limites', () => {
  for (const value of [null, {}, { ...DEFAULT_AVATAR, skin: -1 }, { ...DEFAULT_AVATAR, outfit: 4 }, { ...DEFAULT_AVATAR, hairColor: 1.5 }, { ...DEFAULT_AVATAR, name: ' ' }, { ...DEFAULT_AVATAR, hair: 'unknown' }]) {
    assert.equal(isAvatarConfig(value), false)
  }
})
