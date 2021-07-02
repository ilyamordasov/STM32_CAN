import Emitter from '../emitter';

export class OBDReader {
  constructor(props) {
    this.device = null
    this.services = [0xfff0]
    this.characteristic = 0xfff1
  }

  PIDS = require('./obdinfo.js')
  activePollers = []
  queue = []
  writeDelay = 50
  connected = false
  protocol = '0'
  receivedData = ''

  intervalWriter = -1
  pollerInterval = -1


  getPIDByName = (name) =>{
      var i;
      for (i = 0; i < this.PIDS.length; i++) {
          if (this.PIDS[i].name === name) {
              if (this.PIDS[i].pid !== undefined) {
                  return (this.PIDS[i].mode + this.PIDS[i].pid);
              }
              //There are modes which don't require a extra parameter ID.
              return (this.PIDS[i].mode);
          }
      }
  }

  parseOBDCommand = (hexString) => {
    var reply,
        byteNumber,
        valueArray; //New object

    reply = {};
    if (hexString === "NO DATA" || hexString === "OK" || hexString === "?" || hexString === "UNABLE TO CONNECT" || hexString === "SEARCHING...") {
      //No data or OK is the response, return directly.
      reply.value = hexString;
      if (hexString === "UNABLE TO CONNECT") { this.disconnect()}
      return reply;
    }

    hexString = hexString.replace(/ /g, ''); //Whitespace trimming //Probably not needed anymore?
    valueArray = [];

    for (byteNumber = 0; byteNumber < hexString.length; byteNumber += 2) {
      valueArray.push(hexString.substr(byteNumber, 2));
    }

    if (valueArray[0] === "41") {
      reply.mode = valueArray[0]
      reply.pid = valueArray[1]
      for (var i = 0; i < this.PIDS.length; i++) {
        if (this.PIDS[i].pid === reply.pid) {
          var numberOfBytes = this.PIDS[i].bytes
          reply.name = this.PIDS[i].name
          switch (numberOfBytes) {
            case 1:
              reply.value = this.PIDS[i].convertToUseful(valueArray[2]); break
            case 2:
              reply.value = this.PIDS[i].convertToUseful(valueArray[2], valueArray[3]); break
            case 4:
              reply.value = this.PIDS[i].convertToUseful(valueArray[2], valueArray[3], valueArray[4], valueArray[5]); break
            case 8:
              reply.value = this.PIDS[i].convertToUseful(valueArray[2], valueArray[3], valueArray[4], valueArray[5], valueArray[6], valueArray[7], valueArray[8], valueArray[9]); break
            default: break
          }
          break //Value is converted, break out the for loop.
        }
      }
    }
    else if (valueArray[0] === "43") {
      reply.mode = valueArray[0]
      for (i = 0; i < this.PIDS.length; i++) {
        if (this.PIDS[i].mode === "03") {
            reply.name = this.PIDS[i].name
            reply.value = this.PIDS[i].convertToUseful(valueArray[1], valueArray[2], valueArray[3], valueArray[4], valueArray[5], valueArray[6])
        }
      }
    }
    return reply
  }

  init = () => {
    Emitter.emit('available', (navigator.bluetooth ? true : false));
  }

  setProtocol = (protocol) => {
    if(protocol.toString().search(/^[0-9]$/) === -1) {
      throw new Error("setProtocol: Must provide a number between 0 and 9 - refer to ATSP section of http://www.obdtester.com/elm-usb-commands")
    }
    this.protocol = protocol
  }

  getProtocol = () => {
    return this.protocol
  }

  write = (message, replies) => {
    if (replies === undefined) { replies = 0 }
    if (this.connected) {
        if (this.queue.length < 256) {
            if (replies !== 0) {
                this.queue.push(message + replies + '\r');
            } else {
                this.queue.push(message + '\r');
            }
        }
        else {
          Emitter.emit('error', 'Queue-overflow!');
        }
    }
    else {
      Emitter.emit('error', 'Bluetooth device is not connected.');
    }
  }

  requestValueByName = (name) => {
    this.write(this.getPIDByName(name))
  }

  addPoller = (name) => {
      var stringToSend = this.getPIDByName(name)
      this.activePollers.push(stringToSend)
      console.log(this.activePollers)
  }

  removePoller = (name) => {
    var stringToDelete = this.getPIDByName(name)
    var index = this.activePollers.indexOf(stringToDelete)
    this.activePollers.splice(index, 1)
  }

  removeAllPollers = () => {
    this.activePollers.length = 0 //This does not delete the array, it just clears every element.
  }

  writePollers = () => {
    var i;
    for (i = 0; i < this.activePollers.length; i++) {
        this.write(this.activePollers[i], 1);
    }
  }

  startPolling = (interval) => {
    if (interval === undefined) {
        interval = this.activePollers.length * (this.writeDelay * 2) //Double the delay, so there's room for manual requests.
    }

    var self = this;
    this.pollerInterval = setInterval(function () {
        self.writePollers();
    }, interval);
  }

  stopPolling = () => {
    clearInterval(this.pollerInterval)
  }

  handleCharacteristicValueChanged = (event) => {
    var data = new TextDecoder("utf-8").decode(event.target.value)

    var currentString, arrayOfCommands
    currentString = this.receivedData + data.toString('utf8') // making sure it's a utf8 string
    var output = ''
    console.log(output, data.toString('utf8'))

    arrayOfCommands = currentString.split('>')

    var forString;
    if (arrayOfCommands.length < 2) {
      this.receivedData = arrayOfCommands[0]
    }
    else {
      for (var commandNumber = 0; commandNumber < arrayOfCommands.length; commandNumber++) {
        forString = arrayOfCommands[commandNumber]
        if (forString === '') {
          continue
        }

        var multipleMessages = forString.split('\r');
        for (var messageNumber = 0; messageNumber < multipleMessages.length; messageNumber++) {
          var messageString = multipleMessages[messageNumber];
          if (messageString === '') {
            continue
          }
          var reply;
          reply = this.parseOBDCommand(messageString)
          //Event dataReceived.
          Emitter.emit('dataReceived', reply)
          this.receivedData = ''
        }
      }
    }
  }

  connect = async () => {
    this.device = await navigator.bluetooth.requestDevice({ filters: [{services: this.services}], optionalServices: ['device_information'] })
    this.device.addEventListener('gattserverdisconnected', () => Emitter.emit('disconnected', {connected: false, name: this.device.name}))
    const server = await this.device.gatt.connect()

    const service = await server.getPrimaryService(this.services[0])

    const readService = await service.getCharacteristic(this.characteristic)
    readService.startNotifications();
    readService.addEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged);

    this.connected = true

    this.write('ATZ')
    //Turns off extra line feed and carriage return
    this.write('ATL0')
    //This disables spaces in in output, which is faster!
    this.write('ATS0')
    //Turns off headers and checksum to be sent.
    this.write('ATH0')
    //Turns off echo.
    this.write('ATE0')
    //Turn adaptive timing to 2. This is an aggressive learn curve for adjusting the timeout. Will make huge difference on slow systems.
    this.write('ATAT2')
    //Set timeout to 10 * 4 = 40msec, allows +20 queries per second. This is the maximum wait-time. ATAT will decide if it should wait shorter or not.
    //this.write('ATST0A')
    //http://www.obdtester.com/elm-usb-commands
    this.write('ATSP' + this.protocol)

    Emitter.emit('connected', this.device.name)

    const writeService = await service.getCharacteristic(0xfff2)

    this.intervalWriter = setInterval(() => {
      if (this.queue.length > 0 && this.connected) {
        try {
          writeService.writeValue(new Buffer(this.queue.shift(), "utf-8"))
          // self.btSerial.write(new Buffer(this.queue.shift(), "utf-8"), function (err, count) {
          //     if (err)
          //       Emitter.emit('error', err);
          // });
        }
        catch (err) {
          Emitter.emit('error', 'Error while writing: ' + err);
          Emitter.emit('error', 'OBD-II Listeners deactivated, connection is probably lost.');
          clearInterval(this.intervalWriter);
          this.removeAllPollers();
        }
      }
    }, this.writeDelay); //Updated with Adaptive Timing on ELM327. 20 queries a second seems good enough.

  }

  disconnect = () => {
    clearInterval(this.intervalWriter)
    this.queue.length = 0 //Clears queue
    this.removeAllPollers()
    this.device.gatt.disconnect()
    this.connected = false
    Emitter.emit('disconnected');
  }
}