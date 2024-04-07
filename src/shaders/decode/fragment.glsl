#ifndef PI
#define PI 3.141592653589793
#endif

uniform float uTime;
uniform float uTransitionTime;
uniform float uProgress;
uniform vec2 uResolution;
uniform sampler2D tMap;
uniform sampler2D tNoise;
uniform vec2 uNoiseResolution;
uniform float uNumChars;
uniform float uCharPos[2];
uniform float uDpr;
uniform vec3 uColor;
uniform float uType;
uniform float uDuration;
uniform float uDimmingFactor;
uniform float uPostEffectDurationMultiplier;
uniform float uRevealDelay;

varying vec2 vUv;

#include "../includes/eases.glsl"
#include "../includes/transformUV.glsl"

// modified from https ://www.shadertoy.com/view/ldccW4
float text(vec2 fragCoord, float offset, float threshold) {
    vec2 uv = mod(fragCoord.xy, 16.) / 16.;
    vec2 block = fragCoord / 16. - uv;

    float transformationMatrix[9] = float[9](-0.05, 0., 0., 0., 0., 1.1, 1.3, 0.5, 0.5);
    uv = transformUV(uv, transformationMatrix);// scale the letters up a bit

    vec2 noiseUv = uv + floor(texture(tNoise, block / uNoiseResolution + uTime * .002).xy * 16.); // randomize letters
    noiseUv *= .0625; // bring back into 0-1 range
    uv *= .0625; // bring back into 0-1 range

    //decode letters
    uv.x += (uCharPos[int(offset) * 2]) / 16.;
    uv.y += uCharPos[int(offset * 2. + 1.)] / 16.;

    uv = mix(noiseUv, uv, threshold);

    return texture(tMap, uv).r;
}

vec3 shine(vec2 fragCoord, float delay, float threshold) {
    float shine = 0.;

    if (uType == 0.)
        return uColor;
    if (uType == 1.) {
        fragCoord.x -= mod(fragCoord.x, 16.);
        float offset = sin(fragCoord.x * 15.);
        float speed = cos(fragCoord.x * 3.) * .3 + 0.7;
        shine = fract(fragCoord.y / uResolution.y + uTime * speed + offset);
    } else if (uType == 2.) {

        float periods = 1. * PI; // back-and-forth periods per unit of time. aka SPEED
        float sineMovement = sin(uTime * periods);
        float constantSineSpeed = asin(sineMovement) * (1. / PI); //  incorporate constant speed

        float shiftedX = (vUv.x) * 16. - constantSineSpeed;

        shine = abs(mod(shiftedX, 2.));
    } else if (uType == 3.) {

        float scaledTime = (PI / uDuration / 4.) * uTransitionTime;
        float wave = sin(scaledTime);
        wave *= (1. + (1. - uProgress) / 6.);//make faster at the start

        float shiftedX = -(vUv.x) + wave;

        shine = abs(mod(shiftedX, 2.));
    } else {

        float scaledTime = (PI / uDuration / 1.1) * uTransitionTime;
        float wave = sin(scaledTime);
        float shiftedX = (vUv.x) - 0.95 + wave;

        shine = abs(mod(shiftedX, 2.));
    }

    float timePostEffect = uTransitionTime - uDuration;
    timePostEffect = max(0., timePostEffect);

    timePostEffect = mix(1., timePostEffect / uPostEffectDurationMultiplier, float(uPostEffectDurationMultiplier != 0.0));
    timePostEffect = clamp(timePostEffect, 0., 1.);

    float finalShine = min(1., shine / uDimmingFactor + quarticOut(timePostEffect));

    vec3 color = mix(uColor / (shine * uDimmingFactor), uColor / finalShine, threshold);
    return color;
}

void main() {
    float uDuration = 1.0;
    float uInterval = 5.0;

    float strength = smoothstep(uDuration * 0.5, uDuration, uDuration - mod(uTime, uInterval));

    vec2 fragCoord = vUv * uResolution;
    float lineHeight = 16.0; // Height of the text line
    float lineWidth = 16. * uNumChars; // Width of the text line
    float maxLength = floor(uResolution.x / 16.);
    float maxHeight = floor(uResolution.y / 16.);

    if (fragCoord.x / 16. > floor((maxLength - uNumChars) / 2.) && fragCoord.x / 16. < uNumChars + floor((maxLength - uNumChars) / 2.) &&
        fragCoord.y / 16. > floor((maxHeight - 1.) / 2.) && fragCoord.y / 16. < 1. + floor((maxHeight - 1.) / 2.)) {

        vec2 uv2 = mod(fragCoord.xy, 16.) / 16.;
        vec2 block = fragCoord / 16. - uv2;
        float offset = floor(fragCoord.x / 16. - floor((maxLength - uNumChars) / 2.));

        float symbolDelay = 1.0 / uNumChars;
        float delayTime = uRevealDelay * uDuration + (1. - uRevealDelay) * symbolDelay * (1. + offset);

        float transitionThreshold = 0.;
        if (fragCoord.x / 16. > floor((maxLength - uNumChars) / 2.))
            transitionThreshold = step(delayTime, uProgress);

        float color = text(fragCoord, offset, transitionThreshold);
        vec3 finalColor = mix(color * shine(fragCoord, offset, transitionThreshold), color * uColor, 0.);
        gl_FragColor = vec4(finalColor, 1.0);
    } else
        discard;

}