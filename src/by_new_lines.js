import {map} from 'async_iter/pipeline/map'
import {byLines} from 'async_iter/pipeline/by_lines'

export const byNewLines = () => source => source |> map(s => s.toString()) |> byLines()
