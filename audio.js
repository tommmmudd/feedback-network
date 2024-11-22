// more colour palettes here: https://www.color-hex.com/color-palettes/
colours = garden;

// display modules
moduleSets = []

// module options
options = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; 
options.push(11)// add 11 for reverb. Also need to update index AND display.js setupCheckboxes()

// canvas and context are global - is that useful? may need to update classes
var networkCanvas = document.querySelector('.network');
var ctx = networkCanvas.getContext("2d");
var isAudioStarted = false;

console.clear();
const audioContext = new AudioContext();

scale = [0, 2, 3, 5, 7, 8, 10]

// external reverb
reverbjs.extend(audioContext); // requires HTML: <script src="../resources/reverb.js"></script>

var nodeOutputs = audioContext.createGain(); 

// setup reverb now as need to load the IR
let reverbGain = audioContext.createGain();
reverbGain.gain.value = 1;

let reverbUrl = "https://tommudd.co.uk/feedback/resources/AbernyteGrainSilo.mp4";
// let reverb = audioContext.createReverbFromUrl(reverbUrl, function() {
//   reverb.connect(reverbGain);
// });

// use compressor here for dynamics?
// https://riptutorial.com/web-audio

networkOutputGain = audioContext.createGain();
// networkOutputGain.gain.value = 1;

var noiseVca = audioContext.createGain();
var whiteNoiseGainScaling = 1.0;

var voices = [];
var inputVCAs = [];

var fbGain = 15
var fbVCAs = []
var panNodes = []
var voiceCount = 4;
// var voiceTest;
var voice1
var Voice = voiceTemplate(audioContext);



// =================================
// =================================
// STRUCTURE AND INITIALISATION
// called below when the button is pressed for the first time
const startAudio = async (context) => {

  // =================================
  // =================================
  // SETUP 
  console.log("Adding additional modules");
  await context.audioWorklet.addModule('moog-filter-processor.js');
  await context.audioWorklet.addModule('whitenoise-processor.js');
  await context.audioWorklet.addModule('freqshift-processor.js');
  await context.audioWorklet.addModule('comb-processor.js');
  await context.audioWorklet.addModule('kick-processor.js');


  var whiteNoise = new AudioWorkletNode(context, 'whitenoise-processor');
  // var whiteNoise = context.createOscillator();
  // whiteNoise.frequency.value = 440;
  // whiteNoise.type = "sine";
  // whiteNoise.start()

  
  noiseVca.gain.value = (Math.random()*0.01 + 0.01) * whiteNoiseGainScaling;
  whiteNoise.connect(noiseVca)
  for (var i=0; i<voiceCount; i++)
  {
    vca = audioContext.createGain()
    inputVCAs.push(vca)
    fbVCA = audioContext.createGain()
    fbVCA.gain.value = fbGain
    fbVCAs.push(fbVCA)

    noiseVca.connect(inputVCAs[i]);
  }
  


  
  nodeOutputs.gain.value = 0.333;

  // fb matrix
  for (var i=0; i<voiceCount-1; i++)
  {
    fbVCAs[i].connect(inputVCAs[i+1]);
    voice = new Voice(inputVCAs[i], options)
    voice.outputNode.connect(fbVCAs[i])
    voices.push(voice)
  }

  voices.push (new Voice(inputVCAs[voiceCount-1], options))
  fbVCAs[voiceCount-1].connect(inputVCAs[0]);     // wrap feedback around
  voice.outputNode.connect(fbVCAs[voiceCount-1])


  

  const masterGain = audioContext.createGain();
  masterGain.gain.value = 0.65;


  for (let i=0; i<voices.length; i++)
  {
    panNode = audioContext.createStereoPanner();
    panNode.pan.value = Math.random()*1.6 - 0.8  // ±0.8
    voices[i].outputNode.connect(panNode)
    panNode.connect(nodeOutputs)
    panNodes.push(panNode)
    voices[i].start();  

  } 

  nodeOutputs.connect(masterGain);
  masterGain.connect(context.destination);


  /*
  
  */

  // =========================
  // VISUALISATION

  var analyser = context.createAnalyser();
  masterGain.connect(analyser);

  analyser.fftSize = 4096;
  var bufferLength = analyser.frequencyBinCount;
  var bufferToUse = bufferLength/3
  var dataArray = new Uint8Array(bufferToUse);

  var canvas = document.querySelector('.visualizer');
  var canvasCtx = canvas.getContext("2d");


  canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

  function draw() {

    drawVisual = requestAnimationFrame(draw);

    analyser.getByteFrequencyData(dataArray);

    // canvasCtx.fillStyle = 'rgb(239, 239, 239)';//  - this is #efefef?
    canvasCtx.fillStyle = colours['col5'];
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    var barWidth = (canvas.width / bufferToUse) * 2.5;
    var barHeight;
    var x = 0;
    for(var i = 0; i < bufferToUse; i++) 
    {
      barHeight = dataArray[i]/2;
      barHeight = barHeight / 150.0;
      barHeight *= barHeight*barHeight;
      barHeight *= 500

      // canvasCtx.fillStyle = 'rgb(50,50,'+(barHeight+50)+')';
      canvasCtx.fillStyle = colours['col1'];
      canvasCtx.fillRect(x, canvas.height - barHeight/2, barWidth, barHeight);

      x += barWidth + 1;
    }
  };

  draw();





  

  ctx.font = "20px serif";
  ctx.textAlign="center"; 
  ctx.textBaseline = "middle";

  setupNetworkCanvas(ctx, networkCanvas);


  function drawNetwork() {

    drawVisual = requestAnimationFrame(drawNetwork);

    // ctx.fillStyle = 'rgb(239, 239, 239)';//  - this is #efefef?
    ctx.fillStyle = colours['col5']; //rgb(239, 239, 239)'//'rgb(30, 30, 30)';
    ctx.fillRect(0, 0, networkCanvas.width, networkCanvas.height);

    for (var i=0; i<moduleSets.length; i++)
    {
      moduleSets[i].draw();
    }

    // drawNetworkToCanvas(ctx, networkCanvas);
  };

  drawNetwork();

  isAudioStarted = true;

};
