const img = document.getElementById("img-start");
const radius = document.getElementById("radius");
const sigma = document.getElementById("sigma");
const edgeWidth = document.getElementById("edge-width");
const edgeHeight = document.getElementById("edge-height");
const button = document.getElementById("blur");
const imgUrl = document.getElementById("img-url");
const grayscale = document.getElementById("grayscale");
const time = document.getElementById("time");

const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

const times = [];

var rad = parseInt(radius.value);
var sig = parseInt(sigma.value);
var edgeW = parseInt(edgeWidth.value);
var edgeH = parseInt(edgeHeight.value);
var gray = grayscale.value == "true";

let conv = createConvolution(rad, sig);

function createConvolution(rad, sig) {

    let size = 2 * rad + 1;
    let conv = new Array(size);
    let sum = 0;

    // Calculate initial matrix
    for (let i = 0, y = -rad; i < size; i++, y++) {
        conv[i] = new Array(size);
        for (let j = 0, x = -rad; j < size; j++, x++) {
            conv[i][j] = 1 / (2 * Math.PI * sig*sig) * Math.pow(Math.E, - (x*x + y*y) / (2 * sig*sig));
            sum += conv[i][j];
        }
    }

    // Normalize Matrix
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            conv[i][j] = conv[i][j] / sum;
        }
    }

    return conv;
}


radius.onchange = function(e) {
    rad = Math.max(0, parseInt(e.target.value));
    conv = createConvolution(rad, sig);
}
sigma.onchange = function(e) {
    sig = Math.max(0, parseFloat(e.target.value));
    conv = createConvolution(rad, sig);
}
edgeWidth.onchange = function(e) {
    edgeW = Math.max(0, parseInt(e.target.value));
}
edgeHeight.onchange = function(e) {
    edgeH = Math.max(0, parseInt(e.target.value));
}
imgUrl.onchange = function(e) {
    img.src = e.target.value;

    img.onload = function() {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        context.drawImage(img, 0, 0);
    }
}
grayscale.onchange = function(e) {
    gray = e.target.value == "true";
}

window.onload = function() {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
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

            // Edge blur limitations
            if (y1 > edgeH && y1 < h - edgeH && x1 > edgeW && x1 < w - edgeW) continue;

            let newR = 0;
            let newG = 0;
            let newB = 0;

            for (let y2 = y1 - rad, end1 = y1 + rad + 1; y2 < end1; y2++) {

                y = Math.max(0, Math.min(y2, h - 1));
                convY = rad + (y2 - y1);

                for (let x2 = x1 - rad, end2 = x1 + rad + 1; x2 < end2; x2++) {

                    x = Math.max(0, Math.min(x2, w - 1));
                    convX = rad + (x2 - x1);

                    let point = 4 * (w*y + x);

                    newR += conv[convY][convX] * tmpPx[point];
                    newG += conv[convY][convX] * tmpPx[point + 1];
                    newB += conv[convY][convX] * tmpPx[point + 2];

                }
            }

            let point = 4 * (w*y1 + x1);
            let density = Math.floor((newR + newG + newB) / 3);

            px[point] = (gray) ? density : Math.floor(newR);
            px[point + 1] = (gray) ? density : Math.floor(newG);
            px[point + 2] = (gray) ? density : Math.floor(newB);
        }

    }


    // Black and white Gaussian
    /*for (let y1 = 0; y1 < h; y1++) {
        for (let x1 = 0; x1 < w; x1++) {

            let sum = 0;
            let totalNum = 0;

            for (let y2 = Math.max(0, y1 - rad), end1 = Math.min(h, y1 + rad + 1); y2 < end1; y2++) {
                for (let x2 = Math.max(0, x1 - rad), end2 = Math.min(w, x1 + rad + 1); x2 < end2; x2++) {

                    let start = 4 * (w*y2 + x2);

                    sum += (tmpPx[start] + tmpPx[start + 1] + tmpPx[start + 2]) / 3;

                    totalNum++;

                }
            }

            let start = 4 * (w*y1 + x1);
            let avg = sum / totalNum;
            px[start] = avg;
            px[start + 1] = avg;
            px[start + 2] = avg;

        }
    }*/

    // Log generation time
    let t2 = performance.now();
    times.push(Math.floor(t2-t1));
    console.log(`${Math.floor(t2-t1)}ms generation time`);
    time.innerText = "Generation Time: " + Math.floor(t2-t1) + "ms";

    // Clean up
    context.putImageData(data,0,0);
    delete tmpPx;
}