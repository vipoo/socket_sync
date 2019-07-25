
export function asPacket(content) {
  const buffer = Buffer.from(content)
  const bufferSize = Buffer.alloc(4)
  bufferSize.writeInt32BE(buffer.length + 4, 0)
  return Buffer.concat([bufferSize, buffer])

}

export function byPacket() {
  return async function*(source) {
    const ref = {buffer: Buffer.alloc(0)}

    for await (const incomingData of source) {
      ref.buffer = Buffer.concat([ref.buffer, incomingData])
      while (ref.buffer.length >= 4) {
        const emittedValue = findNext(ref)
        if (emittedValue === null)
          break
        yield emittedValue
      }
    }
  }
}

function findNext(ref) {
  const packetSize = ref.buffer.readInt32BE(0)

  if (packetSize > ref.buffer.length)
    return null

  const emittedValue = ref.buffer.slice(0, packetSize)
  ref.buffer = ref.buffer.slice(packetSize)
  return emittedValue.slice(4)
}
