import { HAIR_COLORS, OUTFIT_COLORS, SKIN_COLORS } from './avatarModel'
import type { AvatarConfig } from './avatarModel'

/** Avatar vectoriel à facettes : chaque partie reste personnalisable sans image figée. */
export default function Avatar({ config }: { config: AvatarConfig }) {
  const skin = SKIN_COLORS[config.skin]
  const hair = HAIR_COLORS[config.hairColor]
  const outfit = OUTFIT_COLORS[config.outfit]
  const slim = config.silhouette === 'slender'
  const jacket = config.clothing === 'jacket'
  return <svg className="dossier-character" viewBox="0 0 260 480" role="img" aria-label={`Personnage de ${config.name}, style à facettes, ${jacket ? 'veste' : 'tenue d’exploration'}`}>
    <ellipse cx="130" cy="455" rx="72" ry="12" fill="#000" opacity=".3"/>
    {config.hair === 'tied' && <path d="m154 38 24 9 1 44-14 30-12-30Z" fill={hair}/>}
    {config.hair === 'bob' && <path d="m94 39-8 37-4 38 16 14 18-13h34l22 11-5-43-10-44Z" fill={hair}/>}
    <g transform={slim ? 'translate(13 0) scale(.9 1)' : undefined}>
      <path d="m107 88-4 31 26 23 29-22-8-32Z" fill={skin}/><path d="m109 94 39 0-18 24Z" fill="#000" opacity=".19"/>
      <path d="m94 259-7 79 12 93 25 0 7-116 9 116h26l8-95-13-77Z" fill="#414739"/>
      <path d="m94 270 24 14-12 66-14-17Zm46 12 23-12 8 66-19 15Z" fill="#5b604a"/>
      <path d="m107 351 17-42-7 114H99Zm45 0-17-42 5 114h25Z" fill="#232c28" opacity=".55"/>
      <path d="m151 304 23-3 5 32-23 5Z" fill="#555c47" stroke="#292f26" strokeWidth="2"/>
      <path d="m150 303 24-3 1 9-24 4Z" fill="#747763"/>
      <path d="m98 423-8 15-19 10-2 11 52 0 3-34m17 0-1 30 12 8 29-1-2-14-14-21" fill="#292d30"/>
      <path d="m94 435 25-3-5 14-34 7Zm52 0 18 0 10 17-21-2Z" fill="#464c50"/>
      <path d="m69 456 51-1m21 2 40 1" stroke="#12191d" strokeWidth="6"/>
      <path d="m102 116-32 18-21 63-13 62 21 10 29-66 9-35-2 91h69l-4-91 22 29-23 27 14 17 39-32 4-22-31-51-35-19-19 16Z" fill={jacket ? '#45474e' : outfit}/>
      <path d="m70 135 20 34-12 39-28-11Zm32-19 26 16-15 127-20-1Zm46 0 11 52 4 90-30 1-3-125Z" fill={outfit} opacity={jacket ? '.7' : '.4'}/>
      <path d="m70 135 20 34-31 21Zm91 0 30 30-13 26-20-23Z" fill="#fff" opacity=".09"/>
      <path d="m49 199 28 8-20 54-20-6Zm140-31 22 19-9 19-24-15Z" fill="#000" opacity=".17"/>
      <path d="m105 132 20 8 4 117-18 0Z" fill="#a0b4b1"/>
      {jacket ? <g fill="none" stroke={outfit} strokeWidth="5"><path d="m107 132-6 126m32-120 7 120m-42-47-13 18m55-18 14 17m-3-65h19"/></g> : <><path d="m96 246-15 49 45 9 49-9-15-50Z" fill={outfit}/><path d="m119 260-7 42 18 2 6-44Z" fill="#fff" opacity=".08"/></>}
      <path d="m92 259h72v10H92" fill="#282c2a"/><path d="m121 258h15v13h-15Z" fill="#a5a499"/><path d="m125 261h7v7h-7Z" fill="#42463e"/>
      <path d="m36 256-4 25 7 18 8 2 4-16 8-16-9-11Z" fill={skin}/>
      <path d="m168 223-22 6-21 19 5 6 19-10-12 12 6 4 21-13 16-12Z" fill={skin}/>
      <path d="m38 255 20 9-4 11-20-9Zm121-33 15 17 9-8-14-17Z" fill="#34383d"/>
      <path d="m94 127 52 142" fill="none" stroke="#715746" strokeWidth="10" opacity={jacket ? 0 : 1}/>
      {!jacket && <path d="m143 244 20 2 6 47-29 6-8-14Z" fill="#75624b" stroke="#3d352e" strokeWidth="2"/>}
    </g>
    <path d="m96 49-3 22 9 23 13 16 17 5 18-10 13-22 1-32-17-22-31-1Z" fill={skin}/>
    <path d="m96 54 17-15 18 4-3 58-15-10-12-19Z" fill="#fff" opacity=".12"/>
    <path d="m147 43 17 13-3 27-12 18-16 9-5-12 13-13Z" fill="#000" opacity=".13"/>
    <path d="m99 56 13-9 17 4 21-7 13 12 3-23-12-18-23-9-25 8-12 16Z" fill={hair}/>
    <path d="m106 17 24-7 23 10-12 10-30-4Z" fill="#fff" opacity=".1"/>
    {config.hair === 'bob' && <><path d="m98 40-6 40 8 28 8-16-5-31 14-22Z" fill={hair}/><path d="m150 39 13 17 3 48-14 14 3-40-12-23Z" fill={hair}/></>}
    {config.hair === 'tied' && <path d="m98 39 11-19 27-6 22 17-7 19-24-13-23 13Z" fill={hair}/>}
    <path d="m104 62 10-5 12 4-2 4-10-2-10 3m30-5 13-4 10 6-2 4-10-3-10 2" fill={hair}/>
    <path d="m107 70 15 0-5 5-7-1m25-4h15l-4 5-8-1" fill="#e4e5d9"/>
    <path d="m114 69 1 6m25-6 0 6" stroke="#425951" strokeWidth="5"/>
    <path d="m130 68-5 17 10-1" fill="none" stroke="#000" opacity=".18" strokeWidth="2"/>
    <path d="m117 94 13-3 12 2-11 5Z" fill="#915f4b" opacity=".8"/>
    <path d="m116 99 15 5 10-6-9 11Z" fill="#fff" opacity=".08"/>
  </svg>
}
