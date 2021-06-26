import React from 'react';
import { Button, Container, Row, Col } from 'react-bootstrap';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

class App extends React.Component {

  constructor(props) {
    super(props)
    this.device = null
    this.supportsBluetooth = false
    this.isDisconnected = true
    this.batteryLevel = null
    this.cmd = null
    this.state = {
      console: "",
      interval:null
    }

    if (navigator.bluetooth) {
      this.supportsBluetooth = true
    }
  }

  /**
   * Let the user know when their device has been disconnected.
   */
  onDisconnected = (event) => {
    alert(`The device ${event.target} is disconnected`);
    this.isDisconnected =true
  }

  /**
   * Update the value shown on the web page when a notification is
   * received.
   */
  handleCharacteristicValueChanged = (event) => {
    var string = new TextDecoder("utf-8").decode(event.target.value)
    if (string.indexOf("AT") !== -1) {
      this.cmd = string.replace(/\r\n/gi, "")
    }
    else {
      this.log(this.cmd, string.replace(/\r/gi, "").replace(/\n/gi, "").replace(/>/gi, ""))
      this.cmd = null
    }
  }

  disconnect = async (event) => {
    clearInterval(this.state.interval)
    this.device.gatt.disconnect()
    this.isDisconnected = true
  }

  log = (...value) => {
    for (var i of value) {
      console.log(i)
      this.setState({console : this.state.console + value.toString()+"\r\n"})
    }
  }

  /* Utils */

  padHex = (value) => {
    return ('00' + value.toString(16).toUpperCase()).slice(-2);
  }

  // getUsbVendorName = (value) => {
  //   // Check out page source to see what valueToUsbVendorName object is.
  //   return value + (value in valueToUsbVendorName ? ' (' + valueToUsbVendorName[value] + ')' : '');
  // }

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

  handleChange(event) {    this.log(event.target.value)  }

  connectToDeviceAndSubscribeToUpdates = async () => {
    try {
      // Search for Bluetooth devices that advertise a battery service
      this.device = await navigator.bluetooth
        .requestDevice({
          filters: [{services: [0xfff0]}],
          optionalServices: ['device_information']
        });

      this.isDisconnected = false

      // Add an event listener to detect when a device disconnects
      this.device.addEventListener('gattserverdisconnected', this.onDisconnected);

      // Try to connect to the remote GATT Server running on the Bluetooth device
      const server = await this.device.gatt.connect();

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
  
    render(){
      return (
        <Container>
          <Row>
            <Col lg>
            <h1>Get Device Battery Info Over Bluetooth</h1><br/>
              {this.supportsBluetooth && !this.isDisconnected &&
                    <>
                    <textarea style={{width: "90vw", height: "70vh"}}value={this.state.console}/>
                    <>
                      <Button variant="danger" size="lg" block onClick={this.disconnect}>Disconnect</Button>
                    </>
                    </>
              }
              {this.supportsBluetooth && this.isDisconnected &&
                <>
                  <Button variant="primary" size="lg" block onClick={this.connectToDeviceAndSubscribeToUpdates}>Connect to a Bluetooth device</Button>
                </>
              }
              {!this.supportsBluetooth &&
                <p>This browser doesn't support the Web Bluetooth API</p>
              }
            </Col>
          </Row>
        </Container>
      );
    }
};

export default App;