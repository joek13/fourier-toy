const PRESETS = {
  "circle": {
    "x": "5cos(t)",
    "y": "5sin(t)"
  },
  "knot": {
    "x": "5cos(7t)",
    "y": "5sin(5t)"
  },
  "heart": {
    "x": "0.5 * (16(sin(t)^3))",
    "y": "-0.5 * (13cos(t)-5cos(2t)-2cos(3t)-cos(4t))"
  },
  "superellipse": {
    "x": "5cos(t)^3",
    "y": "5sin(t)^3"
  },
  "none": {
    "x": "",
    "y": ""
  }
};

var canvas;
var xInput;
var yInput;

var math = require("mathjs");
var fft = require("jsfft");

var vectors = [];

function getVectors () {
  return vectors;
}

function addVector(value, freq) {
  vectors.push({
    value: value,
    freq: freq
  });
}

function serializeVector(vector) {
  return JSON.stringify(vector);
}

window.getVectors = getVectors;
window.serializeVector = serializeVector;

var sample_rate = 50;

function fftFreq(n, d) {
  f = [];
  if(n % 2 == 0) {
    for(var i = 0; i <= n/2-1; i++) {
      f.push(i / (d * n));
    }
    for(var i = -n/2; i<0; i++) {
      f.push(i / (d * n));
    }
  } else {
    for(var i = 0; i <= (n-1)/2; i++) {
      f.push(i / (d * n));
    }
    for(var i = -(n-1)/2; i < 0; i++) {
      f.push(i / (d * n));
    }
  }

  return f;
}

MIN_AMPLITUDE = 0.1;

function generateVectors(func, domainMin, domainMax) {
  // performs a fourier transform to discover the vectors that will approximate a complex-valued function func.
  newVectors = [];
  var n = math.floor(sample_rate * (domainMax - domainMin)); // number of samples
  var step = (domainMax - domainMin) / n;
  var values = new fft.ComplexArray(n).map((value, i, n) => {
    var funcValue = func(domainMin + (i/n)*(domainMax-domainMin));
    value.real = funcValue.re;
    value.imag = funcValue.im
  });
  var d = step;
  var freqs = fftFreq(n, d);
  var frequencies = values.FFT().map((frequency, i, n) => {
    // frequency in Hz is i / n
    var value = math.multiply(0.5/(domainMax-domainMin), math.complex(frequency.real, frequency.imag));
    var freq = freqs[i];
    if(math.abs(value) > MIN_AMPLITUDE)
      newVectors.push({value: value, freq: freq});
  });
  return newVectors;
}

function resetDraw() {
  time = 0.0; // reset the time
  points = []; // clear the path
  vectors = [];
}

function updateParametricClicked() {
  resetDraw();

  if(xInput.value.length == 0 || yInput.value.length == 0)
    return;

  try {
    var xExpr = math.compile(xInput.value);
    var yExpr = math.compile(yInput.value);
    var parametric = (t) => {
      var scope = {t: t};
      return math.complex(xExpr.evaluate(scope), yExpr.evaluate(scope));
    };
    vectors = generateVectors(parametric, 0, 2 * math.pi);
  }catch(e) {
    // do nothing (for now)
    console.log("Error parsing expr: "+e);
  }
}
var presetSelect;
function updatePreset() {
  var presetValue = presetSelect.value;
  var preset = PRESETS[presetValue];
  if(preset != undefined && preset != null) {
    xInput.value = preset.x;
    yInput.value = preset.y;
    updateParametricClicked();
  }
}

function loaded() {
  canvas = document.getElementById("canvas");
  xInput = document.getElementById("xParaInput");
  xInput.value = "5cos(5t)";
  yInput = document.getElementById("yParaInput");
  yInput.value = "5sin(7t)";
  presetSelect = document.getElementById("presetSelect");

  var rect = canvas.getBoundingClientRect();
  var dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = canvas.width * .75;

  // register event handlers
  document.getElementById("updateParametricButton").addEventListener("click", updateParametricClicked);
  presetSelect.addEventListener("change", updatePreset);
  document.getElementById("resetButton").addEventListener("click", () => {
    resetDraw();
    updateParametricClicked();
  });

  updateParametricClicked();
  window.requestAnimationFrame(draw);
}

function resize() {
  var rect = canvas.getBoundingClientRect();
  var dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = canvas.width * .75;
}

function drawAxes(context) {
  var center = [context.canvas.width / 2, context.canvas.height / 2];
  context.beginPath();
  context.strokeStyle = "#efefef";
  context.moveTo(center[0], 0); // move to center of the top
  context.lineTo(center[0], context.canvas.height); // move to center of bottom
  context.lineWidth = 3;
  context.stroke();
  context.beginPath();
  context.moveTo(0, center[1]); // move to center of left edge
  context.lineTo(context.canvas.width, center[1]); // line to center of right edge
  context.stroke();

  // draw horizontal tickmarks
  var tickHeight = 10;
  for(var i = -50; i<=50; i++) {
    context.beginPath();
    context.moveTo(center[0] + i * PIXELS_PER_UNIT, center[1] - tickHeight/2);
    context.lineTo(center [0] + i * PIXELS_PER_UNIT, center[1] + tickHeight/2);
    context.stroke();
  }

  //vertical tickmarks
  for(var i = -50; i<=50; i++) {
    context.beginPath();
    context.moveTo(center[0] - tickHeight / 2, center[1] + i * PIXELS_PER_UNIT);
    context.lineTo(center[0] + tickHeight / 2, center[1] + i * PIXELS_PER_UNIT);
    context.stroke();
  }
}

var PIXELS_PER_UNIT = 50.0;

function pointToPixel(point) {
  var center = [canvas.width / 2, canvas.height / 2];
  return math.complex(point.re * PIXELS_PER_UNIT + center[0], point.im * PIXELS_PER_UNIT + center[1]);
}

var points = [];
var index = 0;
var maxPoints = 5000;

function addPoint(point) {
  if(points.length < maxPoints) {
    points.push(point);
  } else {
    points[index % points.length] = point;
    index += 1;
  }
}

function drawArrows(context, time) {
  var pos = math.complex(0, 0);
  for(var i = 0; i < vectors.length; i++) {
    // draw an arrow to the vector's position
    // set pos to the endpoint of this vector
    vector = vectors[i];
    value = math.multiply(vector.value, math.exp(math.multiply(math.i, -2 * math.pi * vector.freq * time)));
    context.strokeStyle = "black";
    context.beginPath();
    var end = math.add(pos, value);
    var posPixel = pointToPixel(pos); // convert both points to pixel space
    var endPixel = pointToPixel(end);
    context.moveTo(posPixel.re, posPixel.im);
    context.lineTo(endPixel.re, endPixel.im);
    context.stroke();
    pos = end;
  }
  // last arrow; add the point to the overall path
  if(vectors.length > 0) addPoint(pos);
}

function drawPath(context) {
  context.strokeStyle = "#ff0000";
  context.beginPath();
  if(points.length > 0) {
    if(points.length < maxPoints) {
      var firstPoint = pointToPixel(points[0]);
      context.moveTo(firstPoint.re, firstPoint.im);
      for(var i = 1; i < points.length; i++) {
        var point = points[i];
        var pixelPoint = pointToPixel(point);
        context.lineTo(pixelPoint.re, pixelPoint.im);
      }
    } else {
      var firstPoint = pointToPixel(points[(index + 1) % points.length]);
      context.moveTo(firstPoint.re, firstPoint.im);
      for(var i = index; i < index + points.length; i++) {
        var point = points[i % points.length];
        var pixelPoint = pointToPixel(point);
        context.lineTo(pixelPoint.re, pixelPoint.im);
      }
    }

    context.stroke();
  }
}

var lastFrame;
var time = 0.0;

function draw() {
  var context = canvas.getContext("2d");

  // timekeeping code
  var now = new Date();
  if(lastFrame !== null && lastFrame !== undefined) {
    var diff = now - lastFrame;
    time += diff / 1000.0; // convert to seconds
  }
  lastFrame = now;

  context.clearRect(0, 0, canvas.width, canvas.height);
  drawAxes(context);
  drawArrows(context, time);
  drawPath(context);
  window.requestAnimationFrame(draw);
}

window.addEventListener("DOMContentLoaded", loaded);
window.addEventListener("resize", resize);
