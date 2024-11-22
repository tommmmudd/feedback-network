
/**
 * Kick drum test
 *
 * @class KickProcessor
 * @extends AudioWorkletProcessor
 */

class Sequencer
{
  constructor(numSteps, min, max)
  {
    this.numSteps = numSteps;
    this.totalDur = totalDur;

    this.min = min;
    this.max = max;

    this.step = 0;
    this.durSeq = [];
    this.paramSeq = [];

  }


}

class Oscillator
{
  constructor(freq, sr)
  {
    this.phase = 0;
    this.freq = freq;
    this.sampleRate = sr;
  }

  setFrequency(freq)
  {
    this.freq = freq
  }

  setSampleRate(sr)
  {
    this.sampleRate = sr;
  }

  process()
  {
    let phaseDelta = this.freq / this.sampleRate
    this.phase += phaseDelta;
    if (this.phase > 1.0) {this.phase -= 1.0;}
    return Math.sin(this.phase * 2.0 * Math.PI);
  }
}


class KickProcessor extends AudioWorkletProcessor {

  static get parameterDescriptors() {
    return [
      { name: 'bypass', defaultValue: 0, minValue: 0, maxValue: 1}, 
     // { name: 'delayTimeInSeconds', defaultValue: 0.01, minValue: 0.0001, maxValue: 1}, 
     
    ];
  }

  constructor(options) {
    super();
    this.osc = new Oscillator(100, sampleRate);
    this.maxFreq = 1000;
    this.minFreq = 40;
    this.counter = 0;
    this.triggerThresh = sampleRate * 3;
    this.maxVol = 1;
    this.volDur = 10000;
    this.pitchEnvDur = 1000;
    this.durOptions = [0.25, 0.5, 1, 2, 4]
    this.durSeq = [];
    this.seqPos = 0;
    this.maxFreqSeq = []
    this.pitchEnvSeq = []
    this.seqLength = Math.floor(Math.random() * 4 + 2);

    for (var i=0; i<this.seqLength; i++)
    {
      this.durSeq.push(sampleRate * this.durOptions[Math.floor(Math.random()*this.durOptions.length)])
      this.maxFreqSeq.push(Math.random() * 1000 + 200)
      this.pitchEnvSeq.push(100 + 5000 * Math.random() * Math.random() * Math.random())
    }
  }

  process(inputs, outputs, parameters) {


    var input = inputs[0][0];

    const outputL = outputs[0][0];
    var outputR = null
    if (outputs[0].length > 1) {
      outputR = outputs[0][1]
    }

    let bypassParam = parameters["bypass"]; 

    this.bypass = 0;
    if (bypassParam.length === 1) {
      this.bypass = parseInt(bypassParam);
    }
    else {
      this.bypass = bypassParam[i];
    }

    // let delayTimeParam = parameters["delayTimeInSeconds"];        // from parameter list declared above

    for (var i = 0; i < outputL.length; i++) 
    {

      let output = 0;

      // check there actually is audio input coming in...
      if (! this.bypass)
      {
      
        this.counter ++;
        if (this.counter >= this.triggerThresh)
        {
          this.counter = 0;
          this.osc.phase = 0;
          this.triggerThresh = this.durSeq[this.seqPos]
          this.maxFreq = this.maxFreqSeq[this.seqPos]; //Math.random() * 1000 + 200
          this.pitchEnvDur =  this.pitchEnvSeq[this.seqPos];

          this.minFreq = Math.random() * 25 + 40
          this.maxVol = Math.random() * 1.8 + 1
          this.maxDur = Math.random() * 10000 + 2000

          this.seqPos ++;
          this.seqPos = this.seqPos % this.seqLength;
        }


        let vol = Math.max(this.volDur - this.counter, 0) * 0.001
        let descendingLine = Math.max(this.pitchEnvDur - this.counter, 0) * 0.001
        descendingLine *= descendingLine

        let freq = descendingLine * (this.maxFreq - this.minFreq) + this.minFreq
        this.osc.setFrequency(freq);

        output = this.osc.process() * vol * this.maxVol;
      }
      

      outputL[i] = output
      if (outputR != null)
      {
        outputR[i] = outputL[i]
      }
    };
    return true;
  }
}

registerProcessor("kick-processor", KickProcessor);