import net from 'net'
import EventEmitter from 'events'
import {promiseSignal} from 'async_iter/lib/promise_helpers'
import {socketPathFor} from './channel_identity'
import debug from 'debug'

const log = debug('socketsync:client')

export default class ChannelClient extends EventEmitter {
  #log
  #socketPath
  #isConnectedSignal = promiseSignal()
  #shutdown = false
  #isConnected = false
  #isStarting = false
  #currentWritePromise = null

  constructor(identity) {
    super()
    this.#log = log.extend(identity)
    this.#socketPath = socketPathFor(identity)
    this.#start()
  }

  #start() {
    if (this.#isStarting || this.#shutdown)
      return

    this.#isStarting = true

    try {
      if (this.client)
        this.client.destroy()

      this.#log('Creating connection')
      this.client = net.createConnection({path: this.#socketPath})
      this.client.on('data', (...args) => this.emit('data', ...args))
      this.client.on('close', () => {
        this.#log('Connection closed')
        if (this.#isConnected)
          this.#isConnectedSignal = promiseSignal()
        this.#isConnected = false
        setTimeout(() => this.#start(), 100)
      })

      this.client.on('error', err => this.#log(err.message))
      this.client.on('connect', () => {
        this.#log('Connection established')
        this.#isConnected = true
        this.#isConnectedSignal.res()
      })
    } finally {
      this.#isStarting = false
    }
  }

  get isConnected() {
    return this.#isConnected
  }

  get isConnectedSignal() {
    return this.#isConnectedSignal.promise
  }

  async write(data) {
    const p = this.#currentWritePromise
    this.#currentWritePromise = new Promise(async res => {
      await this.#isConnectedSignal.promise
      await p
      this.client.write(data, res)
    })
  }

  async close() {
    await this.#currentWritePromise
    this.#shutdown = true
    this.emit('close')
    if (this.client) {
      this.client.end()
      this.client.destroy()
    }
  }
}
