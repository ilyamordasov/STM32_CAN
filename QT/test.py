from gattlib import GATTRequester, GATTResponse
import sys, time, json
vhm_ble = "00:00:00:34:33:33"

class AsyncReader(object):
    def __init__(self, address):
        self.requester = GATTRequester(address, False)
        self.response = GATTResponse()

    def connect(self):
        print("Connecting...")
        self.requester.connect(True)
        print("Succeed.")
        print(self.requester)

    def check_status(self):
        status = "connected" if self.requester.is_connected() else "not connected"
        print("Checking current status: {}".format(status))

    def disconnect(self):
        print("Disconnecting...")
        self.requester.disconnect()
        print("Succeed.")

    def show_primary(self):
        print("Discover Primary...")
        primary = self.requester.discover_primary()
        for prim in primary:
            print(prim)
        print("Done.")

    def show_characteristic(self):
        print("Discover Characteristic...")
        characteristic = self.requester.discover_characteristics()
        for char in characteristic:
            print(char)
            if char['handle'] >= 15 and char['handle'] < 37:
                self.request_data(char['value_handle'])
        print("Done.")

    def request_data(self, uuid = 35):
        val = self.requester.read_by_handle(uuid)[0]
        try:
            data = val.decode('utf-8')
            print(data)
        except (UnicodeDecodeError, AttributeError):
            print(hex(int.from_bytes(val, 'little' )))
            pass

        # self.wait_response()

    def write_data(self, string):
        b = bytes(string, 'ascii')
        bb = []
        for i in b:
            bb.append(i)
        bb.append(13)
        bb.append(10)
        print(bb)
        # self.requester.write_by_handle(38, bytes([0x41, 0x54, 0x5A, 0x0D, 0x0A]))
        self.requester.write_by_handle(38, bytes([0x41, 0x54, 0x52, 0x56, 0x0D, 0x0A]))
        # self.requester.write_by_handle(38, bytes(bb))
        print(string, end =' ')
        self.request_data()
        print()

    def wait_response(self):
        while not self.response.received():
            time.sleep(0.1)

        data = self.response.received()[0]
        # print(data, int.from_bytes(b'\x41 \x43 \x54 \x20 \x41 \x4c \x45 \x52 \x54 \x0d \x0a \x3e', "little") )
        print("bytes received: ", data.decode('utf-8'), end=' ')
        # for b in data:
        #     print(hex(ord(b)), end=' ')
        # print("")    
        
ble = AsyncReader(vhm_ble)
ble.connect()
time.sleep(5)
ble.show_primary()
ble.show_characteristic()
time.sleep(5)
ble.write_data("ATRV")