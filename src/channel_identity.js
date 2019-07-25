import {promises as fsp} from 'fs'
import path from 'path'

// TODO: Ensure idenity does not jump out of tmp
export function socketPathFor(identity) {
  return path.join('/tmp', identity)
}

export async function clearSocket(socketPath) {
  await fsp.unlink(socketPath).catch(() => {})
}
