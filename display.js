class ModuleSet
{
  constructor(x, y, w, h, innerBorder, voice, ctx, isLastModule)
  {
    this.modules = [];
    this.moduleCount;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.innerBorder = innerBorder;
    this.connectedVoice = voice; // each voice has a number of modules: modules
    this.ctx = ctx;
    this.xSpace = 2.5*this.innerBorder;
    this.moduleW;
    this.moduleH;
    this.isLastModule = isLastModule;
    this.voiceBypassed = false;
  }

  checkBoundaries(inX, inY)
  {
    var withinVoiceBoundary = false;
    if (inX > this.x && inX < this.x + this.w && inY > this.y && inY < this.y + this.h)
    {
      console.log("clicked in a voice");
      withinVoiceBoundary = true;
      
      var found = false;
      for (var i=0; i<this.moduleCount; i++)
      {
        var foundThisModule = this.modules[i].checkBoundaries(inX, inY);
        if (foundThisModule) {found = true;}
      }

      if (! found)
      {
        if (this.voiceBypassed)
        {
          this.voiceBypassed = false;
        }
        else
        {
          this.voiceBypassed = true;
        }
        for (var i=0; i<this.moduleCount; i++)
        {
          this.modules[i].audioModule.setBypassed(this.voiceBypassed);
        }
      }

    }

    
  }

  draw()
  {

    // bounding rect for this voice
    this.ctx.fillStyle = colours['col2'];
    // this.ctx.strokeStyle = "darkblue";
    this.ctx.strokeStyle = colours['col4']
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(this.x, this.y, this.w, this.h, 10);
    this.ctx.fill();
    this.ctx.stroke();

    // output arrow
    this.ctx.strokeStyle = colours['col4']
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    let midY = (this.y+this.innerBorder) + this.moduleH/2
    let arrowStartX = this.x + (this.moduleCount) * (this.moduleW) + ((this.moduleCount-1) * this.xSpace) + this.innerBorder*2
    canvas_arrow(this.ctx, arrowStartX, midY, arrowStartX + this.xSpace, midY);
    this.ctx.stroke();

    // draw modules and arrows
    for (var i=0; i<this.moduleCount; i++)
    {
      // draw individual module
      this.modules[i].draw();
      
      // draw connecting arrow
      this.ctx.strokeStyle = colours['col4']
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      if (i < this.moduleCount-1)
      {
        let midY = (this.y+this.innerBorder) + this.moduleH/2
        let arrowStartX = this.x + (i+1) * (this.moduleW) + (i * this.xSpace) + this.innerBorder
        canvas_arrow(this.ctx, arrowStartX, midY, arrowStartX + this.xSpace, midY);
      }
      this.ctx.stroke();
    }

    if (this.isLastModule)
    {

      let yTop    = this.innerBorder*0.5 + this.h/2
      let yBottom = (this.y+this.innerBorder*0.5) + this.h/2
      let xLeft   = this.x*0.5
      let xRight  = this.x
      // feedback arrow back to first voice
      this.ctx.beginPath();
      canvas_arrow(this.ctx, xLeft, yTop, xRight, yTop);
      this.ctx.moveTo(xLeft , yBottom);
      this.ctx.lineTo(xLeft , yTop);
      this.ctx.moveTo(xRight, yBottom);
      this.ctx.lineTo(xLeft , yBottom);
      this.ctx.stroke();
    }
    else
    {
      // direct connection arrow between voices
      this.ctx.beginPath();
      canvas_arrow(this.ctx, this.x + this.w/2, this.y + this.h, this.x + this.w/2, this.y + this.h + this.innerBorder*2);
      this.ctx.stroke();

    }
  }

  addNModules(moduleCount)
  {
    this.moduleCount = moduleCount;
    // this.xSpace = 2.5*this.innerBorder;
    //console.log("adding modules: "+this.moduleCount)
    // w = (cvs.width - borderX*2 - 2*innerBorder - (xSpace*(moduleCount-1)))/(moduleCount)
    this.moduleW = (this.w - 2*this.innerBorder - (this.xSpace * (this.moduleCount-1)))/(this.moduleCount)
    this.moduleH = this.h - this.innerBorder*2;

    for (var i=0; i<this.moduleCount; i++)
    {
      
      var moduleX = this.x  +  i * (this.moduleW + this.xSpace)  +  this.innerBorder;
      var moduleY = this.y + this.innerBorder;

      let text = this.connectedVoice.activeModuleNames[i];
      let audioModule = this.connectedVoice.modules[i]; // NOTE: not yet really a module - see audio.js

      this.modules.push(new Module(moduleX, moduleY, this.moduleW, this.moduleH, text, audioModule, this.ctx))
    }
      

  }

  // addModule(x, y, w, h, )
}

class Module
{
  constructor(x, y, w, h, text, audioModule, ctx)
  {
    this.x = x;
    this.y = y;
    this.w = w;         // can dig these out from the parent?
    this.h = h;
    this.text = text;
    this.audioModule = audioModule;
    this.ctx = ctx;
  }

  draw()
  {
    let midX = this.x + this.w/2
    let midY = this.y + this.h/2

    // console.log("drawing a module -  x: "+this.x + "  y: "+this.y + "  w: "+this.w+"  h: "+this.h);

    
    // rectangle
    this.ctx.fillStyle = colours['col3'] 
    if (this.audioModule.isBypassed)
    {
      this.ctx.fillStyle = colours['col4']
    }
    this.ctx.strokeStyle = colours['col4']
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(this.x, this.y, this.w, this.h, 5);
    this.ctx.fill();

    // text inside rectangle
    this.ctx.fillStyle = colours['col5']
    let maxTextWidth = this.w * 0.9;
    this.ctx.fillText(this.text, midX, midY, maxTextWidth);
    this.ctx.stroke();

  }

  // boolean
  checkBoundaries(inX, inY)
  {
    var found = false;
    if (inX > this.x && inX < this.x + this.w && inY > this.y && inY < this.y + this.h)
    {
      this.audioModule.toggleBypassed();
      console.log("clicked: "+this.audioModule.name);
      found = true;
    }
    return found;
  }
}



function setupNetworkCanvas(ctx, cvs)
{
  let maxTextWidth =  cvs.width/6;

  borderX = cvs.width * 0.04
  borderY = cvs.height * 0.01
  innerBorder = cvs.width*0.015

  
  var y = borderY;
  h = (cvs.height - borderY*2 - (innerBorder*(voices.length - 1)))/(voices.length+1)

  var xSpace = cvs.width * 0.04;

  // for each voice
  for (var i = 0; i < voices.length; i++) 
  {
    
    var x = borderX;
    moduleCount = voices[i].moduleCount;
    w = cvs.width - borderX*2

    isLastModule = false;
    if (i == voices.length-1) {isLastModule = true;}
    moduleSets.push(new ModuleSet(x, y + i * (h + innerBorder*2), w, h, innerBorder, voices[i], ctx, isLastModule))

    // add all the modules for this voice
    moduleSets[i].addNModules(moduleCount)

  }

}


function canvas_arrow(context, fromx, fromy, tox, toy) {
  var headlen = 10; // length of head in pixels
  var dx = tox - fromx;
  var dy = toy - fromy;
  var angle = Math.atan2(dy, dx);
  context.moveTo(fromx, fromy);
  context.lineTo(tox, toy);
  context.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
  context.moveTo(tox, toy);
  context.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
}




// ========================================
// ========================================
// Mouse actions

networkCanvas.addEventListener("mousedown", function (e) 
{
  let rect = networkCanvas.getBoundingClientRect();
  let x = event.clientX - rect.left;
  let y = event.clientY - rect.top;

  console.log("Mousedown: "+x + " "+y);

  for (var i=0; i<moduleSets.length; i++)
  {
    moduleSets[i].checkBoundaries(x, y)
  }

})

networkCanvas.addEventListener("mouseup", function (e) 
{
  // console.log("mouseup ")
  // turnOffNoteIfOn(heldKeyboardIndex, heldNote)  
})







// ========================================
// ========================================
// HTML ELEMENTS

// Power button
const powerButton = document.getElementById('onOff');   // power button from HTML
var notYetOn = true;                        // has the audio yet to be started for the first time?
if (powerButton)
{
  powerButton.addEventListener('click', async () => {

    // if it's on, turn it off
    if (powerButton.dataset.power === 'on') {

      audioContext.suspend();       // turn the audio off

      // set button state, text, and colour
      powerButton.dataset.power = 'off';
      powerButton.innerHTML = "Paused";
      powerButton.style.background = "#efefef";

      console.log("switching off");
    }

    // otherwise, turn it on/restart it
    else {

      if (notYetOn) {
        await startAudio(audioContext);     // <-- calls function above
        notYetOn = false;                   // disable the one-time flag so that the startup is not run multiple times
      }

      audioContext.resume();      // turn audio on

      // set button state, text, and colour
      powerButton.dataset.power = 'on';
      powerButton.innerHTML = "Running...";
      powerButton.style.background = "#4CCF90";

      console.log("switching on");
    }

  }, false);
}

const resetButton = document.getElementById('resetButton');   // power button from HTML
if (resetButton)
{
  resetButton.addEventListener('click', async () => {
    location.reload()
  })
}

// Randomise button
const randomiseButton = document.getElementById('randomise');   // power button from HTML

if (randomiseButton)
{
  randomiseButton.addEventListener('click', async () => {
    
    for (var i=0; i<voiceCount; i++)
    {
      voices[i].reinit();
      //voices[i].start(audioContext.currentTime + 0.65)
    }
    voices = [];
    

    /*
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

    for (let i=0; i<voices.length; i++)
    {
      voices[i].outputNode.connect(nodeOutputs)
      voices[i].start();  

    } 
    */


  })

}

// white noise on/off checkbox
const whitenoiseCheckbox = document.getElementById("noise")

whitenoiseCheckbox.addEventListener('change', (event) => {
  if (event.currentTarget.checked) {
    whiteNoiseGainScaling = 1;
  }
  else
  {
    whiteNoiseGainScaling = 0;
  }
  if (isAudioStarted)
  {
    noiseVca.gain.value = whiteNoiseGainScaling * 0.005;
  }
})

setupCheckboxes();


// white noise on/off checkbox
function setupCheckboxes()
{
  var checkboxIds = ["bandpass", "multi-delay", "moving-filter", "moving-delay", "freqshift", "filterbank", "chorus", "kick", "click-delay", "ring-mod", "tremolo"];//, "reverb"]

  // using reverb?
  checkboxIds.push("reverb")

  for (var i=0; i<checkboxIds.length; i++)
  {
    checkboxId = checkboxIds[i]
    const checkbox = document.getElementById(checkboxId)

    checkbox.addEventListener('change', (event) => {
      var val = 0
      if (event.currentTarget.checked) {
        val = 1;
      }
      name = event.currentTarget.name
      var id = checkboxIds.indexOf(name);

      var index = options.indexOf(id);
      if (val == 0)
      {
        // if it is there, remove it, otherwise do nothing
        if (index > -1) { // only splice array when item is found
          options.splice(index, 1); // 2nd parameter means remove one item only
        }
      }
      else
      {
        // if it is not there, add it
        if (index <= -1)
        {
          options.push(id);
        }
      }
    })
  }

}


// Voice Count slider
const voiceCountSlider = document.getElementById("voiceCountSlider");
const voiceCountDisplay = document.getElementById("voiceCountDisplay");
voiceCountSlider.addEventListener('input', function() 
{
  voiceCount = this.value;
  voiceCountDisplay.value = this.value;

}, "false");