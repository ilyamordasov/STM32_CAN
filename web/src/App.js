import React from 'react';
import { Button, Container, Row, Col, Modal, Form } from 'react-bootstrap';
import moment from 'moment'

import { OBDReader } from './ble/obd';
import Emitter from './emitter';

import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'

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

      metrics: [
        {name: "battery", cmd: "vpwr", value: 0, m: 'v'},
        {name: "rpm", cmd: "rpm", value: 0, m: ''},
        {name: "speed", cmd: "vss", value: 0, m: 'km/h'},
        {name: "coolant", cmd: "temp", value: 0, m: '°'},
        {name: "load", cmd: "load_pct", value: 0, m: '%'},
        // {name: "dtc errors", cmd: "", value: 0, m: ''},
        {name: "egr errors", cmd: "egr_err", value: 0, m: '%'},
        {name: "distance", cmd: "mil_dist", value: 0, m: 'km'},
        {name: "pressure", cmd: "map", value: 0, m: 'kPa'},
      ],
        chartOptions: {
          chart: {
            className: "custom-chart",
            height: 140,
          },
          xAxis: {
            allowDecimals: false,
            gridLineWidth: 0,
            interval: 1,
            labels: {
              enabled: false
            },
            minRange: 5,
            visible: false,
          },
          yAxis: {
            gridLineWidth: 0,
            interval: 1,
            labels: {
              enabled: false
            },
            title: {
              enabled: false
            },
          },
          title: {
            text: ''
          },
          series: [
            {
              name: 'rpm',
              data: [],
              color: "#4954E2",
              marker: { enabled: false },
            },
            {
              name: 'coolant',
              data: [],
              color: "#FFCC00",
              marker: { enabled: false },
            },
            {
              name: 'load',
              data: [],
              color: "#FB4903",
              marker: { enabled: false },
            },
          ],
        },
        hoverData: null
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
      this.log(data)
      var newState = this.state.metrics
      if (data.name !== undefined) {
        let d = this.state.chartOptions.series
        console.log(d)
        if (data.name === "rpm") { d[0].data.push(Math.random() * 5) }
        if (data.name === "temp") { d[1].data.push(Math.random() * 35) }
        if (data.name === "load_pct") { d[2].data.push(Math.random() * 55) }
        this.setState({
          chartOptions: {
            series: d
          }
        });

        newState.forEach((item) => { if (item.cmd === data.name) {item.value = (item.cmd === "vpwr") ? data.value.toFixed(1) : Math.round(data.value) } })
        this.setState({metrics: newState})
      }
    });
  
    Emitter.on('connected', (name) => {
        this.isDisconnected = false
        this.setState({status: 1, device_name: name})

        this.obd.requestValueByName("vin")

        this.obd.addPoller("vss")
        this.obd.addPoller("rpm")
        this.obd.addPoller("temp")
        this.obd.addPoller("load_pct")
        this.obd.addPoller("map")
        this.obd.addPoller("mil_dist")
        this.obd.addPoller("egr_err")
        this.obd.addPoller("vpwr")
    
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
                  </Row>
                  <Row>
                    <Col style={{position: 'relative'}} key={(Math.random*999).toString()}>
                      <Row>
                      {
                        this.state.metrics.map((x, index) => {
                          return <Col xs={4} md={4} key={"data" + index}><div className="item"><span>{x.name}</span><br/>{x.value.toLocaleString()} <sup>{x.m}</sup></div></Col>
                        })
                      }
                      </Row>
                    </Col>
                  </Row>
                  <Row>
                    <Col>
                      <HighchartsReact className="custom-chart" highcharts={Highcharts} options={this.state.chartOptions} ref={chart => this.chart = chart}/>
                    </Col>
                  </Row>
                </>
              : <div style={{textAlign: 'center'}}><BLEOff className='bleoff' style={{width: window.screen.width-160 +'px', height: window.screen.width-160 +'px'}}/><p>This browser doesn't support the Web Bluetooth API</p></div>
              }
            </Col>
          </Row>
          <Row>
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
