import Readable from './readable';
import Writable from './writable';
interface Transport extends Readable, Writable {
}
export default Transport;
