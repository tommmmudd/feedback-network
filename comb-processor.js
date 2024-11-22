
/**
 * A simple comb filter delay line with feedback.
 *
 * @class CombProcessor
 * @extends AudioWorkletProcessor
 */
class CombProcessor extends AudioWorkletProcessor {

  static get parameterDescriptors() {
    return [
      { name: 'delayTimeInSeconds', defaultValue: 0.01, minValue: 0.0001, maxValue: 1}, 
      { name: 'bypass', defaultValue: 0, minValue: 0, maxValue: 1}, 
     // { name: 'resonance', defaultValue: 2.99, minValue: 0, maxValue: 4.0}
    ];
  }

  constructor(options) {
    super();
    this.maxSize = 20000
    this.buffer = new Array(this.maxSize).fill(0);
    this.readPos = 0;
    this.writePos = 1;
  }

  process(inputs, outputs, parameters) {

    var input = inputs[0][0];

    const outputL = outputs[0][0];
    var outputR = null
    if (outputs[0].length > 1) {
      outputR = outputs[0][1]
    }

    let delayTimeParam = parameters["delayTimeInSeconds"];        // from parameter list declared above
    let bypassParam = parameters["bypass"]; 

    this.bypass = 0;
    if (bypassParam.length === 1) {
      this.bypass = parseInt(bypassParam);
    }
    else {
      this.bypass = bypassParam[i];
    }

    for (var i = 0; i < outputL.length; i++) 
    {

      let output = 0;



      if (! this.bypass)
      {
        let delayTimeInSeconds = 0.01;

        if (delayTimeParam.length === 1) {
          delayTimeInSeconds = parseFloat(delayTimeParam);
        }
        else {
          delayTimeInSeconds = delayTimeParam[i];
        }
        //console.log(delayTimeInSeconds)

        this.readPos = this.writePos - Math.floor(delayTimeInSeconds * sampleRate);
        if (this.readPos < 0)
        {
          this.readPos += this.maxSize
        }

        output = this.buffer[this.readPos]
        this.buffer[this.writePos] = input[0] * 0.99 * output

        this.writePos += 1
        if (this.writePos > this.maxSize)
        {
          this.writePos -= this.maxSize;
        }
      }

      outputL[i] = output
      if (outputR != null)
      {
        outputR[i] = output
      }
    };
    return true;
  }
}

registerProcessor("comb-processor", CombProcessor);