import React from 'react'

export default class Chart extends React.Component {
  rpm = []
  coolant = []
  load = []

  interval = -1
  idx = 0
  step = 5

  rand = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min)
  }

  scale = (value, in_min = 0, in_max = 1000, out_min = 0, out_max = this.canvas.height) => {
      console.log(in_max)
      return Math.round((value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min)
  }

  redraw = () => {
    let ctx = this.canvas.getContext('2d')
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    var a = [this.rpm, this.coolant, this.load]
    var j;
    for (var item of a) {
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.strokeStyle = (item === this.rpm ? "#0AF9F9" : (item === this.coolant ? "#F90AC4" : "#4954E2"))
        j = 1

        item.reduce(function(pValue, cValue) {
            //console.log(`pX: ${this.step * (j-1)}, pY: ${this.scale(pValue)}, cX: ${this.step * j}, cY: ${this.scale(cValue)}`)
            ctx.moveTo(this.step * (j-1), this.canvas.height - pValue)
            ctx.lineTo(this.step * j, this.canvas.height - cValue)
            j += 1

            return cValue
        }.bind(this));
        ctx.stroke()
    }
  }

  updatePlot = (key, data) => {
    var d, min, max;
    console.log(d)
    switch (key) {
        case "rpm":
            d = this.rpm
            min = 0
            max = 16383.75
            break
        case "temp":
            d = this.coolant
            min = -40
            max = 215
            break
        case "load_pct":
            d = this.load
            min = 0
            max = 100
            break
        default: break
    }
    if (d !== undefined) {
        d.shift()
        d.push(this.scale(data, min, max))
        this.redraw()    
    }
  }

  initPlot = () => {

    this.rpm = new Array(Math.round( this.canvas.width / this.step )).fill(0)
    this.coolant = new Array(Math.round( this.canvas.width / this.step )).fill(0)
    this.load = new Array(Math.round( this.canvas.width / this.step )).fill(0)

  }

  componentDidMount = () => {
    
    this.canvas.width  = this.canvas.parentElement.clientWidth
    this.initPlot()
  }

  render(){
      return <canvas ref={canvas => this.canvas = canvas}/>
  }
}