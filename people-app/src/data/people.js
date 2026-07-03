import raw from './people.json'
import { normalizeDeep } from '@icue/text/normalizeUnicode'

export default normalizeDeep(raw)
