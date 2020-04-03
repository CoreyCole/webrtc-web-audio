import adapter from 'webrtc-adapter';
import { TimerService } from './timer-service';

const timer = new TimerService();
let audioContext: AudioContext;
let connectionSend: RTCPeerConnection;
let connectionRecv: RTCPeerConnection;

const recvAudio = new Audio();

async function getUserMedia(): Promise<MediaStream> {
  return new Promise((resolve, reject) => {
    navigator.getUserMedia({ audio: true, video: false }, stream => {
      resolve(stream);
    }, err => {
      reject(err);
    });
  });
}

async function start() {
  try {
    audioContext = new AudioContext();
    connectionSend = new RTCPeerConnection({});
    connectionRecv = new RTCPeerConnection({});

    const sendStream = await getUserMedia();
    connectionSend.addStream(sendStream);

    connectionRecv.onaddstream = (event) => {
      recvAudio.srcObject = event.stream;
      recvAudio.onloadedmetadata = () => {
        const audioObjectSource = audioContext.createMediaStreamSource(<MediaStream> recvAudio.srcObject);
        recvAudio.play();
        // recvAudio.muted = true;
        audioObjectSource.connect(audioContext.destination);
      };
    };

    connectionSend.onicecandidate = (event) => {
      if (event.candidate) connectionRecv.addIceCandidate(new RTCIceCandidate(event.candidate));
    };

    connectionRecv.onicecandidate = (event) => {
      if (event.candidate) connectionSend.addIceCandidate(new RTCIceCandidate(event.candidate));
    };

    // set connectionSend offer on both connections
    const offer = await connectionSend.createOffer();
    connectionSend.setLocalDescription(offer);
    connectionRecv.setRemoteDescription(offer);

    // set connectionRecv answer on both connections
    const answer = await connectionRecv.createAnswer();
    connectionSend.setRemoteDescription(answer);
    connectionRecv.setLocalDescription(answer);

    timer.startInterval(10, async (currentTime, deltaTime, avgDeltaTime) => {
      const stats: RTCStatsReport = await connectionRecv.getStats();
      stats.forEach(report => {
        if (report.type === 'track' && report.id.indexOf('_receiver_') > -1) {
          console.log('audioLevel = ', report.audioLevel)
        }
      });
    });
  } catch (err) {
    console.error(err);
  }
}

async function startDelayed() {
  try {
    audioContext = new AudioContext();
    connectionSend = new RTCPeerConnection({});
    connectionRecv = new RTCPeerConnection({});

    const sendStream = await getUserMedia();
    connectionSend.addStream(sendStream);

    connectionRecv.onaddstream = (event) => {
      recvAudio.srcObject = event.stream;
      recvAudio.onloadedmetadata = () => {
        const audioObjectSource = audioContext.createMediaStreamSource(recvAudio.srcObject);
        recvAudio.autoplay = true;
        // recvAudio.volume = 0;
        // recvAudio.muted = true;
        const delayNode = new DelayNode(audioContext);
        delayNode.delayTime.value = 1;
        audioObjectSource.connect(delayNode);
        delayNode.connect(audioContext.destination);
      };
    };

    connectionSend.onicecandidate = (event) => {
      if (event.candidate) connectionRecv.addIceCandidate(new RTCIceCandidate(event.candidate));
    };

    connectionRecv.onicecandidate = (event) => {
      if (event.candidate) connectionSend.addIceCandidate(new RTCIceCandidate(event.candidate));
    };

    const constraints = {
      mandatory: {
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: false,
      },
    };

    // set connectionSend offer on both connections
    const offer = await connectionSend.createOffer(constraints);
    connectionSend.setLocalDescription(offer);
    connectionRecv.setRemoteDescription(offer);

    // set connectionRecv answer on both connections
    const answer = await connectionRecv.createAnswer(constraints);
    connectionSend.setRemoteDescription(answer);
    connectionRecv.setLocalDescription(answer);

    timer.startInterval(10, async (currentTime, deltaTime, avgDeltaTime) => {
      const stats: RTCStatsReport = await connectionRecv.getStats();
      stats.forEach(report => {
        if (report.type === 'track' && report.id.indexOf('_receiver_') > -1) {
          console.log('audioLevel = ', report.audioLevel)
        }
      });
    });
  } catch (err) {
    console.error(err);
  }
}

async function stop() {
  try {
    if (connectionSend) await connectionSend.close();
    if (connectionRecv) await connectionRecv.close();
  } catch (err) {
    console.error(err);
  }
  recvAudio.pause();
  connectionSend = null;
  connectionRecv = null;
}

document.getElementById('start').onclick = start;
document.getElementById('start-delayed').onclick = startDelayed;
document.getElementById('stop').onclick = stop;
