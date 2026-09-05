/**
 * World-plate sampler (World V1 — CAMERA-AND-SCALE-SPEC.md §2).
 *
 * A single-texture WebGL pipeline that composites the 1:1 world plate onto
 * the canvas at a non-integer scale without crawl or blur: texture
 * coordinates are snapped to texel centres, and only within one screen
 * pixel of a texel boundary does the sample slide across the seam (the
 * standard "pixel-art anti-aliasing" sampler). Texel interiors are exact;
 * boundaries resolve to one screen pixel; motion is smooth. The texels-per-
 * pixel ratio is a uniform (the composite scale is fixed), so no derivative
 * extension is required. Presentation only.
 */
import Phaser from 'phaser';

export const WORLD_PLATE_PIPELINE = 'WorldPlateSampler';

const FRAGMENT_SHADER = [
  '#define SHADER_NAME WORLD_PLATE_FS',
  '#ifdef GL_FRAGMENT_PRECISION_HIGH',
  'precision highp float;',
  '#else',
  'precision mediump float;',
  '#endif',
  'uniform sampler2D uMainSampler;',
  'uniform vec2 uTexSize;',
  'uniform vec2 uTexelsPerPixel;',
  'varying vec2 outTexCoord;',
  'varying float outTintEffect;',
  'varying vec4 outTint;',
  'void main ()',
  '{',
  '    vec2 pix = outTexCoord * uTexSize;',
  '    vec2 seam = floor(pix + 0.5);',
  '    vec2 dudv = max(uTexelsPerPixel, vec2(0.0001));',
  '    pix = seam + clamp((pix - seam) / dudv, -0.5, 0.5);',
  '    vec4 texture = texture2D(uMainSampler, pix / uTexSize);',
  '    vec4 texel = vec4(outTint.bgr * outTint.a, outTint.a);',
  '    vec4 color = texture * texel;',
  '    if (outTintEffect == 1.0)',
  '    {',
  '        color.rgb = mix(texture.rgb, outTint.bgr * outTint.a, texture.a);',
  '    }',
  '    else if (outTintEffect == 2.0)',
  '    {',
  '        color = texel;',
  '    }',
  '    gl_FragColor = color;',
  '}',
].join('\n');

export class WorldPlateSamplerPipeline
  extends Phaser.Renderer.WebGL.Pipelines.SinglePipeline
{
  private texWidth = 1;
  private texHeight = 1;
  private texelsPerPixel = 1;

  constructor(game: Phaser.Game) {
    super({ game, fragShader: FRAGMENT_SHADER });
  }

  /** Plate size in texels and the fixed texels-per-screen-pixel ratio. */
  configure(width: number, height: number, texelsPerPixel: number) {
    this.texWidth = width;
    this.texHeight = height;
    this.texelsPerPixel = texelsPerPixel;
  }

  onBind(gameObject?: Phaser.GameObjects.GameObject) {
    super.onBind(gameObject);
    this.set2f('uTexSize', this.texWidth, this.texHeight);
    this.set2f('uTexelsPerPixel', this.texelsPerPixel, this.texelsPerPixel);
  }
}

/**
 * Registers the sampler once per renderer (WebGL only) and returns it, or
 * null under the Canvas renderer (where the plate composites with plain
 * scaling).
 */
export function ensureWorldPlatePipeline(
  scene: Phaser.Scene,
): WorldPlateSamplerPipeline | null {
  const renderer = scene.sys.renderer;

  if (
    !(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) ||
    renderer.pipelines === null
  ) {
    return null;
  }

  const existing = renderer.pipelines.get(WORLD_PLATE_PIPELINE);

  if (existing instanceof WorldPlateSamplerPipeline) {
    return existing;
  }

  const pipeline = new WorldPlateSamplerPipeline(scene.game);

  renderer.pipelines.add(WORLD_PLATE_PIPELINE, pipeline);

  return pipeline;
}
