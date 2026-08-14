var e=`/newsroom/models/magnifying-glass.lens.bin`,t=45e3,n=1.5,r=.1,i=.45,a=17,o=2600,s=.16,c=.1,l=3e-4,u=1e-4,d=.002,f=`#version 300 es
precision highp float;

in vec3 a_position;
in vec3 a_normal;

uniform mat4 u_projection;
uniform mat3 u_rotation;
uniform float u_positionScale;

out vec3 v_normal;

void main() {
  vec3 position = u_rotation * (a_position * u_positionScale);
  v_normal = u_rotation * a_normal;
  gl_Position = u_projection * vec4(position, 1.0);
}`,p=`#version 300 es
precision highp float;

in vec3 v_normal;

uniform vec4 u_baseColor;
uniform vec2 u_pbr; // metallic, roughness

out vec4 outColor;

// The camera is orthographic, so the view vector is constant and the whole
// lighting model collapses to a handful of dot products.
const vec3 VIEW = vec3(0.0, 0.0, 1.0);
const vec3 KEY_DIR = vec3(-0.4242, 0.6869, 0.5899);
const vec3 FILL_DIR = vec3(0.6963, -0.3164, 0.6440);
const vec3 KEY_COLOR = vec3(2.150, 2.075, 1.946);
const vec3 FILL_COLOR = vec3(0.396, 0.440, 0.517);
const vec3 SKY_COLOR = vec3(0.62, 0.70, 0.83);
const vec3 GROUND_COLOR = vec3(0.16, 0.14, 0.13);

/** Two-stop vertical gradient standing in for an environment probe. */
vec3 sampleEnvironment(vec3 direction) {
  float height = direction.y * 0.5 + 0.5;
  vec3 horizon = mix(GROUND_COLOR, SKY_COLOR, 0.62);
  return height < 0.5
    ? mix(GROUND_COLOR, horizon, height * 2.0)
    : mix(horizon, SKY_COLOR, (height - 0.5) * 2.0);
}

void main() {
  // The glass disc is double sided and drawn without culling.
  vec3 normal = normalize(v_normal);
  if (!gl_FrontFacing) normal = -normal;

  float metallic = u_pbr.x;
  float roughness = clamp(u_pbr.y, 0.045, 1.0);
  vec3 albedo = u_baseColor.rgb;

  float normalDotView = clamp(dot(normal, VIEW), 0.0, 1.0);
  vec3 f0 = mix(vec3(0.04), albedo, metallic);
  vec3 fresnel = f0 + (1.0 - f0) * pow(1.0 - normalDotView, 5.0);

  float shininess = 2.0 / (roughness * roughness * roughness * roughness) - 2.0;
  float specularNormalisation = (shininess + 8.0) / 25.132741;

  vec3 keyHalf = normalize(KEY_DIR + VIEW);
  vec3 fillHalf = normalize(FILL_DIR + VIEW);
  float keySpecular = pow(max(dot(normal, keyHalf), 0.0), shininess);
  float fillSpecular = pow(max(dot(normal, fillHalf), 0.0), shininess);

  vec3 ambient = mix(GROUND_COLOR, SKY_COLOR, normal.y * 0.5 + 0.5);
  vec3 diffuse = albedo * (1.0 - metallic) * (
    max(dot(normal, KEY_DIR), 0.0) * KEY_COLOR
    + max(dot(normal, FILL_DIR), 0.0) * FILL_COLOR
    + ambient * 0.6
  );

  vec3 reflection = sampleEnvironment(reflect(-VIEW, normal)) * mix(1.0, 0.3, roughness);
  vec3 specular = fresnel * (
    (keySpecular * KEY_COLOR + fillSpecular * FILL_COLOR) * specularNormalisation
    + reflection
  );

  // Reflections off a near-clear surface are not filtered by its own opacity,
  // so they raise coverage instead — otherwise the glass would show barely a
  // sixth of its own highlights.
  float coverage = clamp(
    u_baseColor.a + dot(specular, vec3(0.2126, 0.7152, 0.0722)),
    0.0,
    1.0
  );

  vec3 straight = (diffuse * u_baseColor.a + specular) / max(coverage, 1e-4);
  straight = straight / (straight + 0.9); // Reinhard, keeps brass highlights off the clip
  // The page compositor blends in sRGB with premultiplied alpha, so encode
  // the straight colour first and premultiply after.
  outColor = vec4(pow(straight, vec3(1.0 / 2.2)) * coverage, coverage);
}`,m=null,h=null,g=null,_=0;function v(e){let t=new DataView(e);if(String.fromCharCode(t.getUint8(0),t.getUint8(1),t.getUint8(2),t.getUint8(3))!==`ICLG`)throw Error(`lens model: bad magic`);if(t.getUint32(4,!0)!==1)throw Error(`lens model: unsupported version`);let n=t.getUint32(8,!0),r=JSON.parse(new TextDecoder().decode(new Uint8Array(e,16,n))),a=16+n;return{positionScale:r.posScale,bounds:r.bounds,glassRadius:r.glassRadius,groups:r.groups.map(t=>({color:Float32Array.of(t.color[0],t.color[1],t.color[2],t.blend?t.color[3]*i:t.color[3]),metallic:t.metallic,roughness:t.roughness,blend:t.blend,indexCount:t.indexCount,positions:new Int16Array(e,a+t.position,t.vertexCount*3),normals:new Int8Array(e,a+t.normal,t.vertexCount*4),indices:new Uint16Array(e,a+t.index,t.indexCount)}))}}function y(){return m||(m=fetch(e,{credentials:`omit`}).then(e=>{if(!e.ok)throw Error(`lens model: HTTP ${e.status}`);return e.arrayBuffer()}).then(v).catch(e=>{throw m=null,e})),m}function b(){y().catch(()=>{})}function x(e,t,n){let r=e.createShader(t);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r);throw e.deleteShader(r),Error(`lens glass shader: ${t}`)}return r}function S(e){let t=document.createElement(`canvas`);t.className=`lens__glass`,t.setAttribute(`aria-hidden`,`true`);let n=t.getContext(`webgl2`,{alpha:!0,antialias:!0,depth:!0,stencil:!1,premultipliedAlpha:!0,preserveDrawingBuffer:!1,powerPreference:`low-power`});if(!n)return null;let r=x(n,n.VERTEX_SHADER,f),i=x(n,n.FRAGMENT_SHADER,p),a=n.createProgram();if(n.attachShader(a,r),n.attachShader(a,i),n.linkProgram(a),n.deleteShader(r),n.deleteShader(i),!n.getProgramParameter(a,n.LINK_STATUS)){let e=n.getProgramInfoLog(a);throw n.deleteProgram(a),Error(`lens glass program: ${e}`)}let o=n.getAttribLocation(a,`a_position`),s=n.getAttribLocation(a,`a_normal`),c={projection:n.getUniformLocation(a,`u_projection`),rotation:n.getUniformLocation(a,`u_rotation`),positionScale:n.getUniformLocation(a,`u_positionScale`),baseColor:n.getUniformLocation(a,`u_baseColor`),pbr:n.getUniformLocation(a,`u_pbr`)},l=[],u=e.groups.map(e=>{let t=n.createVertexArray();n.bindVertexArray(t);let r=n.createBuffer();n.bindBuffer(n.ARRAY_BUFFER,r),n.bufferData(n.ARRAY_BUFFER,e.positions,n.STATIC_DRAW),n.enableVertexAttribArray(o),n.vertexAttribPointer(o,3,n.SHORT,!0,0,0);let i=n.createBuffer();n.bindBuffer(n.ARRAY_BUFFER,i),n.bufferData(n.ARRAY_BUFFER,e.normals,n.STATIC_DRAW),n.enableVertexAttribArray(s),n.vertexAttribPointer(s,3,n.BYTE,!0,4,0);let a=n.createBuffer();return n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,a),n.bufferData(n.ELEMENT_ARRAY_BUFFER,e.indices,n.STATIC_DRAW),n.bindVertexArray(null),l.push(r,i,a),{vao:t,indexCount:e.indexCount,blend:e.blend,color:e.color,metallic:e.metallic,roughness:e.roughness}});n.useProgram(a),n.uniform1f(c.positionScale,e.positionScale),n.enable(n.DEPTH_TEST),n.depthFunc(n.LEQUAL),n.disable(n.CULL_FACE),n.enable(n.BLEND),n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA),n.clearColor(0,0,0,0);let d={canvas:t,gl:n,program:a,uniforms:c,groups:u,buffers:l,model:e,projection:new Float32Array(16),rotation:new Float32Array(9),centreX:0,centreY:0,width:0,height:0,dpr:0,onContextLost:null};return d.onContextLost=e=>{e.preventDefault(),h===d&&(g?.dispose(),C())},t.addEventListener(`webglcontextlost`,d.onContextLost),d}function C(){if(!h)return;let{gl:e,canvas:t}=h;t.removeEventListener(`webglcontextlost`,h.onContextLost);for(let t of h.groups)e.deleteVertexArray(t.vao);for(let t of h.buffers)e.deleteBuffer(t);e.deleteProgram(h.program),e.getExtension(`WEBGL_lose_context`)?.loseContext(),t.remove(),h=null}function w(e,t,i){let{gl:a,model:o}=e,[s,c,l,u]=o.bounds,d=l-s,f=(i??t*d/(2*o.glassRadius))/d,p=Math.ceil((l-s)*f),m=Math.ceil((u-c)*f),h=Math.min(window.devicePixelRatio||1,n);if(e.centreX=-s*f,e.centreY=u*f,e.width===p&&e.height===m&&e.dpr===h)return;e.width=p,e.height=m,e.dpr=h,e.canvas.width=Math.round(p*h),e.canvas.height=Math.round(m*h),e.canvas.style.width=`${p}px`,e.canvas.style.height=`${m}px`,a.viewport(0,0,e.canvas.width,e.canvas.height);let g=e.projection;g.fill(0),g[0]=2/(l-s),g[5]=2/(u-c),g[10]=-1/r,g[12]=-(l+s)/(l-s),g[13]=-(u+c)/(u-c),g[15]=1,a.uniformMatrix4fv(e.uniforms.projection,!1,g)}function T(e,t,n,r){let i=Math.sin(t),a=Math.cos(t),o=Math.sin(n),s=Math.cos(n),c=Math.sin(r),l=Math.cos(r);e[0]=s*l,e[1]=a*c+i*o*l,e[2]=i*c-a*o*l,e[3]=-s*c,e[4]=a*l-i*o*c,e[5]=i*l+a*o*c,e[6]=o,e[7]=-i*s,e[8]=a*s}function E(e,t,n,r){let{gl:i,uniforms:a}=e;T(e.rotation,t,n,r),i.uniformMatrix3fv(a.rotation,!1,e.rotation),i.clear(i.COLOR_BUFFER_BIT|i.DEPTH_BUFFER_BIT);for(let t of e.groups)i.depthMask(!t.blend),i.uniform4fv(a.baseColor,t.color),i.uniform2f(a.pbr,t.metallic,t.roughness),i.bindVertexArray(t.vao),i.drawElements(i.TRIANGLES,t.indexCount,i.UNSIGNED_SHORT,0);i.depthMask(!0),i.bindVertexArray(null)}function D(e,t){return e<-t?-t:e>t?t:e}function O(e,t,n,r,i,f){let{canvas:p}=e;w(e,n,r);let m=i,h=f,_=performance.now(),v=!1,y=0,b=0,x=0,S=0,C=0,T=0,O=0,A=0,j=0,M=0,N=0,P=0,F=0,I=0,L=!1,R=(t,n)=>{p.style.transform=`translate3d(${t-e.centreX}px, ${n-e.centreY}px, 0)`},z=t=>{if(F=0,L)return;let n=Math.min((t-I)/1e3,1/30);I=t;let r=Math.exp(-9*n);O*=r,A*=r,j*=r,y+=b*n,b+=(-190*(y-O)-a*b)*n,x+=S*n,S+=(-190*(x-A)-a*S)*n,C+=T*n,T+=(-190*(C-j)-a*T)*n;let i=Math.abs(y)<u&&Math.abs(b)<d&&Math.abs(x)<u&&Math.abs(S)<d&&Math.abs(C)<u&&Math.abs(T)<d;i&&(y=0,b=0,x=0,S=0,C=0,T=0),(i||Math.abs(y-M)>l||Math.abs(x-N)>l||Math.abs(C-P)>l)&&(E(e,x,C,y),M=y,N=x,P=C),!i&&!document.hidden&&(F=requestAnimationFrame(z))};R(i,f),E(e,0,0,0),p.classList.remove(`is-visible`),t.appendChild(p),requestAnimationFrame(()=>{L||p.classList.add(`is-visible`)});let B={container:t,move(e,t){if(L)return;R(e,t);let n=performance.now(),r=Math.min(Math.max((n-_)/1e3,1/240),.1);if(v){let i=(e-m)/r,a=(t-h)/r;O=D(-i/o,s),j=D(i/o,c),A=D(-a/o,c),F||(I=n,F=requestAnimationFrame(z))}m=e,h=t,_=n,v=!0},dispose(){L||(L=!0,F&&cancelAnimationFrame(F),F=0,g===B&&(p.classList.remove(`is-visible`),p.remove(),g=null,k()))}};return B}function k(){clearTimeout(_),_=setTimeout(()=>{g||C()},t)}async function A(e,t,n,r,i){let a;try{a=await y()}catch{return null}if(g?.dispose(),clearTimeout(_),!h){try{h=S(a)}catch{h=null}if(!h)return null}return g=O(h,e,t,n,r,i),g}export{A as mountLensGlass,b as prefetchLensGlass};