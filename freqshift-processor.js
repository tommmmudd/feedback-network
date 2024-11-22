/**
 * Frequency shifter
 * 
 * based on PD hilbert~ and cross_mod~ example wrapped up in freqshift~.pd
 *
 * @class FreqshiftProcessor
 * @extends AudioWorkletProcessor
 */

// Basic Biquad stuck in bandpass mode
class Biquad
{
  constructor()
  {
    this.ff1, this.ff2, this.ff3, this.fb1, this.fb2;
    this.w = [0, 0, 0];
  }

  setCoeffs(allCoeffs)  
  { 
    this.fb1 = allCoeffs[0]
    this.fb2 = allCoeffs[1]
    this.ff1 = allCoeffs[2]
    this.ff2 = allCoeffs[3]
    this.ff3 = allCoeffs[4]
  }

  process(inVal)
  {

    let output = inVal  +  this.fb1 * this.w[1]  +  this.fb2 * this.w[2];
    if (output > 500000 || output < -500000)
    {
      // output = 0;
      // this.w[1] = 0;
      // this.w[2] = 0;
    }

    let y = this.ff1 * output  +  this.ff2 * this.w[1]  +  this.ff3 * this.w[2];
    
    this.w[2] = this.w[1];
    this.w[1] = output; // this.w[0];
    // this.w[0] = output;

    return y;  
  }
}

class Hilbert
{
  constructor()
  {
    this.biquadA1 = new Biquad();
    this.biquadA2 = new Biquad();
    this.biquadB1 = new Biquad();
    this.biquadB2 = new Biquad();

    this.biquadA1.setCoeffs([-0.02569, 0.260502, -0.260502, 0.02569, 1])
    this.biquadA2.setCoeffs([1.8685,  -0.870686, 0.870686, -1.8685,  1])
    this.biquadB1.setCoeffs([1.94632, -0.94657,  0.94657,  -1.94632, 1])
    this.biquadB2.setCoeffs([0.83774, -0.06338,  0.06338,  -0.83774, 1])
  }

  process(inVal)
  {

    let out1 = this.biquadA2.process(this.biquadA1.process(inVal));
    let out2 = this.biquadB2.process(this.biquadB1.process(inVal));

    let returnVals = [out1, out2];
    return returnVals;  
  }
}

class FreqshiftProcessor extends AudioWorkletProcessor {

  static get parameterDescriptors() {
    return [
      { name: 'freq', defaultValue: 0, minValue: -1000, maxValue: 1000},
      { name: 'bypass', defaultValue: 0, minValue: 0, maxValue: 1}, 
    ];
  }

  constructor(options) {
    super();

    this.hilbert = new Hilbert();

    this.freq = 0;
    this.phase = 0;

  }

  process(inputs, outputs, parameters) {

    // mono
    var input = inputs[0][0];

    // possible stereo output?
    const outputL = outputs[0][0];
    var outputR = null
    if (outputs[0].length > 1) {
      outputR = outputs[0][1]
    }


    let freqParam = parameters["freq"];        // from parameter list declared above
    let bypassParam = parameters["bypass"];

    for (var i = 0; i < outputL.length; i++) 
    {

      this.bypass = 0;
      if (bypassParam.length === 1) {
        this.bypass = parseInt(bypassParam);
      }
      else {
        this.bypass = bypassParam[i];
      }

      this.freq = 1;
      if (freqParam.length === 1) {
        this.freq = parseFloat(freqParam);
      }
      else {
        this.freq = freqParam[i];
      }

      let phaseDelta = this.freq / sampleRate;
      this.phase += phaseDelta;

      if (this.phase > 1.0) { this.phase -= 1.0; }

      let cos1 = Math.cos(this.phase * 2 * Math.PI);
      let cos2 = Math.cos((this.phase - 0.25) * 2 * Math.PI);


      // let output = this.biquad2.process(this.biquad1.process(input[i]));
      // let output = this.biquad4.process(this.biquad3.process(input[i]));

      let output = 0;

      // check there actually is audio input coming in...
      if (! this.bypass)
      {
        let hilbertVals = this.hilbert.process(input[i])

        let prod1 = hilbertVals[0] * cos1
        let prod2 = hilbertVals[1] * cos2

        output = prod1 - prod2;
      }
      else
      {
        if (i==0)
        {
          // console.log("input is instanceof array? "+(input instanceof Array))  
        }
        
      }
      

      //let output = this.biquad2.process(output);
      
      // let output = this.phase - 0.5; // hilbertVals[1]


      outputL[i] = output;
      if (outputR != null)
      {
        outputR[i] = output;
      }
    }
    return true;
  }

}


registerProcessor("freqshift-processor", FreqshiftProcessor);
console.log("Adding freqshift-processor (FreqshiftProcessor)");