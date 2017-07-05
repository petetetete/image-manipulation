const img = document.getElementById("img-start");
const radius = document.getElementById("radius");
const edgeWidth = document.getElementById("edge-width");
const button = document.getElementById("blur");

const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

const times = [];

var rad = parseInt(radius.value);
var edgeW = parseInt(edgeWidth.value);


radius.onchange = function(e) {
    rad = Math.max(0, parseInt(e.target.value));
}
edgeWidth.onchange = function(e) {
    edgeW = Math.max(0, parseInt(e.target.value));
}

window.onload = function() {
    canvas.width = img.width;
    canvas.height = img.height;
    context.drawImage(img, 0, 0);
}

button.onclick = function() {

    context.drawImage(img, 0, 0);
    var data = context.getImageData(0,0, canvas.width, canvas.height);

    // Gaussian blur
    var px = data.data;
    var tmpPx = new Uint8ClampedArray(px.length);
    tmpPx.set(px);

    let w = data.width;
    let h = data.height;

    // Avg: 25x 101.71ms
    let t1 = performance.now();
    // Color Gaussian
    for (let y1 = 0; y1 < h; y1++) {
        for (let x1 = 0; x1 < w; x1++) {

            if (x1 > edgeW && x1 < w - edgeW) continue;

            let rSum = 0;
            let gSum = 0;
            let bSum = 0;
            let totalNum = 0;

            for (let y2 = Math.max(0, y1 - rad), end1 = Math.min(h, y1 + rad + 1); y2 < end1; y2++) {
                for (let x2 = Math.max(0, x1 - rad), end2 = Math.min(w, x1 + rad + 1); x2 < end2; x2++) {

                    let start = 4 * (w*y2 + x2);

                    rSum += tmpPx[start];
                    gSum += tmpPx[start + 1];
                    bSum += tmpPx[start + 2];

                    totalNum++;

                }
            }

            let start = 4 * (w*y1 + x1);
            px[start] = rSum / totalNum;
            px[start + 1] = gSum / totalNum;
            px[start + 2] = bSum / totalNum;

        }
    }

    let t2 = performance.now();
    times.push(Math.floor(t2-t1));
    console.log(`${Math.floor(t2-t1)}ms generation time`);
    console.log(`${(times.reduce((a, b) => a + b) / times.length).toFixed(2)}ms average generation time`);

    context.putImageData(data,0,0);
    delete tmpPx;
}