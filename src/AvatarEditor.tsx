import { useState } from 'react'
import { Check, SlidersHorizontal, X } from 'lucide-react'
import Avatar from './Avatar'
import { DEFAULT_AVATAR, HAIR_COLORS, OUTFIT_COLORS, SKIN_COLORS } from './avatarModel'
import type { AvatarConfig } from './avatarModel'

export default function AvatarEditor({ value, onSave }: { value: AvatarConfig; onSave: (value: AvatarConfig) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saved, setSaved] = useState(false)
  const avatar = editing ? draft : value
  function update<K extends keyof AvatarConfig>(key: K, next: AvatarConfig[K]) { setDraft(prev => ({ ...prev, [key]: next })) }
  return <>
    <div className="character-stage"><span className="character-stage-label">FORMA / VOTRE AVENTURE</span><div className="character-orbit"/><Avatar config={avatar}/><span className="character-caption">{editing ? 'APERÇU EN DIRECT' : avatar.name}</span></div>
    <div className="avatar-customization">
      {!editing ? <><button className="avatar-edit-button" onClick={() => { setDraft(value); setEditing(true); setSaved(false) }}><SlidersHorizontal size={15}/> Personnaliser mon personnage</button>{saved && <p className="avatar-save-status" role="status">Apparence appliquée.</p>}</> : <form onSubmit={event => { event.preventDefault(); onSave({ ...draft, name: draft.name.trim() }); setEditing(false); setSaved(true) }}>
        <div className="avatar-editor-title"><h3>À votre image</h3><button type="button" aria-label="Annuler la personnalisation" onClick={() => setEditing(false)}><X size={16}/></button></div>
        <label>Nom du personnage<input value={draft.name} maxLength={30} required pattern=".*\S.*" onChange={e => update('name', e.target.value)}/></label>
        <label>Silhouette<select value={draft.silhouette} onChange={e => update('silhouette', e.target.value as AvatarConfig['silhouette'])}><option value="athletic">Athlétique</option><option value="slender">Élancée</option></select></label>
        <label>Coiffure<select value={draft.hair} onChange={e => update('hair', e.target.value as AvatarConfig['hair'])}><option value="short">Courte</option><option value="bob">Carré</option><option value="tied">Attachée</option></select></label>
        <label>Tenue<select value={draft.clothing} onChange={e => update('clothing', e.target.value as AvatarConfig['clothing'])}><option value="jacket">Veste d’aventure</option><option value="explorer">Exploration</option></select></label>
        {([{ key: 'skin', name: 'Peau', colors: SKIN_COLORS }, { key: 'hairColor', name: 'Cheveux', colors: HAIR_COLORS }, { key: 'outfit', name: 'Tenue', colors: OUTFIT_COLORS }] as const).map(({ key, name, colors }) => <fieldset key={key}><legend>{name}</legend><div className="avatar-swatches">{colors.map((color, index) => <button type="button" key={color} style={{ background: color }} aria-label={`${name} : couleur ${index + 1}`} aria-pressed={draft[key] === index} onClick={() => update(key, index)}>{draft[key] === index && <Check size={15}/>}</button>)}</div></fieldset>)}
        <div className="avatar-editor-actions"><button type="button" onClick={() => setDraft(DEFAULT_AVATAR)}>Réinitialiser</button><button type="submit"><Check size={14}/> Appliquer</button></div>
        <button className="avatar-cancel" type="button" onClick={() => setEditing(false)}>Annuler</button>
      </form>}
    </div>
  </>
}
