const statusEl = document.getElementById('status') as HTMLDivElement;
const serverUrlEl = document.getElementById('serverUrl') as HTMLInputElement;
const roomIdEl = document.getElementById('roomId') as HTMLInputElement;
const nameEl = document.getElementById('displayName') as HTMLInputElement;
const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement;
const joinBtn = document.getElementById('joinBtn') as HTMLButtonElement;
const shareBtn = document.getElementById('shareBtn') as HTMLButtonElement;
const disconnectBtn = document.getElementById('disconnectBtn') as HTMLButtonElement;
const localVideo = document.getElementById('localVideo') as HTMLVideoElement;

let transport: WebTransport | null = null;
let bidiWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;
let bidiReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

function log(msg: string) {
  const time = new Date().toISOString().split('T')[1].replace('Z', '');
  statusEl.textContent += `[${time}] ${msg}\n`;
  statusEl.scrollTop = statusEl.scrollHeight;
}

function checkSupport() {
  if (!('WebTransport' in window)) {
    log('Error: WebTransport is not supported in this browser.');
    connectBtn.disabled = true;
    joinBtn.disabled = true;
    shareBtn.disabled = true;
    disconnectBtn.disabled = true;
    return false;
  }
  return true;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function connect() {
  if (!checkSupport()) return;
  const baseUrl = serverUrlEl.value.trim() || 'https://ls-wt.kota-yata.com:4433/baton';
  const params = new URLSearchParams();
  if (roomIdEl.value) params.set('room', roomIdEl.value);
  if (nameEl.value) params.set('name', nameEl.value);
  const url = params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;

  log(`Connecting to ${url} ...`);
  try {
    // Pin only when connecting to localhost with the picoquic test cert.
    // For real CA certs (e.g., ls-wt.kota-yata.com), do not pin.
    const isLocalhost = /(^https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\//i.test(url);
    let options: any = {};
    if (isLocalhost) {
      const defaultPinnedHashB64 = 'vW1Cqss01z7iqBJmm7ws2vsC1ZbMhvFRHkNtu+r2YQw='; // picoquic test cert
      options = { serverCertificateHashes: [{ algorithm: 'sha-256', value: base64ToBytes(defaultPinnedHashB64) }] };
    }
    // @ts-ignore: WebTransport is not in TS lib yet on all setups
    transport = new (window as any).WebTransport(url, options);
  } catch (e) {
    log(`Failed creating WebTransport: ${(e as Error).message}`);
    return;
  }

  try {
    await transport!.ready;
    log('WebTransport ready.');

    transport!.closed.then(() => log('WebTransport closed.'))
                    .catch((e: any) => log(`Transport error: ${e?.message || e}`));

    // For now, do not open streams automatically. The /baton handler
    // expects its own protocol. We only verify session establishment.
  } catch (e) {
    log(`Connection failed: ${(e as Error).message}`);
    await disconnect();
  }
}

async function disconnect() {
  try {
    if (bidiWriter) await bidiWriter.close();
  } catch {}
  try {
    await transport?.close?.();
  } catch {}
  bidiWriter = null;
  bidiReader = null;
  transport = null;
  log('Disconnected.');
}

async function joinViewer() {
  if (!transport) {
    log('Not connected.');
    return;
  }
  log('Join requested (viewer). Protocol wiring TBD.');
}

async function shareScreen() {
  try {
    const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false });
    localVideo.srcObject = stream;
    log('Captured display stream (preview only).');

    log('Join requested (presenter). Protocol wiring TBD.');
  } catch (e) {
    log(`getDisplayMedia failed: ${(e as Error).message}`);
  }
}

connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);
joinBtn.addEventListener('click', joinViewer);
shareBtn.addEventListener('click', shareScreen);

checkSupport();
