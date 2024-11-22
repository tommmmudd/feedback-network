function mtof(midinote)
{
    return 440 * Math.pow(2, (midinote-69)/12.0)
}
function scaleSnap(note)
{
    return scale[note % scale.length] + 12 * Math.floor(note / scale.length)
}


/**
 * Define a specific voice
 * @param  {context} audio context
 */
voiceTemplate = (function(context) 
{
    function Voice(inputNode, options)
    {
        this.inputNode = inputNode;
        this.outputNode = context.createGain();
        this.outputNode.gain.value = 0.5;

        // networkOutputGain defined externally
        // not local - could also pass in like context?
        this.outputNode.connect(networkOutputGain);

        this.options = options;
        // this.modules = [];
        this.activeModuleIDs = [];
        this.activeModuleNames = [];
        this.moduleCount = Math.floor(Math.random() * 3) + 2;

        this.modules = [];

        // this.totalModelsAvailable = 11;
        // taking "comb delay" out for the moment...
        this.moduleNames = ["bandpass", "multi-delay", "moving filter", "moving delay", "freqshift", "filterbank", "chorus", "kick", "click delay", "ring mod", "tremolo"]
        this.moduleNames.push("reverb") // reverb is always last for testing (doesn't work locally - CORS)

        this.activeModuleIDs = [];
        this.activeModuleNames = [];

        // interconnections between modules in the voice
        this.vcas = [];

        // DC blocking highpass
        this.highpass = context.createBiquadFilter()
        this.highpass.type = "highpass";
        this.highpass.Q.value = 1;
        this.highpass.frequency.value = 20;

        // compressor on output of voice
        this.compressor = audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -20;
        this.compressor.knee.value = 0;
        this.compressor.ratio.value = 20; // 20 is max - might need a more effective method here?
        this.compressor.reduction.value = -20;
        this.compressor.attack.value = 0;
        this.compressor.release.value = 0.2;

        // delay at end of voice - connects to output
        var delayTime = Math.random() * 0.07 + 0.03
        this.delay = context.createDelay(delayTime);

        // voice output routing
        this.highpass.connect(this.compressor)
        this.compressor.connect(this.delay)
        this.delay.connect(this.outputNode);
    };

    Voice.prototype.start = function() 
    {

        /* Modules */
        this.createModules();
        
    };

    Voice.prototype.stop = function() 
    {
        // fade out
        this.outputNode.gain.setTargetAtTime(0, context.currentTime + 0.01, 0.15);
        this.inputNode.disconnect();
        this.inputNode.disconnect();
        // clean up after fade out
        this.modules.forEach(function(node, _) 
        {
            node.stop(context.currentTime + 0.5);
        });
        this.vcas.forEach(function(node, _)
        {
            node.stop(context.currentTime + 0.5); 
        })
    };

    Voice.prototype.reinit = function() 
    {
        // fade out
        this.outputNode.gain.setTargetAtTime(0, context.currentTime + 0.01, 0.05);

        
        // clean up after fade out

        this.inputNode.disconnect()

        this.modules.forEach(function(mod, _) 
        {
             mod.cleanUp();
        });
        
        this.vcas.forEach(function(vca, _) 
        {
             vca.disconnect();
        });
        
        // this.start(context.currentTime + 0.08)
        this.modules = []
        this.vcas = []
        this.createModules();


        // fade back in...
        this.outputNode.gain.setTargetAtTime(1, context.currentTime + 0.09, 0.02);
    };

    Voice.prototype.createModules = function()
    {
        for (var i=0; i < this.moduleCount; i++)
        {

            // if it's not the last one, add the vca to the array
            if (i < this.moduleCount-1)
            {
                this.vcas.push(context.createGain());
            }
            
            // pick a module type
            // var moduleType = Math.floor(Math.random() * this.totalModelsAvailable);
            var moduleType = this.options[Math.floor(Math.random() * this.options.length)];
            console.log("moduleType: "+moduleType + " - " + this.moduleNames[moduleType]);

            // log the id and name of the chosen module
            this.activeModuleIDs[i] = moduleType;
            this.activeModuleNames[i] = this.moduleNames[moduleType];


            // =======================
            // Module types

            var newModule

            switch(moduleType)
            {
                case 0:
                    newModule = new BandpassModule(this.moduleNames[moduleType], context);
                    break;
                case 1:
                    newModule = new MultiDelayModule(this.moduleNames[moduleType], context);
                    break;
                case 2:
                    newModule = new MovingFilterModule(this.moduleNames[moduleType], context);
                    break;
                case 3:
                    newModule = new MovingDelayModule(this.moduleNames[moduleType], context);
                    break;
                case 4:
                    newModule = new FreqshiftModule(this.moduleNames[moduleType], context);
                    break;
                case 5:
                    newModule = new FilterBankModule(this.moduleNames[moduleType], context);
                    break;
                case 6:
                    newModule = new ChorusModule(this.moduleNames[moduleType], context);
                    break;
                case 7:
                    newModule = new KickModule(this.moduleNames[moduleType], context);
                    break;
                case 8:
                    newModule = new ClickDelayModule(this.moduleNames[moduleType], context);
                    break;
                case 9:
                    newModule = new RingModModule(this.moduleNames[moduleType], context);
                    break;
                case 10:
                    newModule = new TremoloModule(this.moduleNames[moduleType], context);
                    break;
                case 11:
                    newModule = new ReverbModule(this.moduleNames[moduleType], context);
                    break;

                /*
                case N:
                    newModule = new CombModule(this.moduleNames[moduleType], context);
                    break;
                    */

                default:
                    newModule = new BandpassModule(this.moduleNames[moduleType], context);
                    break;
            }

            // connect input node either to the original input, or to the previous VCA
            if (i==0)
            {
                this.inputNode.connect(newModule.inputNode)
            }
            else
            {
                this.vcas[i-1].connect(newModule.inputNode)
            }

            // connect output either to the VCA, or to the output
            if (i < this.moduleCount-1)
            {
                newModule.outputNode.connect(this.vcas[i]);
            }
            else
            {
                // this is the last one: output
                newModule.outputNode.connect(this.highpass)
            }


            this.modules.push(newModule);
            

            // let resonanceParam = moogFilter.parameters.get("resonance");
            // resonanceParam.value = 2.8;
            

            // whiteNoise.connect(moogFilter);
            // moogFilter.connect(this.vca);


            
            
            //vca.connect(moogFilter);
            //moogFilter.connect(moogFilter);


            // this.modules.push()
        }
    }

    return Voice;
  });


/**
 * 
 * 
 */
function getHzFromNote(note, ratio)
{
    baseFreq = 220;
    //ratioPair = ratios[note % ratios.length];
    return baseFreq * ratio;
}




function startNote(kbdIndex, noteIndex, ratio)
{
    var frequency = getHzFromNote(noteIndex, ratio);
    var voice = new Voice(frequency);
    active_voices[kbdIndex][noteIndex] = voice;
    voice.start();

    // console.log("startNote: " + noteIndex);
    keyboards[kbdIndex].canvasKeys[noteIndex].noteOn();
}

function stopNote(kbdIndex, noteIndex)
{
    active_voices[kbdIndex][noteIndex].stop();
    delete active_voices[kbdIndex][noteIndex];

    // console.log("stopNote: " + noteIndex);
    keyboards[kbdIndex].canvasKeys[noteIndex].noteOff();
}


function stopAllNotes()
{
    for (var i =0; i<keyboards.length; i++)
    {
        for (var j=0; j<keyboards[i].noteCount; j++)
        {
            if (active_voices[i][j])
            {
                // active_voices[i][j].stop();
                // delete active_voices[i][j];
                //keyboards[i].canvasKeys[i].noteOff();
                keyboards[i].noteTrigger(j);
                //KeyboardLayout.prototype.noteTrigger = function(note)
            }
        }
    }
    // for (var i=0; i<noteCount; i++)
    // {
    //     if (active_voices[i])
    //     {
    //         active_voices[i].stop();
    //         delete active_voices[i];
    //         canvasKeys[i].noteOff();    
    //     }
    // }
}


/// Midi to frequency converter
function mtof(note)
{
  return Math.pow(2, (note-69)/12)*440;
}