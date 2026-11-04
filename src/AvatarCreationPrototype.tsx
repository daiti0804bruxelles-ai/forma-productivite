import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { AVATAR_BUCKET, prepareAvatar } from './avatarStorage'

/**
 * Prototype local de création d'avatar.
 * Aucune photo n'est envoyée, enregistrée ou utilisée pour entraîner une IA.
 * Le branchement à une fonction serveur sera ajouté après validation du coût
 * et des règles de confidentialité.
 */
export default function AvatarCreationPrototype({userId,onSaved}:{userId:string;onSaved:(path:string)=>void}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saving,setSaving]=useState(false)
  const [success,setSuccess]=useState(false)

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const selectPhoto = (next: File | undefined) => {
    setError('')
    setSuccess(false)
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

  const save=async()=>{
    if(!file||saving)return
    setSaving(true);setError('');setSuccess(false)
    try{
      const {data:{user}}=await supabase.auth.getUser()
      if(!user||user.id!==userId)throw Error('Session expirée. Reconnecte-toi.')
      const blob=await prepareAvatar(file)
      const path=`${userId}/avatar.webp`
      const {error:uploadError}=await supabase.storage.from(AVATAR_BUCKET).upload(path,blob,{contentType:'image/webp',upsert:true,cacheControl:'60'})
      if(uploadError)throw new Error('Import impossible. Vérifie que le bucket privé forma-avatars et ses règles d’accès ont été créés dans Supabase.')
      onSaved(path)
      setSuccess(true)
    }catch(error){setError(error instanceof Error?error.message:'Impossible d’enregistrer le personnage.')}
    finally{setSaving(false)}
  }

  return <section className="panel" style={{marginTop:20,padding:24}}>
    <h2 style={{fontSize:19,margin:'0 0 8px'}}>Importer mon personnage Forma</h2>
    <p style={{fontSize:13,opacity:.75,margin:'0 0 16px'}}>Importe une image déjà générée dans la direction artistique officielle. Le personnage sera affiché de face dans Compétences.</p>
    <label style={{display:'inline-block',fontSize:14,fontWeight:700,marginBottom:8}} htmlFor="forma-avatar-photo">Image du personnage</label>
    <input id="forma-avatar-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={event=>selectPhoto(event.target.files?.[0])} style={{display:'block',width:'100%',maxWidth:450,fontSize:13}}/>
    <p style={{fontSize:12,opacity:.65,marginTop:8}}>JPG, PNG ou WebP · 5 Mo maximum · Personnage entier et de face</p>
    {error&&<p role="alert" style={{fontSize:13,color:'#ef4444'}}>{error}</p>}
    {preview&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))',gap:18,marginTop:18,alignItems:'start'}}>
      <div><strong style={{fontSize:13}}>Image sélectionnée</strong><img src={preview} alt="Aperçu de la photo sélectionnée" style={{display:'block',width:'100%',maxWidth:300,aspectRatio:'3 / 4',objectFit:'cover',borderRadius:14,marginTop:10}}/></div>
      <div><strong style={{fontSize:13}}>Dans Forma</strong><div style={{marginTop:10,padding:20,minHeight:220,border:'1px dashed rgba(120,120,128,.5)',borderRadius:14,display:'grid',placeItems:'center',textAlign:'center'}}><p style={{fontSize:13,opacity:.7}}>Une fois enregistrée, ton image apparaîtra dans Mes compétences.</p></div></div>
    </div>}
    {file&&<button type="button" className="primary-btn" onClick={()=>{void save()}} disabled={saving} style={{marginTop:18}}>{saving?'Enregistrement…':'Enregistrer mon personnage'}</button>}
    {success&&<p role="status" style={{color:'#22c55e',fontSize:13}}>Personnage enregistré dans ton espace privé Supabase.</p>}
    <p style={{fontSize:12,opacity:.65,margin:'16px 0 0'}}>L'image sélectionnée reste locale jusqu'au clic sur Enregistrer. Elle sera ensuite stockée dans ton espace privé Supabase. Aucune IA n'est appelée.</p>
  </section>
}
