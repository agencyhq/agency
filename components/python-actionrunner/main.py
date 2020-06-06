import asyncio
from jsonrpc_websocket import Server

class Client(object):
    def __init__(self, url):
        self.server = Server(url)

    async def connect(self):
        return await self.server.ws_connect()

    async def call(self, method, *args, **kwargs):
        return await self.server._Server__request(method, args, kwargs)

    async def notify(self, method, *args, **kwargs):
        kwargs['_notification'] = True
        return await self.call(method, *args, **kwargs)

    async def auth(self, opts):
        return await self.call('rpc.login', opts)

    async def close(self):
        await self.server.close()
        await self.server.session.close()

async def routine():
    client = Client('ws://localhost:3000')
    try:
        await client.connect()
        await client.auth({ 'token': 'alltoken' })

        print(await client.call('rpc.on', ['execution']))

        while True:
            await asyncio.sleep(3600)
    finally:
        await client.close()

asyncio.get_event_loop().run_until_complete(routine())
