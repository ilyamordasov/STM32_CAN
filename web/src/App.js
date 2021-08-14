import React from 'react';
import { Button, Container, Row, Col, Modal, Form } from 'react-bootstrap';
import moment from 'moment'

import { OBDReader } from './ble/obd';
import Emitter from './emitter';

import Chart from './chart'

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import {ReactComponent as BLEOn} from './ble-on.svg';
import {ReactComponent as BLEOff} from './ble-off.svg';
import {ReactComponent as BLEConnected} from './ble-connected.svg';

import { ThemeProvider } from 'styled-components';
import { lightTheme, darkTheme } from './styles/theme';
import { GlobalStyles } from './styles/global';


class App extends React.Component {

  constructor(props) {
    super(props)
    moment.locale('ru');

    this.state = {
      interval:null,
      status: -1,
      theme: 'light',
      modal: false,
      device_name: '',
      vin: '',
      dtc: '',

      metrics: [
        {name: "battery", cmd: "vpwr", value: 0, m: 'v'},
        {name: "rpm", cmd: "rpm", value: 0, m: ''},
        {name: "speed", cmd: "vss", value: 0, m: 'km/h'},
        {name: "coolant", cmd: "temp", value: 0, m: '°'},
        {name: "load", cmd: "load_pct", value: 0, m: '%'},
        {name: "egr errors", cmd: "egr_err", value: 0, m: '%'},
        {name: "distance", cmd: "clr_dist", value: 0, m: 'km'},
        {name: "time", cmd: "runtm", value: 0, m: 'sec'},
        {name: "fuel level", cmd: "fli", value: 0, m: ''},
        {name: "odometer", cmd: "odo", value: 0, m: 'km'},
        {name: "fuel rate", cmd: "enginefrate", value: 0, m: 'L/h'},
        {name: "fuel rate (calc)", cmd: "maf", value: 0, m: 'L/100km'},
        {name: "dtc", cmd: "requestdtc", value: 0, m: ''},
      ],
    }

    this.device = null
    this.supportsBluetooth = false
    this.isDisconnected = true
    this.cmd = null
    this.autoscroll = true
    this.console = ""

    this.obd = new OBDReader()
  }

  scrollToBottom = () => {
    if(this.textLog && this.autoscroll){
        this.textLog.scrollTop = this.textLog.scrollHeight;
    }
  };

  log = (data) => {
    var ts = "[ " + moment().format('HH:mm:ss') + " ]\t"
    console.log(data)
    this.console += (ts + JSON.stringify(data) + "\r\n")
    this.scrollToBottom()
  }

  cb_obChange = (e) => {this.autoscroll = !this.autoscroll}

  shareLogs = async (e) => {
    try {
      await navigator.share({
        title: 'WEB OBD2', text: this.console, url: window.location.href})
    } catch(err) {
      alert('Error: ' + err)
    }
  }

  componentDidMount() {
    if (typeof window !== 'undefined') {
      this.setState({theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"})
    }

    Emitter.on('available', (value) => {
      if (value) {
        this.supportsBluetooth = true
        this.setState({status: 0})
      }
    })

    Emitter.on('dataReceived', (data) => {
      var newState = this.state.metrics
      if (data.name !== undefined) {
        if ((data.name === "rpm" || data.name === "temp" || data.name === "load_pct") && this.supportsBluetooth) {
          this.chart.updatePlot(data.name, Math.round(data.value))
        }
        else if ((data.name === "vin") && this.supportsBluetooth) {this.setState({vin: data.value})}
        else if ((data.name === "dtc") && this.supportsBluetooth) {this.setState({dtc: data.value})}

        newState.forEach((item) => { 
          if (item.cmd === data.name) {item.value = (item.cmd === "vpwr") ? data.value.toFixed(1) : Math.round(data.value) }
          if (item.cmd === "maf") { 
            /*
              l/100km = 235.214583 / MPG
              MPG = 710.7 * VSS / MAF
            */
            var vss = newState.find(x => x.cmd === "vss").value
            item.value = vss === 0 ? item.value : (0.330961845 * item.value / vss).toFixed(1)
          }
        })
        this.setState({metrics: newState})
      }
    });
  
    Emitter.on('connected', (name) => {
        this.isDisconnected = false
        this.setState({status: 1, device_name: name})

        this.obd.requestValueByName("vin")

        // this.obd.addPoller("vss")
        // this.obd.addPoller("rpm")
        // this.obd.addPoller("temp")
        // this.obd.addPoller("load_pct")
        // this.obd.addPoller("map")
        // this.obd.addPoller("mil_dist")
        // this.obd.addPoller("egr_err")
        // this.obd.addPoller("vpwr")
        // this.obd.addPoller("dtc_cnt")
        for (var pid of this.state.metrics) {
          this.obd.addPoller(pid.cmd)
        }
    
        this.obd.startPolling(1500)
    });

    Emitter.on('disconnected', () => {
      this.isDisconnected = true
      this.setState({status: 0, device_name: ''})
    });
  
    Emitter.on('error', (data) => {
      this.log('Error: ' + data)
    });

    this.obd.init()
    if (Array.from(new URLSearchParams(window.location.search)).length > 0) {
      this.obd.test()
    }
  }

  handleClose = () => this.setState({modal: false});
  handleShow = () => this.setState({modal: true});
  
  render(){
    return (
      <ThemeProvider theme={this.state.theme === 'light' ? lightTheme : darkTheme}>
        <GlobalStyles />
        <Container style={{height: '100vh', padding: 25}}>
          <Row style={{height: '80vh', margin: 'auto'}}>
            <Col lg>
              
              {
              this.supportsBluetooth
              ? <>
                  <Row style={{marginBottom: 80}}>
                    <Col md={10} xs={10}>{this.state.status === 0 ? <><BLEOn className="svg"/> Disconneted</> : <><BLEConnected className="svg"/> {this.state.device_name}</>}</Col>
                    <Col md={2} xs={2} style={{textAlign: 'right'}}><Button variant="link" onClick={(e) => this.setState({modal: !this.state.modal})}>Logs</Button></Col>
                    <Col>VIN: {this.state.vin}</Col>
                    <Col>DTC: {this.state.dtc}</Col>
                  </Row>
                  <Row>
                    <Col style={{position: 'relative'}} key={(Math.random*999).toString()}>
                      <Row>
                      {
                        this.state.metrics.map((x, index) => {
                          var cl;
                          switch(x.name) {
                            case "rpm": cl = "indicator magenda"; break
                            case "coolant": cl = "indicator red"; break
                            case "load": cl = "indicator blue"; break
                            default: cl = ""; break
                          }
                          if (x.name !== "dtc") { return <Col xs={4} md={4} key={"data" + index}><div className="item"><span className={cl}>{x.name}</span><br/>{x.value.toLocaleString()} <sup>{x.m}</sup></div></Col> }
                          else return null
                        })
                      }
                      </Row>
                    </Col>
                  </Row>
                  <Row>
                    <Col style={{width: '100vw'}}>
                      <Chart ref={chart => this.chart = chart}/>
                    </Col>
                  </Row>
                </>
              : <div style={{textAlign: 'center'}}><BLEOff className='bleoff' style={{width: window.screen.width-160 +'px', height: window.screen.width-160 +'px'}}/><p>This browser doesn't support the Web Bluetooth API</p></div>
              }
            </Col>
          </Row>
          <Row style={{position:"absolute", bottom:"20px"}}>
            <Col>
              <>
              { 
                this.supportsBluetooth
                ? (this.isDisconnected ? <Button variant="success" style={{width: 'inherit'}} size="lg" onClick={this.obd.connect} block>Connect to a Bluetooth device</Button> : <Button variant="danger" style={{width: 'inherit'}} size="lg" onClick={this.obd.disconnect} block>Disconnect</Button>)
                : null
              }
              </>
            </Col>
          </Row>
        </Container>
        <Modal show={this.state.modal} onHide={this.handleClose}>
          <Modal.Header closeButton>
            <Modal.Title>Logs</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <textarea value={this.console} ref={textLog => this.textLog = textLog}/>
            <Form.Check type="checkbox" id="autoscroll" label="Autoscroll" onChange={this.cb_obChange} checked={this.autoscroll}/>
          </Modal.Body>
          <Modal.Footer>
            {
              navigator.canShare ? <Button variant="primary" style={{width: 'inherit'}} size="lg" onClick={this.shareLogs} block>Share</Button> : null
            }
          </Modal.Footer>
        </Modal>
      </ThemeProvider>
    );
  }
};

export default App;
