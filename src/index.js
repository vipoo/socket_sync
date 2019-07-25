import ChannelServer from './channel_server'
import ChannelClient from './channel_client'

export function joinChannel(identity) {
  return new ChannelClient(identity)
}

export function createChannel(identity) {
  return new ChannelServer(identity)
}
