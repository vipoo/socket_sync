import net from 'net'
import EventEmitter from 'events'
import {socketPathFor, clearSocket} from './channel_identity'
import {promiseSignal} from 'async_iter/lib/promise_helpers'
import debug from 'debug'

const log = debug('socketsync:server')

export default class ChannelServer extends EventEmitter {
  #log
  #socketPath
  #connections = new Set()
  #hasStartedSignal = promiseSignal()
  #hasStarted = false
  #isConnectedSignal = promiseSignal()

  constructor(identity) {
    super()
    this.#log = log.extend(identity)
    this.#socketPath = socketPathFor(identity)
    this.#start()
  }

  async #start() {
    if (this.#hasStarted)
      return await this.#hasStartedSignal.promise

    this.#hasStarted = true
    await clearSocket(this.#socketPath)
    this.server = net.createServer(socket => this.#onConnection(socket))
    this.server.on('error', err => this.#log(err.message))
    this.server.on('close', () => {
      this.#log('Server closing down')
      if (this.#connections.size === 0)
        this.emit('close')
    })
    this.#log(`Listening on socket ${this.#socketPath}`)
    this.server.listen(this.#socketPath)
    this.#hasStartedSignal.res()
  }

  #onConnection(socket) {
    this.#isConnectedSignal.res()
    this.#connections.add(socket)
    socket.on('data', (...args) => this.emit('data', ...args))
    socket.on('error', err => this.#log(err.message))
    socket.on('close', () => {
      this.#log('Client disconnected')
      this.#connections.delete(socket)
      if (this.#connections.size === 0) {
        this.#isConnectedSignal = promiseSignal()
        this.emit('close')
      }
    })
  }

  get connections() {
    return this.#connections
  }

  get isConnectedSignal() {
    return this.#isConnectedSignal.promise
  }

  async write(payload) {
    await this.#start()
    for (const socket of this.#connections)
      socket.write(payload)
  }

  async close() {
    await this.#start()
    for (const socket of this.#connections) {
      socket.end()
      socket.destroy()
    }

    this.server.close()
  }
}
