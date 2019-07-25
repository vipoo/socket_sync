import {expect} from './test_helper'
import {byPacket} from '../src/by_packet.js'
import {toArray} from 'async_iter/pipeline/to_array'

function createPacketHeader(size) {
  const packetHeader = Buffer.alloc(4)
  packetHeader.writeInt32BE(size + 4, 0)
  return packetHeader
}

describe('#by_packet_spec', () => {
  it('packet arrives in full', async () => {
    const content = Buffer.from('a')
    const simplePacket = Buffer.concat([createPacketHeader(content.length), content])
    const result = await ([simplePacket] |> byPacket() |> toArray())

    expect(result).to.deep.eq([content])
  })

  it('packet and content arrive seperate', async () => {
    const content = Buffer.from('a')
    const packetHeader = createPacketHeader(content.length)
    const result = await ([packetHeader, content] |> byPacket() |> toArray())

    expect(result).to.deep.eq([content])
  })

  it('one byte at a time', async () => {
    const content = Buffer.from('a')
    const packetHeader = createPacketHeader(content.length)
    const result = await ([
      packetHeader.slice(0, 1),
      packetHeader.slice(1, 2),
      packetHeader.slice(2, 3),
      packetHeader.slice(3, 4),
      content
    ] |> byPacket() |> toArray())

    expect(result).to.deep.eq([content])
  })

  it('content arrives in seperate parts', async () => {
    const content = Buffer.from('abcdef')
    const packetHeader = createPacketHeader(content.length)
    const result = await ([packetHeader, content.slice(0, 3), content.slice(3)] |> byPacket() |> toArray())

    expect(result).to.deep.eq([content])
  })

  it('2 full packets arrive at one', async () => {
    const content1 = Buffer.from('abcdef')
    const packetHeader1 = createPacketHeader(content1.length)

    const content2 = Buffer.from('jklm')
    const packetHeader2 = createPacketHeader(content2.length)

    const data = Buffer.concat([packetHeader1, content1, packetHeader2, content2])
    const result = await ([data] |> byPacket() |> toArray())

    expect(result).to.deep.eq([content1, content2])
  })

  it('1 full packets and part of next arrive at once', async () => {
    const content1 = Buffer.from('abcdef')
    const packetHeader1 = createPacketHeader(content1.length)

    const content2 = Buffer.from('jklm')
    const packetHeader2 = createPacketHeader(content2.length)

    const data = Buffer.concat([packetHeader1, content1, packetHeader2])
    const result = await ([data, content2] |> byPacket() |> toArray())

    expect(result).to.deep.eq([content1, content2])
  })

})
