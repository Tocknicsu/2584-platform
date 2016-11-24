import json
import socket

import config
import tornado.ioloop
import tornado.tcpserver
import tornado.web

socket_pool = {}
job_pool = {}
job_counter = 0


class ApiHandler(tornado.web.RequestHandler):

    def post(self):
        print(json.dumps({k: self.get_argument(k)
                          for k in self.request.arguments}))
        self.write("Hello, world")


class RoomHandler(tornado.web.RequestHandler):

    def get(self):
        self.write(json.dumps([x for x in socket_pool]))


def make_app():
    return tornado.web.Application([
        (r"/api/", ApiHandler),
        (r"/room/", RoomHandler),
        ("/(.*)", tornado.web.StaticFileHandler,
         {'path': '../frontend', "default_filename": "index.html"})
    ])


class TcpConnection(object):

    def __init__(self, stream, address):
        self.stream = stream
        self.address = address
        self.stream.set_close_callback(self.on_close)
        self.stream.read_until(b'\n', self.on_read_line)
        self.name = ""
        print("new connection", address, stream)

    def on_read_line(self, data):
        try:
            data = data.decode()
        except:
            return
        print(data)
        if len(self.name) == 0:
            name = data.split()[0]
            print(name)
            if name not in socket_pool:
                self.name = name
                socket_pool[self.name] = self
                self.send_message("Register Successed.")
            else:
                self.send_message("Register Failed.")
                self.stream.close()

    def send_message(self, data):
        self.stream.write(data.encode())

    def on_close(self):
        if self.name in socket_pool:
            socket_pool.pop(self.name)
        print(self.name, self.address, "left")


class TcpServer(tornado.tcpserver.TCPServer):

    def handle_stream(self, stream, address):
        TcpConnection(stream, address)


if __name__ == "__main__":
    web_server = make_app()
    web_server.listen(config.web_port)
    client_server = TcpServer()
    client_server.listen(config.socket_port)
    tornado.ioloop.IOLoop.current().start()
