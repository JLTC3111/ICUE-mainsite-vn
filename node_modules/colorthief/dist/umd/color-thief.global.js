"use strict";var ColorThief=(()=>{var X=Object.defineProperty;var Nt=Object.getOwnPropertyDescriptor;var $t=Object.getOwnPropertyNames;var Kt=Object.prototype.hasOwnProperty;var _=(e,t)=>()=>(e&&(t=e(e=0)),t);var W=(e,t)=>{for(var r in t)X(e,r,{get:t[r],enumerable:!0})},Xt=(e,t,r,n)=>{if(t&&typeof t=="object"||typeof t=="function")for(let o of $t(t))!Kt.call(e,o)&&o!==r&&X(e,o,{get:()=>t[o],enumerable:!(n=Nt(t,o))||n.enumerable});return e};var Zt=e=>Xt(X({},"__esModule",{value:!0}),e);function d(e){let t=e/255;return t<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4)}function x(e){let t=e<=.0031308?12.92*e:1.055*Math.pow(e,.4166666666666667)-.055;return Math.round(Math.max(0,Math.min(255,t*255)))}function lt(e,t){let r=[[0,0,0],[0,0,0],[0,0,0]];for(let n=0;n<3;n++)for(let o=0;o<3;o++)r[n][o]=e[n][0]*t[0][o]+e[n][1]*t[1][o]+e[n][2]*t[2][o];return r}function Z(e){let[t,r,n]=e[0],[o,i,s]=e[1],[a,u,m]=e[2],l=i*m-s*u,h=-(o*m-s*a),c=o*u-i*a,f=1/(t*l+r*h+n*c);return[[l*f,(n*u-r*m)*f,(r*s-n*i)*f],[h*f,(t*m-n*a)*f,(n*o-t*s)*f],[c*f,(r*a-t*u)*f,(t*i-r*o)*f]]}function F(e,t,r,n){return[e[0][0]*t+e[0][1]*r+e[0][2]*n,e[1][0]*t+e[1][1]*r+e[1][2]*n,e[2][0]*t+e[2][1]*r+e[2][2]*n]}function oe(e,t,r){let n=.2104542553*e+.793617785*t-.0040720468*r,o=1.9779984951*e-2.428592205*t+.4505937099*r,i=.0259040371*e+.7827717662*t-.808675766*r,s=Math.sqrt(o*o+i*i),a=Math.atan2(i,o)*(180/Math.PI);return a<0&&(a+=360),{l:n,c:s,h:a}}function ie(e,t,r){let[n,o,i]=F(mt,d(e),d(t),d(r));return oe(Math.cbrt(n),Math.cbrt(o),Math.cbrt(i))}function tt(e,t,r,n="srgb"){if(n==="display-p3")return ie(e,t,r);let o=d(e),i=d(t),s=d(r),a=.4122214708*o+.5363325363*i+.0514459929*s,u=.2119034982*o+.6806995451*i+.1073969566*s,m=.0883024619*o+.2817188376*i+.6299787005*s,l=Math.cbrt(a),h=Math.cbrt(u),c=Math.cbrt(m),b=.2104542553*l+.793617785*h-.0040720468*c,f=1.9779984951*l-2.428592205*h+.4505937099*c,g=.0259040371*l+.7827717662*h-.808675766*c,E=Math.sqrt(f*f+g*g),I=Math.atan2(g,f)*(180/Math.PI);return I<0&&(I+=360),{l:b,c:E,h:I}}function ae(e,t,r){let n=r*(Math.PI/180),o=t*Math.cos(n),i=t*Math.sin(n),s=e+.3963377774*o+.2158037573*i,a=e-.1055613458*o-.0638541728*i,u=e-.0894841775*o-1.291485548*i;return[s*s*s,a*a*a,u*u*u]}function se(e,t,r){let[n,o,i]=ae(e,t,r),[s,a,u]=F(te,n,o,i);return[x(s),x(a),x(u)]}function ue(e,t,r,n="srgb"){if(n==="display-p3")return se(e,t,r);let o=r*(Math.PI/180),i=t*Math.cos(o),s=t*Math.sin(o),a=e+.3963377774*i+.2158037573*s,u=e-.1055613458*i-.0638541728*s,m=e-.0894841775*i-1.291485548*s,l=a*a*a,h=u*u*u,c=m*m*m,b=4.0767416621*l-3.3077115913*h+.2309699292*c,f=-1.2684380046*l+2.6097574011*h-.3413193965*c,g=-.0041960863*l-.7034186147*h+1.707614701*c;return[x(b),x(f),x(g)]}function ct(e,t="srgb"){let r=new Array(e.length);for(let n=0;n<e.length;n++){let[o,i,s]=e[n],{l:a,c:u,h:m}=tt(o,i,s,t);r[n]=[Math.round(a*255),Math.round(u/.4*255),Math.round(m/360*255)]}return r}function ht(e,t="srgb"){return e.map(({color:[r,n,o],population:i})=>{let s=r/255,a=n/255*.4,u=o/255*360;return{color:ue(s,a,u,t),population:i}})}function P(e,t,r){let[n,o,i]=F(J,d(e),d(t),d(r));return[x(n),x(o),x(i)]}function bt(e,t,r){let[n,o,i]=F(re,d(e),d(t),d(r));return[x(n),x(o),x(i)]}function ft(e,t,r){let[n,o,i]=F(J,d(e),d(t),d(r));return n<-O||n>1+O||o<-O||o>1+O||i<-O||i>1+O}function pt(e,t,r,n="srgb"){let o=d(e),i=d(t),s=d(r),[a,u,m]=n==="display-p3"?Y[1]:ne;return a*o+u*i+m*s}var Yt,Y,Jt,mt,te,ee,J,re,ne,O,z=_(()=>{"use strict";Yt=[[.8189330101,.3618667424,-.1288597137],[.0329845436,.9293118715,.0361456387],[.0482003018,.2643662691,.633851707]],Y=[[.4865709486,.2656676932,.1982172852],[.2289745641,.6917385218,.0792869141],[0,.0451133819,1.0439443689]],Jt=[[.4123907993,.3575843394,.1804807884],[.2126390059,.7151686788,.0721923154],[.0193308187,.1191947798,.9505321522]],mt=lt(Yt,Y),te=Z(mt),ee=Z(Jt),J=lt(ee,Y),re=Z(J),ne=[.2126,.7152,.0722];O=.001});function le(e,t,r){let n=e/255,o=t/255,i=r/255,s=Math.max(n,o,i),a=Math.min(n,o,i),u=(s+a)/2,m=0,l=0;if(s!==a){let h=s-a;l=u>.5?h/(2-s-a):h/(s+a),s===n?m=((o-i)/h+(o<i?6:0))/6:s===o?m=((i-n)/h+2)/6:m=((n-o)/h+4)/6}return{h:Math.round(m*360),s:Math.round(l*100),l:Math.round(u*100)}}function dt(e,t){let r=Math.max(e,t),n=Math.min(e,t);return(r+.05)/(n+.05)}function v(e,t,r,n,o=0,i="srgb"){return new et(e,t,r,n,o,i)}var et,D=_(()=>{"use strict";z();et=class{constructor(t,r,n,o,i,s="srgb"){this._r=t,this._g=r,this._b=n,this.gamut=s,this.population=o,this.proportion=i}get srgb(){return this._srgb||(this._srgb=this.gamut==="display-p3"?P(this._r,this._g,this._b):[this._r,this._g,this._b]),this._srgb}rgb(t="srgb"){if(t===this.gamut)return{r:this._r,g:this._g,b:this._b};let[r,n,o]=t==="display-p3"?bt(this._r,this._g,this._b):this.srgb;return{r,g:n,b:o}}hex(){let[t,r,n]=this.srgb,o=i=>i.toString(16).padStart(2,"0");return`#${o(t)}${o(r)}${o(n)}`}hsl(){if(!this._hsl){let[t,r,n]=this.srgb;this._hsl=le(t,r,n)}return this._hsl}oklch(){return this._oklch||(this._oklch=tt(this._r,this._g,this._b,this.gamut)),this._oklch}css(t){if(t===void 0){if(this.gamut==="display-p3"){let r=n=>+(n/255).toFixed(4);return`color(display-p3 ${r(this._r)} ${r(this._g)} ${r(this._b)})`}t="rgb"}switch(t){case"hsl":{let{h:r,s:n,l:o}=this.hsl();return`hsl(${r}, ${n}%, ${o}%)`}case"oklch":{let{l:r,c:n,h:o}=this.oklch();return`oklch(${r.toFixed(3)} ${n.toFixed(3)} ${o.toFixed(1)})`}default:{let[r,n,o]=this.srgb;return`rgb(${r}, ${n}, ${o})`}}}array(){return[...this.srgb]}toString(){return this.hex()}get textColor(){return this.isDark?"#ffffff":"#000000"}get luminance(){return this._luminance===void 0&&(this._luminance=pt(this._r,this._g,this._b,this.gamut)),this._luminance}get isDark(){return this.luminance<=.179}get isLight(){return!this.isDark}get contrast(){if(!this._contrast){let t=this.luminance,r=dt(t,1),n=dt(t,0),o=this.isDark?v(255,255,255,0,0):v(0,0,0,0,0);this._contrast={white:Math.round(r*100)/100,black:Math.round(n*100)/100,foreground:o}}return this._contrast}}});var vt={};W(vt,{computeFallbackColor:()=>xt,createPixelArray:()=>Q,extractPalette:()=>L,resolveOutputGamut:()=>gt,validateOptions:()=>k});function k(e){let{colorCount:t,quality:r}=e;if(typeof t>"u"||!Number.isInteger(t))t=10;else{if(t===1)throw new Error("colorCount should be between 2 and 20. To get one color, call getColor() instead of getPalette()");t=Math.max(t,2),t=Math.min(t,20)}(typeof r>"u"||!Number.isInteger(r)||r<1)&&(r=10);let n=e.ignoreWhite!==void 0?!!e.ignoreWhite:!0,o=typeof e.whiteThreshold=="number"?e.whiteThreshold:250,i=typeof e.alphaThreshold=="number"?e.alphaThreshold:125,s=typeof e.minSaturation=="number"?Math.max(0,Math.min(1,e.minSaturation)):0,a=e.colorSpace??"oklch",u=e.gamut??"srgb";return{colorCount:t,quality:r,ignoreWhite:n,whiteThreshold:o,alphaThreshold:i,minSaturation:s,colorSpace:a,gamut:u}}function gt(e,t,r){return r==="srgb"||t!=="display-p3"?"srgb":r==="auto"?e.some(([n,o,i])=>ft(n,o,i))?"display-p3":"srgb":"display-p3"}function Q(e,t,r,n){let{ignoreWhite:o=!0,whiteThreshold:i=250,alphaThreshold:s=125,minSaturation:a=0}=n,u=[];for(let m=0;m<t;m+=r){let l=m*4,h=e[l],c=e[l+1],b=e[l+2],f=e[l+3];if(!(f!==void 0&&f<s)&&!(o&&h>i&&c>i&&b>i)){if(a>0){let g=Math.max(h,c,b);if(g===0||(g-Math.min(h,c,b))/g<a)continue}u.push([h,c,b])}}return u}function xt(e,t,r){let n=0,o=0,i=0,s=0;for(let a=0;a<t;a+=r){let u=a*4;n+=e[u],o+=e[u+1],i+=e[u+2],s++}return s===0?null:[Math.round(n/s),Math.round(o/s),Math.round(i/s)]}function L(e,t,r,n,o,i="srgb"){let s=t*r,a={ignoreWhite:n.ignoreWhite,whiteThreshold:n.whiteThreshold,alphaThreshold:n.alphaThreshold,minSaturation:n.minSaturation},u=Q(e,s,n.quality,a);u.length===0&&(u=Q(e,s,n.quality,{...a,ignoreWhite:!1})),u.length===0&&(u=Q(e,s,n.quality,{...a,ignoreWhite:!1,alphaThreshold:0}));let m=i,l=gt(u,m,n.gamut),h=p=>m===l?p:P(p[0],p[1],p[2]),c,b=new Set,f=[];for(let p of u){let y=p.join(",");if(!b.has(y)&&(b.add(y),f.push(p),f.length>n.colorCount))break}if(f.length<=n.colorCount){let p=new Map;for(let y of u){let M=y.join(",");p.set(M,(p.get(M)||0)+1)}c=f.map(y=>({color:y,population:p.get(y.join(","))}))}else if(n.colorSpace==="oklch"){let p=ct(u,m);c=ht(o.quantize(p,n.colorCount),m)}else c=o.quantize(u,n.colorCount);if(c.length>0){let p=c.reduce((y,M)=>y+M.population,0);return c.map(({color:y,population:M})=>{let[zt,Qt,Ut]=h(y);return v(zt,Qt,Ut,M,p>0?M/p:0,l)})}let g=xt(e,s,n.quality);if(!g)return null;let[E,I,S]=h(g);return[v(E,I,S,1,1,l)]}var B=_(()=>{"use strict";D();z()});function xe(){if(j!==void 0)return j;try{let t=document.createElement("canvas").getContext("2d",{colorSpace:"display-p3"});j=!!t&&t.getContextAttributes?.().colorSpace==="display-p3"}catch{j=!1}return j}function ve(e){return e==="display-p3"||e==="auto"}function Mt(e){return ve(e)&&xe()?"display-p3":"srgb"}function _t(e,t,r,n){try{return n==="display-p3"?e.getImageData(0,0,t,r,{colorSpace:"display-p3"}):e.getImageData(0,0,t,r)}catch(o){if(o instanceof DOMException&&o.name==="SecurityError"){let i=new Error('Image is tainted by cross-origin data. Add crossorigin="anonymous" to the <img> tag and ensure the server sends appropriate CORS headers.');throw i.cause=o,i}throw o}}function T(e,t,r,n){let o=Mt(r),i=document.createElement("canvas");i.width=e,i.height=t;let s=o==="display-p3"?i.getContext("2d",{colorSpace:"display-p3"}):i.getContext("2d");return n(s),{data:_t(s,e,t,o).data,width:e,height:t,colorSpace:o}}function R(e,t,r,n){let o=Mt(n);return{data:_t(e,t,r,o).data,width:t,height:r,colorSpace:o}}var j,it=_(()=>{"use strict"});var Lt={};W(Lt,{BrowserPixelLoader:()=>at});var at,Et=_(()=>{"use strict";it();at=class{async load(t,r,n="srgb"){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement)return this.loadFromImage(t,n);if(typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement)return this.loadFromCanvas(t,n);if(typeof ImageData<"u"&&t instanceof ImageData)return{data:t.data,width:t.width,height:t.height,colorSpace:t.colorSpace??"srgb"};if(typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement)return this.loadFromVideo(t,n);if(typeof ImageBitmap<"u"&&t instanceof ImageBitmap)return this.loadFromImageBitmap(t,n);if(typeof OffscreenCanvas<"u"&&t instanceof OffscreenCanvas)return this.loadFromOffscreenCanvas(t,n);throw new Error("Unsupported source type. Expected HTMLImageElement, HTMLCanvasElement, HTMLVideoElement, ImageData, ImageBitmap, or OffscreenCanvas.")}loadFromImage(t,r){if(!t.complete)throw new Error('Image has not finished loading. Wait for the "load" event before calling getColor/getPalette.');if(!t.naturalWidth)throw new Error("Image has no dimensions. It may not have loaded successfully.");return T(t.naturalWidth,t.naturalHeight,r,n=>n.drawImage(t,0,0,t.naturalWidth,t.naturalHeight))}loadFromCanvas(t,r){let n=t.getContext("2d");return R(n,t.width,t.height,r)}loadFromVideo(t,r){if(t.readyState<2)throw new Error('Video is not ready. Wait for the "loadeddata" or "canplay" event before calling getColor/getPalette.');let n=t.videoWidth,o=t.videoHeight;if(!n||!o)throw new Error("Video has no dimensions. It may not have loaded successfully.");return T(n,o,r,i=>i.drawImage(t,0,0,n,o))}loadFromOffscreenCanvas(t,r){let n=t.getContext("2d");if(!n)throw new Error("Could not get 2D context from OffscreenCanvas.");return R(n,t.width,t.height,r)}loadFromImageBitmap(t,r){return T(t.width,t.height,r,n=>n.drawImage(t,0,0))}}});var Pt,kt=_(()=>{"use strict";Pt=`
'use strict';

// -------------------------------------------------------------------------
// Inlined MMCQ (Modified Median Cut Quantization)
// -------------------------------------------------------------------------

var SIGBITS = 5;
var RSHIFT = 3;
var MAX_ITER = 1000;
var FRACT_POP = 0.75;
var HISTO_SIZE = 32768;

function colorIndex(r, g, b) {
    return (r << 10) + (g << 5) + b;
}

function getHisto(pixels) {
    var h = new Uint32Array(HISTO_SIZE);
    for (var i = 0; i < pixels.length; i++) {
        var p = pixels[i];
        h[colorIndex(p[0] >> RSHIFT, p[1] >> RSHIFT, p[2] >> RSHIFT)]++;
    }
    return h;
}

function VBox(r1, r2, g1, g2, b1, b2, histo) {
    this.r1 = r1; this.r2 = r2;
    this.g1 = g1; this.g2 = g2;
    this.b1 = b1; this.b2 = b2;
    this.histo = histo;
    this._count = -1;
    this._volume = -1;
    this._avg = null;
}

VBox.prototype.volume = function(force) {
    if (this._volume < 0 || force) {
        this._volume = (this.r2 - this.r1 + 1) * (this.g2 - this.g1 + 1) * (this.b2 - this.b1 + 1);
    }
    return this._volume;
};

VBox.prototype.count = function(force) {
    if (this._count < 0 || force) {
        var n = 0;
        for (var i = this.r1; i <= this.r2; i++)
            for (var j = this.g1; j <= this.g2; j++)
                for (var k = this.b1; k <= this.b2; k++)
                    n += this.histo[colorIndex(i, j, k)] || 0;
        this._count = n;
    }
    return this._count;
};

VBox.prototype.copy = function() {
    return new VBox(this.r1, this.r2, this.g1, this.g2, this.b1, this.b2, this.histo);
};

VBox.prototype.avg = function(force) {
    if (!this._avg || force) {
        var mult = 1 << RSHIFT;
        if (this.r1 === this.r2 && this.g1 === this.g2 && this.b1 === this.b2) {
            this._avg = [this.r1 << RSHIFT, this.g1 << RSHIFT, this.b1 << RSHIFT];
        } else {
            var ntot = 0, rsum = 0, gsum = 0, bsum = 0;
            for (var i = this.r1; i <= this.r2; i++)
                for (var j = this.g1; j <= this.g2; j++)
                    for (var k = this.b1; k <= this.b2; k++) {
                        var hval = this.histo[colorIndex(i, j, k)] || 0;
                        ntot += hval;
                        rsum += hval * (i + 0.5) * mult;
                        gsum += hval * (j + 0.5) * mult;
                        bsum += hval * (k + 0.5) * mult;
                    }
            this._avg = ntot
                ? [~~(rsum / ntot), ~~(gsum / ntot), ~~(bsum / ntot)]
                : [~~(mult * (this.r1 + this.r2 + 1) / 2), ~~(mult * (this.g1 + this.g2 + 1) / 2), ~~(mult * (this.b1 + this.b2 + 1) / 2)];
        }
    }
    return this._avg;
};

function PQueue(comparator) {
    this.contents = [];
    this.sorted = false;
    this.comparator = comparator;
}

PQueue.prototype.push = function(item) { this.contents.push(item); this.sorted = false; };
PQueue.prototype.pop = function() {
    if (!this.sorted) { this.contents.sort(this.comparator); this.sorted = true; }
    return this.contents.pop();
};
PQueue.prototype.size = function() { return this.contents.length; };

function vboxFromPixels(pixels, histo) {
    var rmin = 1e6, rmax = 0, gmin = 1e6, gmax = 0, bmin = 1e6, bmax = 0;
    for (var i = 0; i < pixels.length; i++) {
        var p = pixels[i];
        var rv = p[0] >> RSHIFT, gv = p[1] >> RSHIFT, bv = p[2] >> RSHIFT;
        if (rv < rmin) rmin = rv; if (rv > rmax) rmax = rv;
        if (gv < gmin) gmin = gv; if (gv > gmax) gmax = gv;
        if (bv < bmin) bmin = bv; if (bv > bmax) bmax = bv;
    }
    return new VBox(rmin, rmax, gmin, gmax, bmin, bmax, histo);
}

function medianCutApply(histo, vbox) {
    if (!vbox.count()) return undefined;
    if (vbox.count() === 1) return [vbox.copy(), null];

    var rw = vbox.r2 - vbox.r1 + 1;
    var gw = vbox.g2 - vbox.g1 + 1;
    var bw = vbox.b2 - vbox.b1 + 1;
    var maxw = Math.max(rw, gw, bw);
    var total = 0;
    var partialsum = [];
    var lookaheadsum = [];
    var i, j, k, sum;

    if (maxw === rw) {
        for (i = vbox.r1; i <= vbox.r2; i++) {
            sum = 0;
            for (j = vbox.g1; j <= vbox.g2; j++)
                for (k = vbox.b1; k <= vbox.b2; k++)
                    sum += histo[colorIndex(i, j, k)] || 0;
            total += sum; partialsum[i] = total;
        }
    } else if (maxw === gw) {
        for (i = vbox.g1; i <= vbox.g2; i++) {
            sum = 0;
            for (j = vbox.r1; j <= vbox.r2; j++)
                for (k = vbox.b1; k <= vbox.b2; k++)
                    sum += histo[colorIndex(j, i, k)] || 0;
            total += sum; partialsum[i] = total;
        }
    } else {
        for (i = vbox.b1; i <= vbox.b2; i++) {
            sum = 0;
            for (j = vbox.r1; j <= vbox.r2; j++)
                for (k = vbox.g1; k <= vbox.g2; k++)
                    sum += histo[colorIndex(j, k, i)] || 0;
            total += sum; partialsum[i] = total;
        }
    }

    partialsum.forEach(function(d, idx) { lookaheadsum[idx] = total - d; });

    function doCut(color) {
        var dim1 = color + '1', dim2 = color + '2';
        for (var i = vbox[dim1]; i <= vbox[dim2]; i++) {
            if (partialsum[i] > total / 2) {
                var vbox1 = vbox.copy(), vbox2 = vbox.copy();
                var left = i - vbox[dim1], right = vbox[dim2] - i;
                var d2 = left <= right
                    ? Math.min(vbox[dim2] - 1, ~~(i + right / 2))
                    : Math.max(vbox[dim1], ~~(i - 1 - left / 2));
                while (!partialsum[d2]) d2++;
                var count2 = lookaheadsum[d2];
                while (!count2 && partialsum[d2 - 1]) count2 = lookaheadsum[--d2];
                vbox1[dim2] = d2;
                vbox2[dim1] = d2 + 1;
                return [vbox1, vbox2];
            }
        }
    }

    if (maxw === rw) return doCut('r');
    if (maxw === gw) return doCut('g');
    return doCut('b');
}

function iterate(pq, target, histo) {
    var ncolors = pq.size(), niters = 0;
    while (niters < MAX_ITER) {
        if (ncolors >= target) return;
        niters++;
        var vbox = pq.pop();
        if (!vbox.count()) { pq.push(vbox); continue; }
        var result = medianCutApply(histo, vbox);
        if (!result || !result[0]) return;
        pq.push(result[0]);
        if (result[1]) { pq.push(result[1]); ncolors++; }
    }
}

function quantize(pixels, maxColors) {
    if (!pixels.length || maxColors < 2 || maxColors > 256) return [];

    var histo = getHisto(pixels);
    var vbox = vboxFromPixels(pixels, histo);
    var pq = new PQueue(function(a, b) { return a.count() - b.count(); });
    pq.push(vbox);
    iterate(pq, FRACT_POP * maxColors, histo);

    var pq2 = new PQueue(function(a, b) { return a.count() * a.volume() - b.count() * b.volume(); });
    while (pq.size()) pq2.push(pq.pop());
    iterate(pq2, maxColors, histo);

    var results = [];
    while (pq2.size()) {
        var box = pq2.pop();
        results.push({ color: box.avg(), population: box.count() });
    }
    return results;
}

// -------------------------------------------------------------------------
// Worker message handler
// -------------------------------------------------------------------------

self.onmessage = function (e) {
    var data = e.data;
    var id = data.id;
    try {
        var palette = quantize(data.pixels, data.maxColors);
        self.postMessage({ id: id, palette: palette });
    } catch (err) {
        self.postMessage({ id: id, error: err.message || 'Unknown worker error' });
    }
};
`});var Ht={};W(Ht,{extractInWorker:()=>Ce,isWorkerSupported:()=>At,terminateWorker:()=>we});function At(){return typeof Worker<"u"}function Se(){if(C)return C;if(!At())throw new Error("Web Workers are not supported in this environment.");return q=URL.createObjectURL(new Blob([Pt],{type:"application/javascript"})),C=new Worker(q),C.onmessage=e=>{let{id:t,palette:r,error:n}=e.data,o=w.get(t);if(o)if(w.delete(t),n)o.reject(new Error(n));else{let i=r,{nativeGamut:s,outputGamut:a}=o,u=i.reduce((l,h)=>l+h.population,0),m=i.map(({color:l,population:h})=>{let[c,b,f]=s===a?l:P(l[0],l[1],l[2]);return v(c,b,f,h,u>0?h/u:0,a)});o.resolve(m)}},C.onerror=e=>{for(let[,t]of w)t.reject(new Error(e.message));w.clear()},C}function Ce(e,t,r,n="srgb",o="srgb"){return new Promise((i,s)=>{if(r?.aborted){s(r.reason??new DOMException("Aborted","AbortError"));return}let a=ye++;w.set(a,{resolve:i,reject:s,nativeGamut:n,outputGamut:o});let u=()=>{w.delete(a),s(r.reason??new DOMException("Aborted","AbortError"))};r?.addEventListener("abort",u,{once:!0});try{Se().postMessage({id:a,pixels:e,maxColors:t})}catch(m){w.delete(a),r?.removeEventListener("abort",u),s(m)}})}function we(){C&&(C.terminate(),C=null),q&&(URL.revokeObjectURL(q),q=null);for(let[,e]of w)e.reject(new Error("Worker terminated"));w.clear()}var C,q,ye,w,Rt=_(()=>{"use strict";D();z();kt();C=null,q=null,ye=0,w=new Map});var Ee={};W(Ee,{configure:()=>Gt,createColor:()=>v,getColor:()=>Dt,getColorSync:()=>qt,getPalette:()=>K,getPaletteProgressive:()=>jt,getPaletteSync:()=>G,getSwatches:()=>Bt,getSwatchesSync:()=>Vt,observe:()=>Wt});B();B();var rt=[{divisor:16,progress:.06},{divisor:4,progress:.25},{divisor:1,progress:1}];function me(){return new Promise(e=>setTimeout(e,0))}async function*yt(e,t,r,n,o,i,s="srgb"){for(let a=0;a<rt.length;a++){if(i?.aborted)throw i.reason??new DOMException("Aborted","AbortError");let u=rt[a],m={...n,quality:n.quality*u.divisor},l=L(e,t,r,m,o,s),h=a===rt.length-1;yield{palette:l??[],progress:u.progress,done:h},h||await me()}}D();var nt=[{role:"Vibrant",targetL:.65,minL:.4,maxL:.85,targetC:.2,minC:.08},{role:"Muted",targetL:.65,minL:.4,maxL:.85,targetC:.04,minC:0},{role:"DarkVibrant",targetL:.3,minL:0,maxL:.45,targetC:.2,minC:.08},{role:"DarkMuted",targetL:.3,minL:0,maxL:.45,targetC:.04,minC:0},{role:"LightVibrant",targetL:.85,minL:.7,maxL:1,targetC:.2,minC:.08},{role:"LightMuted",targetL:.85,minL:.7,maxL:1,targetC:.04,minC:0}],ce=6,he=3,be=1;function St(e,t,r){let{l:n,c:o}=e.oklch();if(n<t.minL||n>t.maxL||o<t.minC)return-1/0;let i=1-Math.abs(n-t.targetL),s=1-Math.min(Math.abs(o-t.targetC)/.2,1),a=r>0?e.population/r:0;return i*ce+s*he+a*be}var Ct=v(255,255,255,0),wt=v(0,0,0,0);function It(e){return{title:e.isDark?Ct:wt,body:e.isDark?Ct:wt}}function U(e){let t=Math.max(...e.map(i=>i.population),1),r=[];for(let i of nt){let s=null,a=-1/0;for(let u of e){let m=St(u,i,t);m>a&&(a=m,s=u)}s&&a>-1/0&&r.push({role:i.role,color:s,score:a})}let n=new Set,o={};r.sort((i,s)=>s.score-i.score);for(let i of r)if(n.has(i.color)){let s=nt.find(m=>m.role===i.role),a=null,u=-1/0;for(let m of e){if(n.has(m))continue;let l=St(m,s,t);l>u&&(u=l,a=m)}if(a&&u>-1/0){n.add(a);let{title:m,body:l}=It(a);o[i.role]={color:a,role:i.role,titleTextColor:m,bodyTextColor:l}}else o[i.role]=null}else{n.add(i.color);let{title:s,body:a}=It(i.color);o[i.role]={color:i.color,role:i.role,titleTextColor:s,bodyTextColor:a}}for(let i of nt)i.role in o||(o[i.role]=null);return o}function A(e,t,r){return(e<<10)+(t<<5)+r}var ot=class e{constructor(t,r,n,o,i,s,a){this.r1=t,this.r2=r,this.g1=n,this.g2=o,this.b1=i,this.b2=s,this.histo=a}volume(t=!1){return(this._volume===void 0||t)&&(this._volume=(this.r2-this.r1+1)*(this.g2-this.g1+1)*(this.b2-this.b1+1)),this._volume}count(t=!1){if(this._count===void 0||t){let r=0;for(let n=this.r1;n<=this.r2;n++)for(let o=this.g1;o<=this.g2;o++)for(let i=this.b1;i<=this.b2;i++)r+=this.histo[A(n,o,i)]||0;this._count=r}return this._count}copy(){return new e(this.r1,this.r2,this.g1,this.g2,this.b1,this.b2,this.histo)}avg(t=!1){if(this._avg===void 0||t)if(this.r1===this.r2&&this.g1===this.g2&&this.b1===this.b2)this._avg=[this.r1<<3,this.g1<<3,this.b1<<3];else{let n=0,o=0,i=0,s=0;for(let a=this.r1;a<=this.r2;a++)for(let u=this.g1;u<=this.g2;u++)for(let m=this.b1;m<=this.b2;m++){let l=this.histo[A(a,u,m)]||0;n+=l,o+=l*(a+.5)*8,i+=l*(u+.5)*8,s+=l*(m+.5)*8}n?this._avg=[~~(o/n),~~(i/n),~~(s/n)]:this._avg=[~~(8*(this.r1+this.r2+1)/2),~~(8*(this.g1+this.g2+1)/2),~~(8*(this.b1+this.b2+1)/2)]}return this._avg}},N=class{constructor(t){this.comparator=t;this.contents=[];this.sorted=!1}sort(){this.contents.sort(this.comparator),this.sorted=!0}push(t){this.contents.push(t),this.sorted=!1}peek(t){return this.sorted||this.sort(),this.contents[t??this.contents.length-1]}pop(){return this.sorted||this.sort(),this.contents.pop()}size(){return this.contents.length}map(t){return this.contents.map(t)}};function fe(e){let t=new Uint32Array(32768);for(let r of e){let n=r[0]>>3,o=r[1]>>3,i=r[2]>>3;t[A(n,o,i)]++}return t}function pe(e,t){let r=1e6,n=0,o=1e6,i=0,s=1e6,a=0;for(let u of e){let m=u[0]>>3,l=u[1]>>3,h=u[2]>>3;m<r?r=m:m>n&&(n=m),l<o?o=l:l>i&&(i=l),h<s?s=h:h>a&&(a=h)}return new ot(r,n,o,i,s,a,t)}function de(e,t){if(!t.count())return;if(t.count()===1)return[t.copy(),null];let r=t.r2-t.r1+1,n=t.g2-t.g1+1,o=t.b2-t.b1+1,i=Math.max(r,n,o),s=0,a=[],u=[];if(i===r)for(let l=t.r1;l<=t.r2;l++){let h=0;for(let c=t.g1;c<=t.g2;c++)for(let b=t.b1;b<=t.b2;b++)h+=e[A(l,c,b)]||0;s+=h,a[l]=s}else if(i===n)for(let l=t.g1;l<=t.g2;l++){let h=0;for(let c=t.r1;c<=t.r2;c++)for(let b=t.b1;b<=t.b2;b++)h+=e[A(c,l,b)]||0;s+=h,a[l]=s}else for(let l=t.b1;l<=t.b2;l++){let h=0;for(let c=t.r1;c<=t.r2;c++)for(let b=t.g1;b<=t.g2;b++)h+=e[A(c,b,l)]||0;s+=h,a[l]=s}a.forEach((l,h)=>{u[h]=s-l});function m(l){let h=l+"1",c=l+"2";for(let b=t[h];b<=t[c];b++)if(a[b]>s/2){let f=t.copy(),g=t.copy(),E=b-t[h],I=t[c]-b,S;for(E<=I?S=Math.min(t[c]-1,~~(b+I/2)):S=Math.max(t[h],~~(b-1-E/2));!a[S];)S++;let p=u[S];for(;!p&&a[S-1];)p=u[--S];return f[c]=S,g[h]=f[c]+1,[f,g]}}return m(i===r?"r":i===n?"g":"b")}function Tt(e,t,r){let n=e.size(),o=0;for(;o<1e3;){if(n>=t)return;o++;let i=e.pop();if(!i.count()){e.push(i);continue}let s=de(r,i);if(!s||!s[0])return;e.push(s[0]),s[1]&&(e.push(s[1]),n++)}}function ge(e,t){if(!e.length||t<2||t>256)return[];let r=fe(e),n=pe(e,r),o=new N((a,u)=>a.count()-u.count());o.push(n),Tt(o,.75*t,r);let i=new N((a,u)=>a.count()*a.volume()-u.count()*u.volume());for(;o.size();)i.push(o.pop());Tt(i,t,r);let s=[];for(;i.size();){let a=i.pop();s.push({color:a.avg(),population:a.count()})}return s}var H=class{async init(){}quantize(t,r){return ge(t,r)}};async function Ot(){let{BrowserPixelLoader:e}=await Promise.resolve().then(()=>(Et(),Lt));return new e}var V=null,$=null;function Gt(e){e.loader&&(V=e.loader),e.quantizer&&($=e.quantizer)}async function Ie(e){return e||V||(V=await Ot(),V)}async function Ft(e){if(e)return await e.init(),e;if($)return $;let t=new H;return await t.init(),$=t,t}function st(e){if(e?.aborted)throw e.reason??new DOMException("Aborted","AbortError")}async function ut(e,t){return st(t?.signal),(await Ie(t?.loader)).load(e,t?.signal,t?.gamut??"srgb")}async function Dt(e,t){let r=await K(e,{colorCount:5,...t});return r?r[0]:null}async function K(e,t){let r=k(t??{});if(st(t?.signal),t?.worker){let{isWorkerSupported:i,extractInWorker:s}=await Promise.resolve().then(()=>(Rt(),Ht));if(i()){let a=await ut(e,t),{createPixelArray:u,resolveOutputGamut:m}=await Promise.resolve().then(()=>(B(),vt)),l=u(a.data,a.width*a.height,r.quality,{ignoreWhite:r.ignoreWhite,whiteThreshold:r.whiteThreshold,alphaThreshold:r.alphaThreshold,minSaturation:r.minSaturation}),h=a.colorSpace??"srgb",c=m(l,h,r.gamut);return s(l,r.colorCount,t?.signal,h,c)}}let[n,o]=await Promise.all([ut(e,t),Ft(t?.quantizer)]);return st(t?.signal),L(n.data,n.width,n.height,r,o,n.colorSpace??"srgb")}async function Bt(e,t){let r=await K(e,{colorCount:16,...t});return U(r??[])}async function*jt(e,t){let r=k(t??{}),[n,o]=await Promise.all([ut(e,t),Ft(t?.quantizer)]);yield*yt(n.data,n.width,n.height,r,o,t?.signal,n.colorSpace??"srgb")}B();it();var Te=new H;function qt(e,t){let r=G(e,{colorCount:5,...t});return r?r[0]:null}function G(e,t){let r=k(t??{}),n=t?.quantizer??Te,o=Me(e,r.gamut);return L(o.data,o.width,o.height,r,n,o.colorSpace??"srgb")}function Vt(e,t){let r=G(e,{colorCount:16,...t});return U(r??[])}function Me(e,t){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement)return _e(e,t);if(typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement)return R(e.getContext("2d"),e.width,e.height,t);if(typeof ImageData<"u"&&e instanceof ImageData)return{data:e.data,width:e.width,height:e.height,colorSpace:e.colorSpace??"srgb"};if(typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement)return Le(e,t);if(typeof ImageBitmap<"u"&&e instanceof ImageBitmap)return T(e.width,e.height,t,r=>r.drawImage(e,0,0));if(typeof OffscreenCanvas<"u"&&e instanceof OffscreenCanvas){let r=e.getContext("2d");if(!r)throw new Error("Could not get 2D context from OffscreenCanvas.");return R(r,e.width,e.height,t)}throw new Error("Unsupported source type. Expected HTMLImageElement, HTMLCanvasElement, HTMLVideoElement, ImageData, ImageBitmap, or OffscreenCanvas.")}function _e(e,t){if(!e.complete)throw new Error('Image has not finished loading. Wait for the "load" event before calling getColorSync/getPaletteSync.');if(!e.naturalWidth)throw new Error("Image has no dimensions. It may not have loaded successfully.");return T(e.naturalWidth,e.naturalHeight,t,r=>r.drawImage(e,0,0,e.naturalWidth,e.naturalHeight))}function Le(e,t){if(e.readyState<2)throw new Error('Video is not ready. Wait for the "loadeddata" or "canplay" event before calling getColorSync/getPaletteSync.');let r=e.videoWidth,n=e.videoHeight;if(!r||!n)throw new Error("Video has no dimensions. It may not have loaded successfully.");return T(r,n,t,o=>o.drawImage(e,0,0,r,n))}function Wt(e,t){let{throttle:r=200,onChange:n,...o}=t,i=!1,s=null,a=null,u=0,m=[];function l(){try{let c=G(e,o);c&&c.length>0&&n(c)}catch{}}function h(){if(i)return;let c=performance.now();c-u>=r&&(e instanceof HTMLVideoElement?e.readyState>=2&&!e.paused&&!e.ended&&(l(),u=c):(l(),u=c)),s=requestAnimationFrame(h)}if(e instanceof HTMLImageElement){if(e.complete&&e.naturalWidth)l();else{let c=()=>{l(),e.removeEventListener("load",c)};e.addEventListener("load",c),m.push(()=>e.removeEventListener("load",c))}a=new MutationObserver(()=>{if(e.complete&&e.naturalWidth)l();else{let c=()=>{l(),e.removeEventListener("load",c)};e.addEventListener("load",c)}}),a.observe(e,{attributes:!0,attributeFilter:["src","srcset"]})}else if(e instanceof HTMLVideoElement){s=requestAnimationFrame(h);let c=()=>{i||l()};e.addEventListener("seeked",c),m.push(()=>e.removeEventListener("seeked",c))}else s=requestAnimationFrame(h);return{stop(){i=!0,s!==null&&(cancelAnimationFrame(s),s=null),a&&(a.disconnect(),a=null);for(let c of m)c();m.length=0}}}D();return Zt(Ee);})();
//# sourceMappingURL=color-thief.global.js.map