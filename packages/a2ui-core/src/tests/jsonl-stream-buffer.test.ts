import assert from 'node:assert/strict';
import {
  A2UIJsonlStreamBuffer,
  expandParsedA2UIPayload,
  protocolToPerComponentJsonlMessages,
} from '../jsonl-stream-buffer';

declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;

describe('JsonlStreamBuffer', () => {
  it('splits bundled protocol JSON into per-component surfaceUpdate messages', () => {
    const payload = {
      beginRendering: { surfaceId: 's1', root: 'r' },
      surfaceUpdate: {
        surfaceId: 's1',
        components: [
          { id: 'a', component: { Text: { text: { literalString: 'x' } } } },
          { id: 'b', component: { Text: { text: { literalString: 'y' } } } },
        ],
      },
    };
    const msgs = expandParsedA2UIPayload(payload);
    assert.equal(msgs.length, 3);
    assert.ok(msgs[0].beginRendering);
    assert.equal(msgs[1].surfaceUpdate?.components?.[0]?.id, 'a');
    assert.equal(msgs[2].surfaceUpdate?.components?.[0]?.id, 'b');
  });

  it('reassembles arbitrary chunk sizes into full JSONL messages', () => {
    const line1 = JSON.stringify({ beginRendering: { surfaceId: 's1', root: 'r' } });
    const line2 = JSON.stringify({
      surfaceUpdate: {
        surfaceId: 's1',
        components: [{ id: 'x', component: { Text: { text: { literalString: 'z' } } } }],
      },
    });
    const fullText = `${line1}\n${line2}`;
    const buf = new A2UIJsonlStreamBuffer();
    let messagesCount = 0;
    for (let i = 0; i < fullText.length; i += 7) {
      buf.append(fullText.slice(i, i + 7));
      messagesCount += buf.consume().messages.length;
    }
    messagesCount += buf.finalize().messages.length;
    assert.equal(messagesCount, 2);
  });

  it('protocolToPerComponentJsonlMessages matches expandParsedA2UIPayload for the same object', () => {
    const protocol = {
      beginRendering: { surfaceId: 's', root: 'r' },
      surfaceUpdate: {
        surfaceId: 's',
        components: [{ id: 'c1', component: {} }, { id: 'c2', component: {} }],
      },
    };
    const a = protocolToPerComponentJsonlMessages(protocol);
    const b = expandParsedA2UIPayload(protocol);
    assert.deepEqual(a, b);
  });
});
