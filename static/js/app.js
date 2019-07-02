var canvas;

var vectors = [];

function addVector(value, freq) {
  vectors.push({
    value: value,
    freq: freq
  });
}

function loaded() {
  canvas = document.getElementById("canvas");
  var rect = canvas.getBoundingClientRect();
  var dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = canvas.width * .75;
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
}

var PIXELS_PER_UNIT = 50.0;

function pointToPixel(point) {
  var center = [canvas.width / 2, canvas.height / 2];
  return math.complex(point.re * PIXELS_PER_UNIT + center[0], point.im * PIXELS_PER_UNIT + center[1]);
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
  window.requestAnimationFrame(draw);
}

window.addEventListener("DOMContentLoaded", loaded);
window.addEventListener("resize", resize);
