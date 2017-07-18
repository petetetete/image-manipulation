/**
 * Mutate ImageData input by applying Gaussian blur
 * @param  {ImageData} imgData
 * @return {ImageData}          Density isolated image data
 */
function gaussianBlur(imgData, grayscale = true) {

    // Get input ImageData info
    const px = imgData.data;
    const w = imgData.width;
    const h = imgData.height;

    // Create output ImageData
    const out = new ImageData(w, h);
    const outPx = out.data;

    // Iterate over each pixel in data array, abstracted with x's and y's
    for (let y1 = 0; y1 < h; y1++) {

        for (let x1 = 0; x1 < w; x1++) {

            let newR = 0;
            let newG = 0;
            let newB = 0;

            // Iterate over convolution matrix
            for (let y2 = y1 - rad, end1 = y1 + rad + 1; y2 < end1; y2++) {

                // Keep y on edges in extreme case
                let y = Math.max(0, Math.min(y2, h - 1));
                let convY = rad + (y2 - y1);

                for (let x2 = x1 - rad, end2 = x1 + rad + 1; x2 < end2; x2++) {

                    // Keep x on edges in extreme case
                    let x = Math.max(0, Math.min(x2, w - 1));
                    let convX = rad + (x2 - x1);

                    let point = 4 * (x + y*w);

                    // Do vonvolution calculation
                    newR += conv[convY][convX] * px[point];
                    newG += conv[convY][convX] * px[point + 1];
                    newB += conv[convY][convX] * px[point + 2];

                }
            }

            const point = 4 * (x1 + y1*w);
            const density = Math.floor((newR + newG + newB) / 3);

            // Update data array with appropriate value
            outPx[point] = (grayscale) ? density : Math.floor(newR);
            outPx[point + 1] = (grayscale) ? density : Math.floor(newG);
            outPx[point + 2] = (grayscale) ? density : Math.floor(newB);
            outPx[point + 3] = 255;

        }

    }

    return out;
}

/**
 * Mutate ImageData input by applying a Sobel filter
 * @param  {ImageData} imgData             Density isolated image data
 * @return {Array[ImageData, Uint8Array]}  A tuple of new ImageData and gradient angles
 */
function sobelFilter(imgData) {

    // Get input ImageData info
    const px = imgData.data;
    const w = imgData.width;
    const h = imgData.height;

    // Create output ImageData
    const out = new ImageData(w, h);
    const outPx = out.data;

    const outAngles = new Uint8Array(w * h);

    // Sobel filter kernels
    const sobelX = [[1, 0, -1],
                    [2, 0, -2],
                    [1, 0, -1]];

    const sobelY = [[ 1,  2,  1],
                    [ 0,  0,  0],
                    [-1, -2, -1]];

    // Iterate over each pixel in data array, abstracted with x's and y's
    for (let y = 0; y < h; y++) {

        for (let x = 0; x < w; x++) {

            // Directional magnitude totals
            let magX = 0;
            let magY = 0;

            // Iterate over convolution matrix
            for (let a = 0; a < 3; a++) {

                for (let b = 0; b < 3; b++) {

                    let sy = Math.max(0, Math.min(y + a - 1, h - 1));
                    let sx = Math.max(0, Math.min(x + b - 1, w - 1));

                    let point = 4 * (sx + sy*w);

                    magX += px[point] * sobelX[a][b];
                    magY += px[point] * sobelY[a][b];

                }
            }

            let point = 4 * (x + y*w);
            let mag = Math.sqrt(magX*magX + magY*magY);

            // Calculate gradient angle and round it to one of: [0, 45, 90, 135]
            let gradAngle = Math.abs(Math.atan2(magY, magX));

            if (gradAngle < Math.PI / 8 || gradAngle >= 7 * Math.PI / 8) gradAngle = 0;
            else if (gradAngle < 3 * Math.PI / 8) gradAngle = 45;
            else if (gradAngle < 5 * Math.PI / 8) gradAngle = 90;
            else gradAngle = 135;

            outAngles[x + y*w] = gradAngle;

            // Update data array with appropriate value
            outPx[point] = mag;
            outPx[point + 1] = mag;
            outPx[point + 2] = mag;
            outPx[point + 3] = 255;

        }

    }

    return [out, outAngles];
}

/**
 * Supress edge values that are not local maxima to reduce noise
 * @param  {ImageData} imgData          Density isolated image data
 * @param  {Uint8Array} gradientAngles  Array of gradient angles for each density
 * @return {ImageData}
 */
function nonMaxSuppression(imgData, gradientAngles) {

    // Get input ImageData info
    const px = imgData.data;
    const w = imgData.width;
    const h = imgData.height;

    // Create output ImageData
    const out = new ImageData(w, h);
    const outPx = out.data;

    // Iterate over each pixel in data array, abstracted with x's and y's
    for (let y = 0; y < h; y++) {

        for (let x = 0; x < w; x++) {

            let point = 4 * (x + y*w);
            let angle = gradientAngles[x + y*w];

            let compare1;
            let compare2;

            // Find compare values depending on rounded gradient angle
            if (angle == 0) {
                compare1 = px[4 * (Math.min(w - 1, x + 1) + y*w)]; // east
                compare2 = px[4 * (Math.max(0, x - 1) + y*w)]; // west
            }
            else if (angle == 90) {
                compare1 = px[4 * (x + Math.max(0, y - 1)*w)]; // north
                compare2 = px[4 * (x + Math.min(h - 1, y + 1)*w)]; // south
            }
            else if (angle == 45) {
                compare1 = px[4 * (Math.min(w - 1, x + 1) + Math.max(0, y - 1)*w)]; // north-east
                compare2 = px[4 * (Math.max(0, x - 1) + Math.min(h - 1, y + 1)*w)]; // south-west
            }
            else { // 135
                compare1 = px[4 * (Math.max(0, x - 1) + Math.max(0, y - 1)*w)]; // north-west
                compare2 = px[4 * (Math.min(w - 1, x + 1) + Math.min(h - 1, y + 1)*w)]; // south-east
            }
            
            // Keep density (because it's a local max)
            // TODO: Consider permutations of greater than and greater than or equal to
            if (px[point] >= compare1 && px[point] >= compare2) {
                outPx[point] = px[point];
                outPx[point + 1] = px[point + 1];
                outPx[point + 2] = px[point + 2];
                outPx[point + 3] = 255;
            }

            // Throw out density
            else {
                outPx[point] = 0;
                outPx[point + 1] = 0;
                outPx[point + 2] = 0;
                outPx[point + 3] = 255;
            }

        }

    }

    return out;

}


/* BEGIN: UI stuff */

// UI element grabbing
const img = document.getElementById("img-start");
const radius = document.getElementById("radius");
const sigma = document.getElementById("sigma");
const button = document.getElementById("blur");
const imgUrl = document.getElementById("img-url");
const processStep = document.getElementById("process-step");
const time = document.getElementById("time");

const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

const times = [];

var rad = parseInt(radius.value);
var sig = parseInt(sigma.value);
var proc = processStep.value;

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
    rad = Math.max(0, parseInt(e.target.value || 0));
    conv = createConvolution(rad, sig);
}
sigma.onchange = function(e) {
    sig = Math.max(0, parseFloat(e.target.value || 0));
    conv = createConvolution(rad, sig);
}
imgUrl.onchange = function(e) {
    img.src = e.target.value;

    img.onload = function() {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        context.drawImage(img, 0, 0);
    }
}
radius.onchange = function(e) {
    rad = Math.max(0, parseInt(e.target.value || 0));
    conv = createConvolution(rad, sig);
}
processStep.onchange = function(e) {
    proc = e.target.value;
    console.log(proc);
}

window.onload = function() {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    context.drawImage(img, 0, 0);
}

button.onclick = function() {

    // Get image data
    context.drawImage(img, 0, 0);
    let data = context.getImageData(0,0, canvas.width, canvas.height);

    // Performance testing time start
    let t1 = performance.now();

    // Final output data
    let outData;

    // Do different steps of the process depending on the user's selection
    if (proc == "gaussian") {
        outData = gaussianBlur(data);
    }
    else if (proc == "sobel") {
        let gaussData = gaussianBlur(data);
        [outData, _] = sobelFilter(gaussData);
    }
    else {
        let gaussData = gaussianBlur(data);
        let [sobelData, gradientAngles] = sobelFilter(gaussData);
        outData = nonMaxSuppression(sobelData, gradientAngles);
    }

    // Performance testing time end
    let t2 = performance.now();

    // Log generation time
    times.push(Math.floor(t2-t1));
    console.log(`${Math.floor(t2-t1)}ms generation time`);
    time.innerText = "Generation Time: " + Math.floor(t2-t1) + "ms";

    // Render new image data and clean up
    context.putImageData(outData, 0, 0);
}

