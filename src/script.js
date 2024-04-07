import * as THREE from 'three'
import gsap from 'gsap'
import GUI from 'lil-gui'

import { Rendering } from './rendering'
import decodeVertex from './shaders/decode/vertex.glsl'
import decodeFragment from './shaders/decode/fragment.glsl'

// ************************************************************************** //
// ********************************* Options ******************************** //
// ************************************************************************** //

const options = { text: 'FANCY WEBSITE PRESENTS:' }

// ************************************************************************** //
// ***************************** Setup Rendering **************************** //
// ************************************************************************** //

const rendering = new Rendering(document.querySelector('#canvas'))

// ************************************************************************** //
// ******************************** Textures ******************************** //
// ************************************************************************** //

const textureLoader = new THREE.TextureLoader()

textureLoader.load('/textures/codepage12.png', (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace
  uniforms.tMap.value = texture
})

const noiseTexture = textureLoader.load('/textures/grey noise medium.png', (texture) => {
  uniforms.tNoise.value = texture
  uniforms.uNoiseResolution.value.set(256, 256)
})

// ************************************************************************** //
// ********* Function to decode postions of the char in the texture ********* //
// ************************************************************************** //

const getCharsPositions = (text) => {
  const baseCharCode = ' '.charCodeAt(0)
  const positions = []

  for (let char of text) {
    const charCode = char.charCodeAt(0) - baseCharCode

    const gridMax = 16
    const x = charCode % gridMax
    const y = 13 - Math.floor(charCode / gridMax)

    positions.push(x, y)
  }

  return positions
}

// ************************************************************************** //
// ******************************** Uniforms ******************************** //
// ************************************************************************** //

const uniforms = {
  uTime: new THREE.Uniform(0),
  uTransitionTime: new THREE.Uniform(),
  uResolution: new THREE.Uniform(
    new THREE.Vector2(rendering.vp.canvas.width, rendering.vp.canvas.height),
  ),
  uProgress: new THREE.Uniform(0),
  tMap: new THREE.Uniform(),
  tNoise: new THREE.Uniform(),
  uNoiseResolution: new THREE.Uniform(new THREE.Vector2()),
  uType: new THREE.Uniform(4),
  uNumChars: new THREE.Uniform(),
  uCharPos: new THREE.Uniform(),
  uDuration: new THREE.Uniform(2.2),
  uDimmingFactor: new THREE.Uniform(11),
  uPostEffectDurationMultiplier: new THREE.Uniform(0),
  uRevealDelay: new THREE.Uniform(0.3),
  uColor: new THREE.Uniform(new THREE.Color()),
}

// ************************************************************************** //
// ******************************** Material ******************************** //
// ************************************************************************** //
const meshGeometry = new THREE.PlaneGeometry(2, 2, 1, 1)
const meshMaterial = new THREE.ShaderMaterial({
  transparent: true,
  uniforms,
  vertexShader: decodeVertex,
  fragmentShader: decodeFragment,
})

// ************************************************************************** //
// ************************** Shader Customization ************************** //
// ************************************************************************** //
uniforms.uNumChars.value = options.text.length

meshMaterial.onBeforeCompile = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    'uniform float uCharPos[2];',
    `uniform float uCharPos[${options.text.length * 2}];`,
  )
}
uniforms.uCharPos.value = getCharsPositions(options.text)

// ************************************************************************** //
// ********************************** Mesh ********************************** //
// ************************************************************************** //
const mesh = new THREE.Mesh(meshGeometry, meshMaterial)
rendering.scene.add(mesh)

// ************************************************************************** //
// ********************* Handle the window resize event ********************* //
// ************************************************************************** //
function onWindowResize() {
  // Update the rendering view and camera
  rendering.onResize()

  //update uniforms
  uniforms.uResolution.value.x = rendering.vp.canvas.width
  uniforms.uResolution.value.y = rendering.vp.canvas.height
}

window.addEventListener('resize', onWindowResize)

// ************************************************************************** //
// ******************************* Animations ******************************* //
// ************************************************************************** //
const presetOptions = [
  { dur: 2, dim: 0, mult: 0, del: 0.1 },
  { dur: 3.55, dim: 5, mult: 0, del: 0.5 },
  { dur: 2, dim: 2, mult: 4, del: 0 },
  { dur: 1.5, dim: 1.5, mult: 0, del: 0 },
  { dur: 2, dim: 11, mult: 0, del: 0.3 },
]

const animate = (data) => {
  if (data) {
    const { preset } = data
    uniforms.uDuration.value = presetOptions[preset].dur
    uniforms.uDimmingFactor.value = presetOptions[preset].dim
    uniforms.uPostEffectDurationMultiplier.value = presetOptions[preset].mult
    uniforms.uRevealDelay.value = presetOptions[preset].del
    uniforms.uType.value = preset
  }
  uniforms.uTransitionTime.value = 0.0

  gsap.fromTo(
    uniforms.uProgress,
    { value: 0 },
    {
      value: 1,
      duration: uniforms.uDuration.value,
      ease: 'power2.in',
      onUpdate: () => {
        progressController.updateDisplay()
      },
    },
  )
}
//initial animation
gsap.delayedCall(0.2, () => animate())

// ************************************************************************** //
// ********************************** Debug ********************************* //
// ************************************************************************** //
const debugObject = {
  textColor: '#fff',
  uDuration: 1.5,
  animate: () => animate(),
  preset1: () => animate({ preset: 0 }),
  preset2: () => animate({ preset: 1 }),
  preset3: () => animate({ preset: 2 }),
  preset4: () => animate({ preset: 3 }),
  preset5: () => animate({ preset: 4 }),
}

const gui = new GUI()

window.addEventListener('keydown', (event) => {
  if (event.key === 'h') {
    gui.show(gui._hidden)
  }
})

gui.add(debugObject, 'preset1')
gui.add(debugObject, 'preset2')
gui.add(debugObject, 'preset3')
gui.add(debugObject, 'preset4')
gui.add(debugObject, 'preset5')

//shader options
const shaderFolder = gui.addFolder('shader')
shaderFolder.close()

shaderFolder.addColor(debugObject, 'textColor').onChange(() => {
  uniforms.uColor.value.set(debugObject.textColor)
})

const progressController = shaderFolder
  .add(uniforms.uProgress, 'value', 0, 1, 0.001)
  .name('uProgress')
shaderFolder.add(uniforms.uType, 'value', 0, 4, 1).name('animationType')
shaderFolder.add(debugObject, 'uDuration', 0.1, 10, 0.01).onChange((val) => {
  uniforms.uDuration.value = val
})
shaderFolder.add(uniforms.uDimmingFactor, 'value', 1, 20, 0.01).name('uDimmingFactor')
shaderFolder
  .add(uniforms.uPostEffectDurationMultiplier, 'value', 0, 20, 0.01)
  .name('uAfterEffectMultiplier')
shaderFolder.add(uniforms.uRevealDelay, 'value', 0, 1, 0.01).name('uRevealDelay')
shaderFolder.add(debugObject, 'animate')

// ************************************************************************** //
// ************************ Main Render Loop Function *********************** //
// ************************************************************************** //
function tick(time, delta) {
  //Update uniforms
  if (uniforms.uProgress.value) uniforms.uTransitionTime.value += delta * 0.001
  else uniforms.uTransitionTime.value = 0

  uniforms.uTime.value += delta * 0.001

  // Render
  rendering.render()
}

gsap.ticker.add(tick)
