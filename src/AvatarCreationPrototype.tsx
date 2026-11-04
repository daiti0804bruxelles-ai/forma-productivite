import { useEffect, useState } from 'react'

/**
 * Prototype local de création d'avatar.
 * Aucune photo n'est envoyée, enregistrée ou utilisée pour entraîner une IA.
 * Le branchement à une fonction serveur sera ajouté après validation du coût
 * et des règles de confidentialité.
 */
export default function AvatarCreationPrototype() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const selectPhoto = (next: File | undefined) => {
    setError('')
    setFile(null)
    if (!next) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(next.type)) {
      setError('Choisis une image JPG, PNG ou WebP.')
      return
    }
    if (next.size > 5 * 1024 * 1024) {
      setError('La photo doit peser moins de 5 Mo.')
      return
    }
    setFile(next)
  }

  return <section className="panel" style={{marginTop:20,padding:24}}>
    <h2 style={{fontSize:19,margin:'0 0 8px'}}>Créer mon aventurier avec une photo</h2>
    <p style={{fontSize:13,opacity:.75,margin:'0 0 16px'}}>Première étape : importer ton portrait et vérifier son cadrage. La génération IA n'est pas encore activée.</p>
    <label style={{display:'inline-block',fontSize:14,fontWeight:700,marginBottom:8}} htmlFor="forma-avatar-photo">Photo du visage</label>
    <input id="forma-avatar-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>selectPhoto(event.target.files?.[0])} style={{display:'block',width:'100%',maxWidth:450,fontSize:13}}/>
    <p style={{fontSize:12,opacity:.65,marginTop:8}}>JPG, PNG ou WebP · 5 Mo maximum · Photo de face et bien éclairée</p>
    {error&&<p role="alert" style={{fontSize:13,color:'#ef4444'}}>{error}</p>}
    {preview&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))',gap:18,marginTop:18,alignItems:'start'}}>
      <div><strong style={{fontSize:13}}>Ta photo (aperçu local)</strong><img src={preview} alt="Aperçu de la photo sélectionnée" style={{display:'block',width:'100%',maxWidth:300,aspectRatio:'3 / 4',objectFit:'cover',borderRadius:14,marginTop:10}}/></div>
      <div><strong style={{fontSize:13}}>Prochaine étape : avatar Forma</strong><div style={{marginTop:10,padding:20,minHeight:220,border:'1px dashed rgba(120,120,128,.5)',borderRadius:14,display:'grid',placeItems:'center',textAlign:'center'}}><p style={{fontSize:13,opacity:.7}}>Le personnage cartoon aventurier sera généré ici, en respectant la DA officielle.</p></div></div>
    </div>}
    <p style={{fontSize:12,opacity:.65,margin:'16px 0 0'}}>Confidentialité : cet aperçu reste dans ton navigateur. Aucune photo n'est transmise à Supabase ou à un service d'IA à cette étape.</p>
  </section>
}
