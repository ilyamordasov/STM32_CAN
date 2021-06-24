"""
    samples.subscribe_indicate_thermometer_sample
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    This is an example of subscribing to an indicate property of a
    characteristic. This example was tested with the Health Thermometer Profile,
    but can be easily modified to work with any other profile.
"""
import pygatt
import logging
import time, uuid

def data_handler_cb(handle, value):
    """
        Indication and notification come asynchronously, we use this function to
        handle them either one at the time as they come.
    :param handle:
    :param value:
    :return:
    """
    # print("\tHandle: {}, \tData: {}, {}".format(handle, value.hex(), value.decode('utf-8')))
    # print("{}, handle: {}".format(value.decode('utf-8'), "handle"))
    print(value.decode('utf-8').replace(">", ""))

def write_data(device, string):
    ba = bytearray(bytes(string, 'ascii'))
    ba.append(13)
    device.char_write_handle(38, ba, wait_for_response=True)
    print(string, end=' ')


def main():
    """
        Main function. The comments below try to explain what each section of
        the code does.
    """

    # logging.basicConfig()
    # logging.getLogger('pygatt').setLevel(logging.DEBUG)

    # pygatt uses pexpect and if your device has a long list of characteristics,
    # pexpect will not catch them all. We increase the search window to
    # 2048 bytes for the this example. By default, it is 200.
    # Note: We need an instance of GATToolBackend per each device connection
    adapter = pygatt.GATTToolBackend(search_window_size=2048)

    try:
        # Start the adapter
        adapter.start()
        # Connect to the device with that given parameter.
        # For scanning, use adapter.scan()
        device = adapter.connect("00:00:00:34:33:33")
        # Set the security level to medium
        # device.bond()
        # Observes the given characteristics for indications.
        # When a response is available, calls data_handle_cb
        device.subscribe("0000fff1-0000-1000-8000-00805f9b34fb", callback=data_handler_cb, indication=True)
        # device.subscribe_handle(35, callback=data_handler_cb, indication=True)
        AT_cmds = ["ATRV", "ATREADVER", "ATD", "ATZ", "ATE0", "ATL0", "ATH1", "ATS0", "ATSP0"]
        for i in AT_cmds:
            write_data(device, i)          # Battery voltage
            time.sleep(1)
        
        # write_data(device, "0100")          # Disable echo

        # write_data(device, "ATDPN")          # Disable echo

        # write_data(device, "010C")  # Engine speed RPM
        # write_data(device, "010D")  # Vehicle speed
        # write_data(device, "0105")  # Engine coolant temperature
        print()
        input("Press enter to stop program...\n")

    finally:
        # Stop the adapter session
        adapter.stop()

    return 0


if __name__ == '__main__':
    exit(main())