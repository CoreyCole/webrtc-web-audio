let audioContext
let connectionSend;
let connectionRecv;

const constraints = {
  mandatory: {
    OfferToReceiveAudio: true,
    OfferToReceiveVideo: false,
  }
};

const jawsAudio = new Audio('https://omnimic-public-audio.s3-us-west-2.amazonaws.com/testing/jaws.mp3');
jawsAudio.loop = true;
jawsAudio.crossOrigin = 'anonymous';

// audio signal still live, just not playing out loud (only play out on recv end)
jawsAudio.muted = true; 

const recvAudio = new Audio();

async function start() {
  try {
    audioContext = new AudioContext();
    connectionSend = new RTCPeerConnection({});
    connectionRecv = new RTCPeerConnection({});

    const sendSource = audioContext.createMediaElementSource(jawsAudio);
    const sendDestination = audioContext.createMediaStreamDestination();
    sendSource.connect(sendDestination);
    connectionSend.addStream(sendDestination.stream);
    jawsAudio.play();

    connectionRecv.onaddstream = (event) => {
      recvAudio.srcObject = event.stream;
      recvAudio.play();
    };

    connectionSend.onicecandidate = (event) => {
      if (event.candidate) connectionRecv.addIceCandidate(new RTCIceCandidate(event.candidate));
    };

    connectionRecv.onicecandidate = (event) => {
      if (event.candidate) connectionSend.addIceCandidate(new RTCIceCandidate(event.candidate));
    };

    // set connectionSend offer on both connections
    const offer = await connectionSend.createOffer(constraints);
    connectionSend.setLocalDescription(offer);
    connectionRecv.setRemoteDescription(offer);

    // set connectionRecv answer on both connections
    const answer = await connectionRecv.createAnswer(constraints);
    connectionSend.setRemoteDescription(answer);
    connectionRecv.setLocalDescription(answer);
  } catch (err) {
    console.error(err);
  }
}

async function stop() {
  jawsAudio.pause();
  recvAudio.pause();
  await connectionSend.close();
  await connectionRecv.close();
  connectionSend = null;
  connectionRecv = null;
}

window.onload = () => {
  document.getElementById('start').onclick = start;
  document.getElementById('stop').onclick = stop;
};
