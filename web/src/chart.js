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
      return Math.round((value - in_min) * (out_max - out_min) / (in_max - in_min) + out_min)
  }

  gradient = (a, b) => {
    return (b.y - a.y) / (b.x - a.x)
    }

  bzCurve = (points, f, t, color) => {
    let ctx = this.canvas.getContext('2d')
    //f = 0, will be straight line
    //t suppose to be 1, but changing the value can control the smoothness too
    if (typeof(f) == 'undefined') f = 0.3;
    if (typeof(t) == 'undefined') t = 0.6;

    ctx.beginPath();
    ctx.strokeStyle = color
    ctx.moveTo(points[0].x, points[0].y);

    var m = 0;
    var dx1 = 0;
    var dy1 = 0;
    var nexP = 0;
    var dx2 = 0;
    var dy2 = 0;

    var preP = points[0];
    for (var i = 1; i < points.length; i++) {
        var curP = points[i];
        nexP = points[i + 1];
        if (nexP) {
            m = this.gradient(preP, nexP);
            dx2 = (nexP.x - curP.x) * -f;
            dy2 = dx2 * m * t;
        } else {
            dx2 = 0;
            dy2 = 0;
        }
        ctx.bezierCurveTo(preP.x - dx1, this.canvas.height - preP.y - dy1, curP.x + dx2, this.canvas.height - curP.y + dy2, curP.x, this.canvas.height - curP.y);
        dx1 = dx2;
        dy1 = dy2;
        preP = curP;
    }
    ctx.stroke();
}

  redraw = () => {
    let ctx = this.canvas.getContext('2d')
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    var a = [this.rpm, this.coolant, this.load]
    for (var item of a) {
        const color = (item === this.rpm ? "#0AF9F9" : (item === this.coolant ? "#F90AC4" : "#4954E2"))

        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.strokeStyle = color
        //this.bzCurve(item, 0.3, 1, color);
        
        item.reduce(function (pValue, cValue, index) {
            ctx.moveTo(this.step * (index === 0 ? 0 : (index-1)), this.canvas.height - pValue)
            ctx.lineTo(this.step * index, this.canvas.height - cValue)
            return cValue
        }.bind(this));
        
        ctx.stroke()
    }
  }

  updatePlot = (key, data) => {
    var d, min, max;
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
        // d.forEach(x => {
        //     x.x = x.x - this.step
        // })
        console.log(d)
        //d.push({x: this.step*(d.length-1), y: this.scale(data, min, max)})
        d.push(this.scale(data, min, max))

        this.redraw()    
    }
  }

  initPlot = () => {

    this.rpm = new Array(Math.round( this.canvas.width / this.step )).fill(0) //.fill({x:0, y:0})
    this.coolant = new Array(Math.round( this.canvas.width / this.step )).fill(0) //.fill({x:0, y:0})
    this.load = new Array(Math.round( this.canvas.width / this.step )).fill(0) //.fill({x:0, y:0})

  }

  componentDidMount = () => {
    
    this.canvas.width  = this.canvas.parentElement.clientWidth
    this.initPlot()
  }

  render(){
      return <canvas ref={canvas => this.canvas = canvas}/>
  }
}