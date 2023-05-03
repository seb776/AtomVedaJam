/*{ "audio": true,
"osc":44444 }*/
precision highp float;

uniform float time;
uniform vec2 resolution;
uniform sampler2D spectrum;
uniform sampler2D midi;

uniform sampler2D greyTex;
uniform sampler2D cookieTex;
uniform sampler2D ziconTex;

uniform sampler2D osc_user_rythm_a;
uniform sampler2D osc_example;

float mtime; // modulated time

#define FFTI(a) time

#define sat(a) clamp(a, 0., 1.)
#define FFT(a) texture2D(spectrum, vec2(a, 0.)).x

#define EPS vec2(0.01, 0.)
#define AKAI_KNOB(a) (texture2D(midi, vec2(176. / 256., (0.+min(max(float(a), 0.), 7.)) / 128.)).x)

#define MIDI_KNOB(a) (texture2D(midi, vec2(176. / 256., (16.+min(max(float(a), 0.), 7.)) / 128.)).x)
#define MIDI_FADER(a) (texture2D(midi, vec2(176. / 256., (0.+min(max(float(a), 0.), 7.)) / 128.)).x)

#define MIDI_BTN_S(a) sat(texture2D(midi, vec2(176. /  256., (32.+min(max(float(a), 0.), 7.)) / 128.)).x*10.)
#define MIDI_BTN_M(a) sat(texture2D(midi, vec2(176. / 256., (48.+min(max(float(a), 0.), 7.)) / 128.)).x*10.)
#define MIDI_BTN_R(a) sat(texture2D(midi, vec2(176. / 256., (64.+min(max(float(a), 0.), 7.)) / 128.)).x*10.)

#define FFTlow (FFT(0.1) * MIDI_KNOB(0))
#define FFTmid (FFT(0.5) * MIDI_KNOB(1))
#define FFThigh (FFT(0.7) * MIDI_KNOB(2))
#define PI 3.14159265
#define TAU (PI*2.0)
float hash(float seed)
{
    return fract(sin(seed*123.456)*123.456);
}

float _cube(vec3 p, vec3 s)
{
  vec3 l = abs(p)-s;
  return max(l.x, max(l.y, l.z));
}
float _cucube(vec3 p, vec3 s, vec3 th)
{
    vec3 l = abs(p)-s;
    float cube = max(max(l.x, l.y), l.z);
    l = abs(l)-th;
    float x = max(l.y, l.z);
    float y = max(l.x, l.z);
    float z = max(l.x, l.y);

    return max(min(min(x, y), z), cube);
}
float _seed;

float rand()
{
    _seed++;
    return hash(_seed);
}

mat2 r2d(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

vec3 getCam(vec3 rd, vec2 uv)
{
    vec3 r = normalize(cross(rd, vec3(0.,1.,0.)));
    vec3 u = normalize(cross(rd, r));
    return normalize(rd+(r*uv.x+u*uv.y)*3.);
}

float lenny(vec2 v)
{
    return abs(v.x)+abs(v.y);
}
float _sqr(vec2 p, vec2 s)
{
    vec2 l = abs(p)-s;
    return max(l.x, l.y);
}
float _cir(vec2 uv, float sz)
{
  return length(uv)-sz;
}

float _loz(vec2 uv,float sz)
{
  return lenny(uv)-sz;
}
vec2 _min(vec2 a, vec2 b)
{
    if (a.x < b.x)
        return a;
    return b;
}
vec2 _max(vec2 a, vec2 b)
{
  if (a.x > b.x)
      return a;
  return b;
}

// To replace missing behavior in veda
vec4 textureRepeat(sampler2D sampler, vec2 uv)
{
  return texture2D(sampler, mod(uv, vec2(1.)));
}

vec2 map(vec3 p)
{
  vec3 op = p;
    vec2 acc = vec2(10000., -1.);
    p.xy *= r2d(p.z*.005);
    p.z +=time;
    vec3 rep = vec3(10.);
    vec3 id = floor((p+rep*.5)/rep);
    p.xy *= sin(id.z)*.1+2.;
    p = mod(p+rep*.5,rep)-rep*.5;
    float s = .2+(sin(id.z*5.)*.5+.5)*2.*sin(length(id)+time);//*FFT(fract(id.z*.01));
    float shape  = length(p.xy)-s-sin(id.z*1.+time);
    shape = max(shape, length(op.xy)-15.);
    acc= _min(acc, vec2(shape, 0.));
    return acc;
}


vec3 accCol;
vec3 trace(vec3 ro, vec3 rd)
{
    accCol = vec3(0.);
    vec3 p = ro;
    for (int i = 0; i < 128; ++i)
    {
        vec2 res = map(p);
        if (res.x < 0.01)
            return vec3(res.x, distance(p, ro), res.y);
            accCol += sat(sin(p.z*2.+10.*time))*(1.-sat(res.x/1.8))*.25*vec3(fract(p));
        p+= rd*res.x;
    }
    return vec3(-1.);
}

vec3 getNorm(vec3 p, float d)
{
  vec2 e = vec2(0.01, 0.);
  return  normalize(vec3(d) - vec3(map(p-e.xyy).x, map(p-e.yxy).x, map(p-e.yyx).x));
}

vec3 getMat(vec3 p, vec3 n, vec3 rd, vec3 res)
{
  vec3 col = n *.5+.5;

  return col;
}

vec3 rdr(vec2 uv)
{
  float t = time*.5;
    vec3 ro = vec3(2.+sin(t),+cos(t), -5.);
    vec3 ta = vec3(+sin(t),0.,0.);
    vec3 rd = normalize(ta-ro);
    rd = getCam(rd, uv);
    vec3 col = vec3(0.);

    vec3 res = trace(ro, rd);
    float depth = 100.;
    if (res.y > 0.)
    {
      depth = res.y;
        vec3 p = ro + rd*res.y;
        vec3 n = getNorm(p, res.x);
        col = getMat(p, n, rd, res);
    }
    col += accCol;
    return col;
}
uniform sampler2D backbuffer;
void main() {
  vec2 ouv = gl_FragCoord.xy / resolution.xy;
    vec2 uv = (gl_FragCoord.xy-.5*resolution.xy) / resolution.xx;
    _seed = time+textureRepeat(greyTex, uv).x;
    uv *= vec2(.5,1.);
    vec2 off  = vec2(0.007,-0.5);
    uv.y +=sign((ouv.y-0.5))*.36;
    vec3 top = rdr(uv+off);
    vec3 down = rdr(uv-off);
    vec3 col = mix(top, down, float(ouv.y<0.5));

      col+= textureRepeat(osc_user_rythm_a, vec2(0.,0.)).xxx;
//col *= 0.;
    //col += texture2D(osc_example, vec2(0.0, 0.0)).xxx;
    gl_FragColor = vec4(col, 1.0);
}
