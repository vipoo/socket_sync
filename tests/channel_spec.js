import {eventually, expect} from './test_helper'
import {joinChannel, createChannel} from '../src'
import {first} from 'async_iter/pipeline'
import {fromStream} from 'async_iter/from_stream'
import {toArray, take, map} from 'async_iter/pipeline'
import {asPacket, byPacket} from '../src/by_packet'
import {byNewLines} from '../src/by_new_lines'

function firstMessage(channel) {
  return fromStream(channel) |> byPacket() |> map(r => r.toString()) |> first()
}

function twoMessage(channel) {
  return messages(channel, 2)
}

function messages(channel, count) {
  return fromStream(channel) |> byPacket() |> take(count) |> map(r => r.toString()) |> toArray()
}

describe('Channel connections', () => {
  let server
  let server2
  let client
  let client2

  afterEach(() => {
    [client, client2, server, server2]
      .filter(f => f)
      .forEach(f => f.close())
  })

  it('server publishes to a connected client', async () => {
    server = createChannel('identity')
    client = joinChannel('identity')
    const clientMessage = firstMessage(client)

    await server.isConnectedSignal
    'some data' |> asPacket |> server.write

    await expect(clientMessage).to.eventually.eq('some data')
  })

  it('client publishes to server', async () => {
    server = createChannel('identity')
    client = joinChannel('identity')
    const serverMessage = firstMessage(server)

    'some data' |> asPacket |> client.write

    await expect(serverMessage).to.eventually.eq('some data')
  })

  it('publish to channel before channel server ready', async () => {
    client = joinChannel('identity')
    'some data' |> asPacket |> client.write

    server = await createChannel('identity')
    const serverMessage = firstMessage(server)

    await expect(serverMessage).to.eventually.eq('some data')
  })

  it('que publishing to channel before channel server ready', async () => {
    client = joinChannel('identity')
    'some data 1' |> asPacket |> client.write
    'some data 2' |> asPacket |> client.write

    server = createChannel('identity')
    const serverMessage = twoMessage(server)

    await expect(serverMessage).to.eventually.deep.eq(['some data 1', 'some data 2'])
  })

  it('send lots of messages from client to server', async () => {
    server = createChannel('identity')
    const serverMessage = messages(server, 10)
    client = joinChannel('identity')

    for (let i = 0; i < 10; i++)
      `some data ${i}` |> asPacket |> client.write

    client.close()

    await expect(serverMessage).to.eventually.deep.eq([
      'some data 0',
      'some data 1',
      'some data 2',
      'some data 3',
      'some data 4',
      'some data 5',
      'some data 6',
      'some data 7',
      'some data 8',
      'some data 9'
    ])
  })

  it('client restablishes connection after server is recreated', async () => {
    server = createChannel('identity')
    client = joinChannel('identity')
    await server.isConnectedSignal
    await client.isConnectedSignal

    server.close()
    await eventually(() => expect(client.isConnected).to.be.false)

    'some data' |> asPacket |> client.write

    server2 = await createChannel('identity')
    const serverMessage = firstMessage(server2)

    await expect(serverMessage).to.eventually.eq('some data')
  })

  it('server writes to 2 client connections', async () => {
    server = createChannel('identity')
    client = joinChannel('identity')
    const client1Message = firstMessage(client)
    client2 = joinChannel('identity')
    const client2Message = firstMessage(client)

    await eventually(() => expect(server.connections.size).to.eq(2))
    'some data' |> asPacket |> server.write

    await expect(client1Message).to.eventually.eq('some data')
    await expect(client2Message).to.eventually.eq('some data')
  })

  it('2 clients writes to server', async () => {
    server = createChannel('identity')
    const serverMessage = twoMessage(server)

    client = joinChannel('identity')
    'some data1' |> asPacket |> client.write
    client2 = joinChannel('identity')
    'some data2' |> asPacket |> client2.write

    await expect(serverMessage).to.deep.eventually.include('some data1')
    await expect(serverMessage).to.deep.eventually.include('some data2')
  })

  it('client connects, disconnects and then reconnects', async () => {
    server = createChannel('identity')
    const serverMessage = twoMessage(server)

    client = joinChannel('identity')
    'some data' |> asPacket |> client.write
    client.close()
    await eventually(() => expect(server.connections.size).to.eq(0))

    client2 = joinChannel('identity')
    await eventually(() => expect(server.connections.size).to.eq(1))
    'some data2' |> asPacket |> client2.write

    await expect(serverMessage).to.deep.eventually.eq(['some data', 'some data2'])
  })

  it('sends data seperated by new line', async () => {
    server = createChannel('identity')
    client = joinChannel('identity')
    const clientMessage = fromStream(client) |> byNewLines() |> first()
    await server.isConnectedSignal
    'some data\n' |> server.write

    await expect(clientMessage).to.eventually.eq('some data')
  })
})
