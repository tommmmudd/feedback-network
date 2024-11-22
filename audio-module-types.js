function mtof(midinote)
{
    return 440 * Math.pow(2, (midinote-69)/12.0)
}
function scaleSnap(note)
{
    return scale[note % scale.length] + 12 * Math.floor(note / scale.length)
}



class AudioModule
{
    constructor(name, context)
    {
        this.context = context;
        this.inputNode = this.context.createGain();
        this.outputNode = this.context.createGain();

        // for bypass
        this.processorInput = this.context.createGain();
        this.processorOutput = this.context.createGain();

        this.name = name;
        this.nodes = [];
        this.isBypassed = false;
        this.inputNode.connect(this.processorInput)
        this.processorOutput.connect(this.outputNode);

        // all dynamically created modules
        this.dynamicModules = []
    }

    cleanUp()
    {
        this.inputNode.disconnect()
        this.outputNode.disconnect()
        this.processorInput.disconnect()
        this.processorOutput.disconnect()

        this.dynamicModules.forEach(function(mod, _) 
        {
            //module.disconnect();
            mod.disconnect();
        })
        this.dynamicModules = [];
    }

    toggleBypassed()
    {
        if (this.isBypassed)
        {
            this.setBypassed(false)
        }
        else
        {
            this.setBypassed(true);
        }
    }

    setBypassed(isBypassed)
    {
        this.isBypassed = isBypassed;
        if (this.isBypassed)
        {
            this.outputNode.gain.linearRampToValueAtTime(0.0, this.context.currentTime + 0.01)
            // after 15 ms have passed
            setTimeout(function() 
            {  
                this.inputNode.disconnect()
                this.bypassActions(); // if any
                this.inputNode.connect(this.outputNode);
                this.outputNode.gain.linearRampToValueAtTime(1.0, this.context.currentTime + 0.01)
            }.bind(this), 15);
            
        }
        else
        {
            this.outputNode.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.01)
            // after 40 ms have passed
            setTimeout(function() 
            {  
                this.inputNode.disconnect()
                this.bypassActions(); // if any
                this.inputNode.connect(this.processorInput);
                this.outputNode.gain.linearRampToValueAtTime(1, this.context.currentTime + 0.01)
            }.bind(this), 15);
        }


        
    }

    bypassActions()
    {

    }
}

// 0 bandpass
class BandpassModule extends AudioModule 
{
  constructor(name, context) 
  {
    super(name, context);

    var processorNode = context.createBiquadFilter()
    processorNode.type = "bandpass";
    processorNode.Q.value = 1;

    var tempNote = Math.floor(Math.random() * 48) + 12
    var snappedNote = scaleSnap(tempNote)
    var freq = mtof(snappedNote);
    processorNode.frequency.value = freq;// Math.random() * 800 + 100;

    this.processorInput.connect(processorNode)
    processorNode.connect(this.processorOutput);

    // keep track of dynamically created modules so we can reset
    this.dynamicModules.push(processorNode);
  }
}


// 1 delay lines
class MultiDelayModule extends AudioModule 
{
    constructor(name, context) 
    {
        super(name, context);

        // random number of delays
        var numDelays = Math.floor(Math.random() * 5) + 1

        for (var j=0; j<numDelays; j++)
        {
            var delayTime = Math.random() * 0.3;
            var delay = context.createDelay(delayTime);
            this.processorInput.connect(delay);
            delay.connect(this.processorOutput);

            // keep track of dynamically created modules so we can reset
            this.dynamicModules.push(delay)
        }

    }
}


// 2 moving filter
class MovingFilterModule extends AudioModule 
{
    constructor(name, context) 
    {
        super(name, context);

        var processorNode = context.createBiquadFilter()
        processorNode.type = "bandpass";
        
        processorNode.Q.value = Math.random() * 20 + 5;

        let modDepth = Math.random()
        modDepth = modDepth * modDepth * 1880 + 120; // 200 - 3000

        var lfo = context.createOscillator()
        lfo.type = "sine";
        var freq = Math.random();
        freq = freq*freq * 0.25
        lfo.frequency.value = freq;

        var lfoGain = context.createGain()
        lfoGain.gain.value = modDepth // might need to be .gain.value

        processorNode.frequency.value = modDepth * 1.5; //offset // (1000, audioCtx.currentTime);

        lfo.connect(lfoGain).connect(processorNode.frequency);

        lfo.start(); // NEED TO STOP THIS
        // keep track of dynamically created modules so we can reset

        this.processorInput.connect(processorNode)
        processorNode.connect(this.processorOutput);
        
        this.dynamicModules.push(processorNode)
        this.dynamicModules.push(lfo)
    }

}

// 3 moving delay
class MovingDelayModule extends AudioModule 
{
    constructor(name, context) 
    {
        super(name, context);

        var modDepth = Math.random()
        modDepth = modDepth * modDepth * 2.8 + 0.2; // 200 - 3000

        var delayTime = modDepth * 1.5;
        var processorNode = context.createDelay(delayTime);

        var lfo = context.createOscillator()
        lfo.type = "sine";
        var freq = Math.random();
        freq = freq*freq * 0.0125
        lfo.frequency.value = freq;

        var lfoGain = context.createGain()
        lfoGain.gain.value = modDepth

        lfo.connect(lfoGain).connect(processorNode.delayTime);

        lfo.start(); // NEED TO STOP THIS?

        this.processorInput.connect(processorNode)
        processorNode.connect(this.processorOutput);
        
        this.dynamicModules.push(processorNode)
        this.dynamicModules.push(lfo)
    }
}


// 4 freqshift
class FreqshiftModule extends AudioModule 
{
    constructor(name, context) 
    {
        super(name, context);
        var processorNode = new AudioWorkletNode(context, 'freqshift-processor');
        let freqshiftParam = processorNode.parameters.get("freq");
        freqshiftParam.value = Math.random() * 4 - 2;

        this.processorInput.connect(processorNode)
        processorNode.connect(this.processorOutput);
        
        this.dynamicModules.push(processorNode)
    }

    bypassActions()
    {
        let bypassInt = 0;
        if (this.isBypassed) { bypassInt = 1;}

        let bypassParam = this.dynamicModules[0].parameters.get("bypass");
        bypassParam.value = bypassInt
    }
}

// 5 comb filter
class CombModule extends AudioModule 
{
    constructor(name, context) 
    {
        super(name, context);

        var processorNode = new AudioWorkletNode(context, 'comb-processor');
        var delayTimeParam = processorNode.parameters.get("delayTimeInSeconds");

        var tempNote = Math.floor(Math.random() * 50) + 12
        var snappedNote = scaleSnap(tempNote)
        var freq = mtof(snappedNote);
        delayTimeParam.value = 1.0 / freq;

        this.processorInput.connect(processorNode);
        processorNode.connect(this.processorOutput);

        // keep track of dynamically created modules so we can reset
        this.dynamicModules.push(processorNode);
    }

    bypassActions()
    {
        let bypassInt = 0;
        if (this.isBypassed) { bypassInt = 1;}

        let bypassParam = this.dynamicModules[0].parameters.get("bypass");
        bypassParam.value = bypassInt
    }
}

// 6 filterbank
class FilterBankModule extends AudioModule 
{
    constructor(name, context) 
    {
        super(name, context);

        var filterCount = 8;
        var Q = Math.random() * Math.random() * 180 + 20;
        for (var j=0; j<filterCount; j++)
        {
            var filter = context.createBiquadFilter()
            filter.type = "bandpass";
            filter.Q.value = Q;
            var note = Math.floor(Math.random() * 36) + 12
            var snappedNote = scaleSnap(note)
            var freq = mtof(snappedNote)
            // console.log("filter bank freq: "+freq)
            filter.frequency.value = freq;

            this.processorInput.connect(filter)
            filter.connect(this.processorOutput)

            this.dynamicModules.push(filter);

            // filters.push(filter)
        }
    }
}


// 7 chorus (two delays modulated)
class ChorusModule extends AudioModule 
{
    constructor(name, context) 
    {
        super(name, context);

        var modFreq1 = Math.random() * Math.random() * 0.05
        var modFreq2 = Math.random() * Math.random() * 0.09
        var modDepth1 = Math.random() * 0.02 + 0.01
        var modDepth2 = Math.random() * 0.02 + 0.01
        var modOffset1 = Math.random() * 0.05 + 0.035
        var modOffset2 = Math.random() * 0.05 + 0.035
        
        var delayTime1 = modDepth1;
        var delay1 = context.createDelay(delayTime1);
        var delayTime2 = modDepth2;
        var delay2 = context.createDelay(delayTime2);

        this.processorInput.connect(delay1);
        this.processorInput.connect(delay2);
        delay1.connect(this.processorOutput)
        delay2.connect(this.processorOutput)

        var lfo1 = context.createOscillator()
        lfo1.type = "sine";
        lfo1.frequency.value = modFreq1;
        var lfoGain1 = context.createGain()
        lfoGain1.gain.value = modOffset1

        var lfo2 = context.createOscillator()
        lfo2.type = "sine";
        lfo2.frequency.value = modFreq2;
        var lfoGain2 = context.createGain()
        lfoGain2.gain.value = modOffset2

        lfo1.connect(lfoGain1).connect(delay1.delayTime);
        lfo2.connect(lfoGain2).connect(delay2.delayTime);

        lfo1.start(); // NEED TO STOP THIS
        lfo2.start()
        this.dynamicModules.push(delay1);
        this.dynamicModules.push(delay2);
        this.dynamicModules.push(lfo1);
        this.dynamicModules.push(lfo2);
    }

}

// 8 Kick Drum
class KickModule extends AudioModule 
{
    constructor(name, context) 
    {
        super(name, context);

        //kickGain = context.createGain()
        this.processorOutput.gain.value = Math.random()* 4 + 13;  

        

        var processorNode = new AudioWorkletNode(context, 'kick-processor');
        processorNode.connect(this.processorOutput)

        // also just pass dry audio
        this.processorInput.connect(this.processorOutput)
        // let freqshiftParam = firstNodeInModule.parameters.get("freq");
        // freqshiftParam.value = Math.random() * 4 - 2;  

        this.dynamicModules.push(processorNode);  
    }

    bypassActions()
    {
        let bypassInt = 0;
        if (this.isBypassed) { bypassInt = 1;}

        let bypassParam = this.dynamicModules[0].parameters.get("bypass");
        bypassParam.value = bypassInt;
    }
}


// 9 Click delay
class ClickDelayModule extends AudioModule 
{
    constructor(name, context) 
    {
        super(name, context);

        var modDepth = Math.random()
        modDepth = modDepth * modDepth * 2.8 + 0.2; // 200 - 3000

        var delayTime = modDepth * 1.5;
        var processorNode = context.createDelay(delayTime);

        var lfo = context.createOscillator()
        lfo.type = "square";
        // var freq = Math.random();
        // freq = freq*freq*freq*6;
        var freq = (Math.floor(Math.random() * 16) + 1) / 32.0
        lfo.frequency.value = freq;

        var lfoGain = context.createGain()
        lfoGain.gain.value = modDepth

        lfo.connect(lfoGain).connect(processorNode.delayTime);

        lfo.start(); // NEED TO STOP THIS

        this.processorInput.connect(processorNode);
        processorNode.connect(this.processorOutput);

        this.dynamicModules.push(processorNode);
        this.dynamicModules.push(lfo);
    }
}



// 10 Ring Mod
class RingModModule extends AudioModule 
{
    constructor(name, context) 
    {
        super(name, context);

        var processorNode = context.createGain();
        processorNode.gain.value = 0;

        var modDepth = Math.random() * 0.5 + 0.5

        var lfo = context.createOscillator()
        lfo.type = "sine";
        var note = Math.floor(Math.random() * 36) + 12
        var snappedNote = scaleSnap(note)
        var freq = mtof(snappedNote)
        lfo.frequency.value = freq;

        var lfoGain = context.createGain()
        lfoGain.gain.value = modDepth

        lfo.connect(lfoGain).connect(processorNode.gain);

        lfo.start(); // NEED TO STOP THIS

        this.processorInput.connect(processorNode);
        processorNode.connect(this.processorOutput);

        this.dynamicModules.push(processorNode);
        this.dynamicModules.push(lfo);

    }
}

// 11 Tremolo
class TremoloModule extends AudioModule 
{
    constructor(name, context) 
    {
        super(name, context);

        var processorNode = context.createGain();
        processorNode.gain.value = 0.707;

        var modDepth = Math.random() * 0.5 + 0.5

        var lfo = context.createOscillator()
        lfo.type = "sine";
        var freq = (Math.floor(Math.random() * 16) + 1) / 4.0
        lfo.frequency.value = freq;

        var lfoGain = context.createGain()
        lfoGain.gain.value = modDepth

        lfo.connect(lfoGain).connect(processorNode.gain);

        lfo.start(); // NEED TO STOP THIS

        this.processorInput.connect(processorNode);
        processorNode.connect(this.processorOutput);

        this.dynamicModules.push(processorNode);
        this.dynamicModules.push(lfo);
    }
}

class ReverbModule extends AudioModule 
{
    constructor(name, context) 
    {
        super(name, context);

        var processorNode = context.createReverbFromUrl(reverbUrl, function() {
            this.processorInput.connect(processorNode);
            processorNode.connect(this.processorOutput);
        }.bind(this));

        this.dynamicModules.push(processorNode);

    }
}


// 12 reverb

/*

// 12 reverb
if (moduleType == 12)
{
    //var firstNodeInModule = context.createGain()
    // firstNodeInModule.gain.value = 1
    finalNodeInModule = context.createGain()
    finalNodeInModule.gain.value = 1
    firstNodeInModule = audioContext.createReverbFromUrl(reverbUrl, function() {
        firstNodeInModule.connect(finalNodeInModule);
    });
    // firstNodeInModule.connect(reverb)

}











*/

