#!/usr/bin/env python3
"""Start the personal directory on localhost; no packages or accounts needed."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial
import argparse
import threading
import webbrowser

def main():
    parser=argparse.ArgumentParser(description='Open your personal Hotel Atlas')
    parser.add_argument('--port',type=int,default=4391)
    parser.add_argument('--no-open',action='store_true')
    args=parser.parse_args()
    directory=Path(__file__).resolve().parent/'public'
    handler=partial(SimpleHTTPRequestHandler,directory=str(directory))
    try:
        server=ThreadingHTTPServer(('127.0.0.1',args.port),handler)
    except OSError as error:
        print('Hotel Atlas could not start on port %s: %s' % (args.port,error))
        print('If Hotel Atlas is already running, open http://127.0.0.1:%s' % args.port)
        return 1
    url='http://127.0.0.1:%s/' % server.server_port
    print('\nHotel Atlas is ready: %s\nKeep this window open while using it. Press Control-C to stop.\n' % url,flush=True)
    if not args.no_open:
        threading.Timer(.5,lambda:webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0

if __name__=='__main__':
    raise SystemExit(main())
