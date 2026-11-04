import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export const AVATAR_BUCKET='forma-avatars'
export function isAvatarPath(path:unknown):path is string {
 return typeof path==='string' && /^[0-9a-f-]{36}\/avatar\.webp$/.test(path)
}

export function AvatarImage({path,alt='Mon personnage',style}:{path?:string;alt?:string;style?:CSSProperties}) {
 const [url,setUrl]=useState<string|null>(null)
 useEffect(()=>{
  let active=true
  setUrl(null)
  if(!path||!isAvatarPath(path))return
  supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path,3600).then(({data,error})=>{
   if(active&&!error&&data?.signedUrl)setUrl(data.signedUrl)
  })
  return ()=>{active=false}
 },[path])
 if(!url)return null
 return <img src={url} alt={alt} style={{width:'100%',height:'100%',objectFit:'contain',...style}}/>
}

export async function prepareAvatar(file:File):Promise<Blob> {
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Choisis une image JPG, PNG ou WebP.')
 if(file.size>5*1024*1024)throw Error('Image trop volumineuse : maximum 5 Mo.')
 const url=URL.createObjectURL(file)
 try {
  const image=new Image()
  image.src=url
  await image.decode()
  if(image.width<200||image.height<200)throw Error('Image trop petite : minimum 200 pixels.')
  const scale=Math.min(1,1200/Math.max(image.width,image.height))
  const canvas=document.createElement('canvas')
  canvas.width=Math.round(image.width*scale)
  canvas.height=Math.round(image.height*scale)
  const context=canvas.getContext('2d')
  if(!context)throw Error('Traitement de l’image indisponible.')
  context.drawImage(image,0,0,canvas.width,canvas.height)
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',.85))
  if(!blob||blob.type!=='image/webp')throw Error('Conversion WebP indisponible.')
  return blob
 } finally {URL.revokeObjectURL(url)}
}
