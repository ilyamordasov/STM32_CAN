# This Python file uses the following encoding: utf-8
import os
from pathlib import Path
import sys

from PySide6.QtWidgets import QApplication, QWidget, QLabel
from PySide6.QtCore import QFile, Qt, QTimer
from PySide6.QtUiTools import QUiLoader

import serial, serial.tools.list_ports, threading, logging

class Dashboard(QWidget):
    def __init__(self):
        super(Dashboard, self).__init__()
        self.load_ui()

        self.setCheck(False)
        self.setTPMS(False)
        self.setLights(False)

#        # Remove title bar
#        self.setWindowFlag(Qt.FramelessWindowHint)
#        self.setAttribute(Qt.WA_TranslucentBackground)

    def load_ui(self):
        loader = QUiLoader()
        path = os.fspath(Path(__file__).resolve().parent / "dashboard.ui")
        ui_file = QFile(path)
        ui_file.open(QFile.ReadOnly)
        self.ui = loader.load(ui_file, self)
        ui_file.close()

    def setSpeed(self, num):
        self.ui.speed.setText(str(num))

    def setCheck(self, value = True):
        self.ui.checkengine.hide() if value is not True else self.ui.checkengine.show()

    def setTPMS(self, value = True):
        self.ui.tpms.hide() if value is not True else self.ui.tpms.show()

    def setLights(self, value = True):
        self.ui.light.hide() if value is not True else self.ui.light.show()

def serialRead(ser, widget):
    while True:
        data = ser.readline().decode('utf-8')
        if '$S<' in data:
            widget.setSpeed(data[3:])


if __name__ == "__main__":
    app = QApplication([])
    widget = Dashboard()
    widget.show()

    ports = [p.device for p in serial.tools.list_ports.comports() if 'USB' in p.description]
    print(ports)

    ser = serial.Serial(ports[0], 115200)

    x = threading.Thread(target=serialRead, args=(ser,widget))
    logging.info("Main: before running thread")
    x.start()

    sys.exit(app.exec())
