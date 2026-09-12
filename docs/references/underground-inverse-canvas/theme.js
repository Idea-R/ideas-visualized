const root = document.documentElement
const button = document.querySelector('.theme-toggle')
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)')
let active = null

function applyTheme(theme) {
  root.dataset.theme = theme
  button.setAttribute('aria-pressed', String(theme === 'dark'))
  button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#080f10' : '#f1f2ef')
  try { localStorage.setItem('aau-theme', theme) } catch { /* No persistence in restricted storage. */ }
}

const clamp = value => Math.max(0, Math.min(1, value))

function tileFrames(width, height, origin) {
  // Bounded tile count and precomputed masks keep per-frame work out of JS.
  const size = Math.max(32, Math.sqrt(width * height / 520))
  const cols = Math.ceil(width / size), rows = Math.ceil(height / size)
  const cw = width / cols, ch = height / rows
  const maxDistance = Math.hypot(Math.max(origin.x,width-origin.x),Math.max(origin.y,height-origin.y))
  const tiles = []
  for (let row=0;row<rows;row++) for(let col=0;col<cols;col++) {
    const cx = (col+.5)*cw, cy = (row+.5)*ch
    const distance = Math.hypot(cx-origin.x,cy-origin.y)/maxDistance
    tiles.push({ cx,cy,delay:distance*820+((col*7+row*13)%5)*13, sign:(col+row)%2 ? 1 : -1 })
  }
  root.style.setProperty('--flip-cell-x',`${cw}px`)
  root.style.setProperty('--flip-cell-y',`${ch}px`)
  const old = [], next = []
  const duration = 1650
  for(let frame=0;frame<=48;frame++) {
    const time=frame/48*duration
    let oldPath='',newPath=''
    for(const tile of tiles) {
      const p=clamp((time-tile.delay-160)/490)
      const angle=p*Math.PI
      const face=Math.cos(angle)
      const seam=Math.sin(angle)*1.6
      const halfWidth=Math.max(.01,(cw/2+.55)*Math.abs(face)-seam)
      const shear=Math.sin(angle)*tile.sign*ch*.075
      const halfHeight=ch/2+.55-Math.sin(angle)*1.3
      const x=tile.cx,y=tile.cy
      const path=`M${(x-halfWidth).toFixed(1)} ${(y-halfHeight+shear).toFixed(1)}L${(x+halfWidth).toFixed(1)} ${(y-halfHeight-shear).toFixed(1)}L${(x+halfWidth).toFixed(1)} ${(y+halfHeight-shear).toFixed(1)}L${(x-halfWidth).toFixed(1)} ${(y+halfHeight+shear).toFixed(1)}Z`
      // Both paths retain all vertices for smooth interpolation between frames.
      const absent=`M${x.toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${y.toFixed(1)}L${x.toFixed(1)} ${y.toFixed(1)}Z`
      oldPath += face >= 0 ? path : absent
      newPath += face < 0 ? path : absent
    }
    old.push({clipPath:`path('${oldPath}')`,offset:frame/48})
    next.push({clipPath:`path('${newPath}')`,offset:frame/48})
  }
  return { old,next,duration,count:tiles.length }
}

async function toggleTheme(event) {
  if (active || root.dataset.overture === 'playing') return
  const theme=root.dataset.theme === 'dark' ? 'light' : 'dark'
  if (motionPreference.matches || !document.startViewTransition) {
    applyTheme(theme)
    return
  }
  const box=button.getBoundingClientRect()
  const restoreFocus=document.activeElement === button
  const origin={x:event.detail ? event.clientX : box.left+box.width/2,y:event.detail ? event.clientY : box.top+box.height/2}
  button.setAttribute('aria-busy','true')
  button.disabled=true
  const job={ transition:null,animations:[],cancelled:false,lattice:null }
  active=job
  root.dataset.themeTransition='pixels'
  root.style.setProperty('--flip-origin-x',`${origin.x}px`)
  root.style.setProperty('--flip-origin-y',`${origin.y}px`)
  root.style.setProperty('--flip-bed',theme === 'dark' ? '#16342e' : '#253d36')
  const interrupt=()=>{job.cancelled=true;job.transition?.skipTransition();job.animations.forEach(animation=>animation.cancel())}
  const onKey=event=>{if(event.key==='Escape')interrupt()}
  const onMotion=()=>{if(motionPreference.matches)interrupt()}
  addEventListener('resize',interrupt,{once:true})
  addEventListener('wheel',interrupt,{once:true,passive:true})
  addEventListener('touchmove',interrupt,{once:true,passive:true})
  addEventListener('keydown',onKey)
  motionPreference.addEventListener('change',onMotion)
  try {
    const frames=tileFrames(innerWidth,innerHeight,origin)
    root.dataset.themeTiles=String(frames.count)
    const lattice=document.createElement('div')
    lattice.className='theme-lattice'
    lattice.setAttribute('aria-hidden','true')
    document.body.append(lattice)
    job.lattice=lattice
    const radius=Math.hypot(Math.max(origin.x,innerWidth-origin.x),Math.max(origin.y,innerHeight-origin.y))
    const charge=lattice.animate([{clipPath:`circle(0px at ${origin.x}px ${origin.y}px)`},{clipPath:`circle(${radius}px at ${origin.x}px ${origin.y}px)`}],{duration:280,easing:'cubic-bezier(.15,.6,.3,1)',fill:'both'})
    job.animations.push(charge)
    await charge.finished
    if(job.cancelled){applyTheme(theme);return}
    job.transition=document.startViewTransition(()=>{lattice.remove();applyTheme(theme)})
    await job.transition.ready
    if(job.cancelled){job.transition.skipTransition();return}
    for(const [face,keyframes] of [['old',frames.old],['new',frames.next]]) {
      const animation=root.animate(keyframes,{duration:frames.duration,easing:'linear',fill:'both',pseudoElement:`::view-transition-${face}(root)`})
      animation.id=`theme-${face}`
      job.animations.push(animation)
    }
    await Promise.all(job.animations.map(animation=>animation.finished))
    job.animations.forEach(animation=>animation.cancel())
    job.lattice?.remove()
    await job.transition.finished
  } catch {
    job.transition?.skipTransition()
    applyTheme(theme)
  } finally {
    job.animations.forEach(animation=>animation.cancel())
    job.lattice?.remove()
    removeEventListener('resize',interrupt)
    removeEventListener('wheel',interrupt)
    removeEventListener('touchmove',interrupt)
    removeEventListener('keydown',onKey)
    motionPreference.removeEventListener('change',onMotion)
    delete root.dataset.themeTransition
    delete root.dataset.themeTiles
    button.removeAttribute('aria-busy')
    button.disabled=false
    if(restoreFocus && (document.activeElement === document.body || document.activeElement === button)) button.focus({preventScroll:true})
    active=null
  }
}
applyTheme(root.dataset.theme === 'dark' ? 'dark' : 'light')
button.hidden=false
button.addEventListener('click',toggleTheme)
