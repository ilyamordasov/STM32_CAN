import React from 'react';
import { Button, Container, Row, Col, Modal, Form } from 'react-bootstrap';
import moment from 'moment'

import { OBDReader } from './ble/obd';
import Emitter from './emitter';

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
      console: "",
      interval:null,
      status: -1,
      theme: 'light',
      modal: false,
      device_name: '',

      metrics: [
        {name: "battery", cmd: "", value: 0, m: 'v'},
        {name: "rpm", cmd: "rpm", value: 0, m: ''},
        {name: "speed", cmd: "vss", value: 0, m: 'km/h'},
        {name: "coolant", cmd: "temp", value: 0, m: '°'},
        {name: "load", cmd: "load_pct", value: 0, m: '%'},
        // {name: "dtc errors", cmd: "", value: 0, m: ''},
        {name: "egr errors", cmd: "egr_err", value: 0, m: '%'},
        {name: "distance", cmd: "mil_dist", value: 0, m: 'km'},
        {name: "pressure", cmd: "map", value: 0, m: 'kPa'},
      ]
    }

    this.device = null
    this.supportsBluetooth = false
    this.isDisconnected = true
    this.cmd = null
    this.autoscroll = true

    this.obd = new OBDReader()
  }

  /**
   * Let the user know when their device has been disconnected.
   */
  onDisconnected = (event) => {
    this.log(`The device ${event.target.name} is disconnected`);
  }

  scrollToBottom = () => {
    if(this.textLog && this.autoscroll){
        this.textLog.scrollTop = this.textLog.scrollHeight;
    }
  };

  /**
   * Update the value shown on the web page when a notification is
   * received.
   */
  handleCharacteristicValueChanged = (event) => {
    var string = new TextDecoder("utf-8").decode(event.target.value)
    
    var buffer   = new Int32Array(event.target.value);
    var buf = "["
    for (var i of buffer) {
      buf += (i + ", ")
    }
    buf += "]"
    
    if (string.indexOf("AT") !== -1) {
      this.cmd = string.replace(/\r\n/gi, "")
    }
    else {
      this.log(this.cmd, string.replace(/\r/gi, "").replace(/\n/gi, "").replace(/>/gi, ""), buf)
      this.cmd = null
    }
  }

  disconnect = async (event) => {
    this.obd.disconnect()
  }

  log = (data) => {
    var ts = "[ " + moment().format('HH:mm:ss') + " ]\t"
    console.log(data)
    this.setState({console : this.state.console + ts + JSON.stringify(data) + "\r\n"})
    this.scrollToBottom()
  }

  /* Utils */
  padHex = (value) => {
    return ('00' + value.toString(16).toUpperCase()).slice(-2);
  }

  getDeviceInformation = async (BluetoothUUID, characteristics) => {
    const decoder = new TextDecoder('utf-8');
    for (const characteristic of characteristics) {
      switch (characteristic.uuid) {

        case BluetoothUUID.getCharacteristic('manufacturer_name_string'):
          await characteristic.readValue().then(value => { this.log('> Manufacturer Name String: ' + decoder.decode(value)); });
          break;

        case BluetoothUUID.getCharacteristic('model_number_string'):
          await characteristic.readValue().then(value => { this.log('> Model Number String: ' + decoder.decode(value)); });
          break;

        case BluetoothUUID.getCharacteristic('hardware_revision_string'):
          await characteristic.readValue().then(value => { this.log('> Hardware Revision String: ' + decoder.decode(value)); });
          break;

        case BluetoothUUID.getCharacteristic('firmware_revision_string'):
          await characteristic.readValue().then(value => { this.log('> Firmware Revision String: ' + decoder.decode(value)); });
          break;

        case BluetoothUUID.getCharacteristic('software_revision_string'):
          await characteristic.readValue().then(value => { this.log('> Software Revision String: ' + decoder.decode(value)); });
          break;

        case BluetoothUUID.getCharacteristic('system_id'):
          await characteristic.readValue().then(value => {
            this.log('> System ID: ');
            this.log('  > Manufacturer Identifier: ' +
                this.padHex(value.getUint8(4)) + this.padHex(value.getUint8(3)) +
                this.padHex(value.getUint8(2)) + this.padHex(value.getUint8(1)) +
                this.padHex(value.getUint8(0)));
            this.log('  > Organizationally Unique Identifier: ' +
                this.padHex(value.getUint8(7)) + this.padHex(value.getUint8(6)) +
                this.padHex(value.getUint8(5)));
          });
          break;

        case BluetoothUUID.getCharacteristic('ieee_11073-20601_regulatory_certification_data_list'):
          await characteristic.readValue().then(value => { this.log('> IEEE 11073-20601 Regulatory Certification Data List: ' + decoder.decode(value)); });
          break;

        case BluetoothUUID.getCharacteristic('pnp_id'):
          await characteristic.readValue().then(value => {
            this.log('> PnP ID:');
            this.log('  > Vendor ID Source: ' + (value.getUint8(0) === 1 ? 'Bluetooth' : 'USB'));
            this.log('  > Product ID: ' + (value.getUint8(3) | (value.getUint8(4) << 8)));
            this.log('  > Product Version: ' + (value.getUint8(5) | (value.getUint8(6) << 8)));
          });
          break;

        default: this.log('> Unknown Characteristic: ' + characteristic.uuid);
      }
    }
  }

  stringToASCII = (string) => {
    return new TextEncoder().encode(string)
  }

  sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  cb_obChange = (e) => this.autoscroll = !this.autoscroll

  handleChange = (event) => this.log(event.target.value)

  connectToDeviceAndSubscribeToUpdates = async () => {
    try {
      // Search for Bluetooth devices that advertise a battery service
      this.device = await navigator.bluetooth
        .requestDevice({
          filters: [{services: [0xfff0]}],
          optionalServices: ['device_information']
        });

      // Add an event listener to detect when a device disconnects
      this.device.addEventListener('gattserverdisconnected', this.onDisconnected);
      this.log('device', this.device)
      // Try to connect to the remote GATT Server running on the Bluetooth device
      const server = await this.device.gatt.connect();
      this.log('server', server)
      this.setState({status: 1, device_name: this.device.name})
      this.isDisconnected = false
      // Get the battery service from the Bluetooth device
      const service = await server.getPrimaryService(0xfff0);
      // const service = await server.getPrimaryService('device_information');
      this.log("service", service)

      // Get the battery level characteristic from the Bluetooth device
      const readService = await service.getCharacteristic(0xfff1);

      // // Subscribe to battery level notifications
      readService.startNotifications();

      // // When the battery level changes, call a function
      readService.addEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged);

      const writeService = await service.getCharacteristic(0xfff2)
      var AT_cmds = ["ATRV", "ATREADVER", "ATD", "ATZ", /*"ATE0",*/ "ATL0", "ATH1", "ATS0", "ATSP0", "0100", "ATDPN"]
      
      for (var i of AT_cmds) {
        await writeService.writeValue(this.stringToASCII(i + "\r\n"))
        await this.sleep(2000)
      }

      this.setState({interval: setInterval(async () => { 
        var data = ["010C", "010D", "0105"]
        for (var i of data) {
          await writeService.writeValue(this.stringToASCII(i + "\r\n"))
          await this.sleep(1000)
        }
      }, 5000)});
      
    } catch(error) {
      this.log(`There was an error: ${error}`);
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
      this.log(data);
      const newState = Object.assign([], this.state.metrics)
      if (data.name !== undefined) {
        newState.forEach((item) => { if (item.cmd === data) {item.value = data.value} })
        this.setState({metrics: newState})
      }
    });
  
    Emitter.on('connected', (name) => {
        this.isDisconnected = false
        this.setState({status: 1, device_name: name})

        this.obd.addPoller("vss")
        this.obd.addPoller("rpm")
        this.obd.addPoller("temp")
        this.obd.addPoller("load_pct")
        this.obd.addPoller("map")
        this.obd.addPoller("mil_dist")
        this.obd.addPoller("egr_err")
    
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
                    <Col style={{position: 'relative'}}><Row>
                    {
                      this.state.metrics.map((x, index) => {
                        return <Col xs={4} md={4}><div key={index}className="item"><span>{x.name}</span><br/>{x.value.toLocaleString()} <sup>{x.m}</sup></div></Col>
                      })
                    }
                    </Row></Col>
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
            <textarea value={this.state.console} ref={textLog => this.textLog = textLog}/>
            <Form.Check type="checkbox" id="autoscroll" label="Autoscroll" onChange={this.cb_obChange} checked={this.autoscroll}/>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" style={{width: 'inherit'}} size="lg" onClick={this.handleClose} block>Save</Button>
          </Modal.Footer>
        </Modal>
      </ThemeProvider>
    );
  }
};

export default App;