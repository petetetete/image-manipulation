/**
 * Mutate ImageData input by applying Gaussian blur
 * @param  {ImageData} imgData
 * @return {ImageData}          Density isolated image data
 */
function gaussianBlur(imgData, convolution, grayscale = true) {

    const convDiam = convolution.length;

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

            let newR = 0;
            let newG = 0;
            let newB = 0;

            // Iterate over convolution matrix
            for (let convY = 0; convY < convDiam; convY++) {

                // Current convolution matrix y location
                let cy = Math.max(0, Math.min(y + convY - Math.floor(convDiam / 2), h - 1));

                for (let convX = 0; convX < convDiam; convX++) {

                    // Current convolution matrix y location
                    let cx = Math.max(0, Math.min(x + convX - Math.floor(convDiam / 2), w - 1));
                    let point = 4 * (cx + cy*w);

                    // Do vonvolution calculation
                    newR += convolution[convY][convX] * px[point];
                    newG += convolution[convY][convX] * px[point + 1];
                    newB += convolution[convY][convX] * px[point + 2];

                }
            }

            const point = 4 * (x + y*w);
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
    const sobelXKernel = [[1, 0, -1],
                    [2, 0, -2],
                    [1, 0, -1]];

    const sobelYKernel = [[ 1,  2,  1],
                    [ 0,  0,  0],
                    [-1, -2, -1]];

    // Iterate over each pixel in data array, abstracted with x's and y's
    for (let y = 0; y < h; y++) {

        for (let x = 0; x < w; x++) {

            // Directional magnitude totals
            let magX = 0;
            let magY = 0;

            // Iterate over sobel matrices
            for (let sobelY = 0; sobelY < 3; sobelY++) {

                // Current sobel matrix y location
                let sy = Math.max(0, Math.min(y + sobelY - 1, h - 1));

                for (let sobelX = 0; sobelX < 3; sobelX++) {

                    // Current sobel matrix x location
                    let sx = Math.max(0, Math.min(x + sobelX - 1, w - 1));

                    let point = 4 * (sx + sy*w);

                    magX += px[point] * sobelXKernel[sobelY][sobelX];
                    magY += px[point] * sobelYKernel[sobelY][sobelX];

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

/**
 * Refine an ImageData object by removing pixels that are below density thresholds
 * @param  {ImageData} imgData      Density isolated image data
 * @param  {Integer} highThreshold  Min density value for a strong edge (0 <= highThreshold <= 255)
 * @param  {integer} lowThreshold   Min density value for a weak edge (0 <= lowThreshold <= highThreshold)
 * @return {ImageData}
 */
function doubleThreshold(imgData, highThreshold, lowThreshold = highThreshold) {

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

            // Keep if above high threshold
            if (px[point] >= highThreshold) {
                outPx[point] = px[point];
                outPx[point + 1] = px[point + 1];
                outPx[point + 2] = px[point + 2];
                outPx[point + 3] = 255;
            }

            // Conditionally keep is above low threshold
            else if (px[point] >= lowThreshold) {

                let keep = false;

                // Blob analysis of 8 (technically all 9) surrounding pixels
                loop1:
                for (let blobY = 0; blobY < 3; blobY++) {

                    // Current blob matrix y location
                    let by = Math.max(0, Math.min(y + blobY - 1, h - 1));

                    for (let blobX = 0; blobX < 3; blobX++) {

                        // Current blob matrix x location
                        let bx = Math.max(0, Math.min(x + blobX - 1, w - 1));
                        let point = 4 * (bx + by*w);

                        // If adjacent point is strong, keep this weak point
                        if (px[point] >= highThreshold) {
                            keep = true;
                            break loop1;
                        }

                    }
                }

                if (keep) {
                    outPx[point] = px[point];
                    outPx[point + 1] = px[point + 1];
                    outPx[point + 2] = px[point + 2];
                    outPx[point + 3] = 255;
                }
                else {
                    outPx[point] = 0;
                    outPx[point + 1] = 0;
                    outPx[point + 2] = 0;
                    outPx[point + 3] = 255;
                }
            }

            // Suppress if below low threshold
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


/* BEGIN: UI stuff */

// UI element grabbing
const img = document.getElementById("img-start");
const radius = document.getElementById("radius");
const sigma = document.getElementById("sigma");
const lowThreshold = document.getElementById("low-threshold");
const highThreshold = document.getElementById("high-threshold");
const processStep = document.getElementById("process-step");
const imgUrl = document.getElementById("img-url");
const button = document.getElementById("submit");
const time = document.getElementById("time");

const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

const times = [];

let rad = parseInt(radius.value);
let sig = parseInt(sigma.value);
let lowThresh = parseInt(lowThreshold.value);
let highThresh = parseInt(highThreshold.value);
let proc = processStep.value;

let conv = createConvolution(rad, sig);


radius.onchange = function(e) {
    rad = Math.max(0, Math.min(10, parseInt(e.target.value || 0)));
    conv = createConvolution(rad, sig);
}
sigma.onchange = function(e) {
    sig = Math.max(0, parseFloat(e.target.value || 0));
    conv = createConvolution(rad, sig);
}
lowThreshold.onchange = function(e) {
    lowThresh = Math.max(0, Math.min(parseInt(e.target.value || 0), 255));
}
highThreshold.onchange = function(e) {
    highThresh = Math.max(0, Math.min(parseFloat(e.target.value || 0), 255));
}
processStep.onchange = function(e) {
    proc = e.target.value;
}
imgUrl.onchange = function(e) {
    img.src = e.target.value || "images/valve.PNG";

    img.onload = function() {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        context.drawImage(img, 0, 0);
    }
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
        outData = gaussianBlur(data, conv);
    }
    else if (proc == "sobel") {
        let gaussData = gaussianBlur(data, conv);
        [outData, _] = sobelFilter(gaussData);
    }
    else if (proc == "nonmax") {
        let gaussData = gaussianBlur(data, conv);
        let [sobelData, gradientAngles] = sobelFilter(gaussData);
        outData = nonMaxSuppression(sobelData, gradientAngles);
    }
    else {
        let gaussData = gaussianBlur(data, conv);
        let [sobelData, gradientAngles] = sobelFilter(gaussData);
        let nonMaxData = nonMaxSuppression(sobelData, gradientAngles);
        outData = doubleThreshold(nonMaxData, highThresh, lowThresh);
    }

    // Performance testing time end
    let t2 = performance.now();

    // Log generation time
    times.push(Math.floor(t2-t1));
    time.innerText = "Elapsed Time: " + Math.floor(t2-t1) + "ms";

    // Render new image data and clean up
    context.putImageData(outData, 0, 0);
}

