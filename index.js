'use strict';

const heygen_API = {
  apiKey: 'MTlmZmJmZjgxMTQwNDRkN2IyNzUxYThhM2Y3ZDgwNTktMTcwNzIwNTYwNA==',
  serverUrl: 'https://api.heygen.com',
};

const chatbase_config = {
  apiKey: '2bece0a9-2d62-4c32-bfa2-9e3f41d6aeab',
  chatbase_id: 'a9n8QrpkFdIra7bqeFnrf',
  service_url: 'https://www.chatbase.co',
};

// const   = document.querySelector('#status');
const apiKey = heygen_API.apiKey;
const SERVER_URL = heygen_API.serverUrl;

const chatbase_apiKey = chatbase_config.apiKey;
const CHATBASE_URL = chatbase_config.service_url;
const chatbase_id = chatbase_config.chatbase_id;

if (apiKey === 'YourApiKey' || SERVER_URL === '') {
  alert('Please enter your API key and server URL in the api.json file');
}

let sessionInfo = null;
let peerConnection = null;
let speech = null;
console.log(sessionInfo);


function onMessage(event) {
  const message = event.data;
  console.log('Received message:', message);
}

// Create a new WebRTC session when clicking the "New" button
async function createNewSession() {
  console.log('Creating new session... please wait');

  // call the new interface to get the server's offer SDP and ICE server to create a new RTCPeerConnection
  sessionInfo = await newSession('high');
  const { sdp: serverSdp, ice_servers2: iceServers } = sessionInfo;
  console.log(iceServers);

  console.log(sessionInfo.session_id);
  // Create a new RTCPeerConnection
  peerConnection = new RTCPeerConnection({ iceServers: iceServers });

  // When ICE candidate is available, send to the server
  peerConnection.onicecandidate = ({ candidate }) => {
    console.log('Received ICE candidate:', candidate);
    if (candidate) {
      handleICE(sessionInfo.session_id, candidate.toJSON());
    }
  };

  // When ICE connection state changes, display the new state
  peerConnection.oniceconnectionstatechange = (event) => {

  };

  // When audio and video streams are received, display them in the video element
  peerConnection.ontrack = (event) => {
    console.log('Received the track');
    console.log(event.streams[0]);
    if (event.track.kind === 'audio' || event.track.kind === 'video') {
      mediaElement.srcObject = event.streams[0];
    }
  };

  // When receiving a message, display it in the status element
  peerConnection.ondatachannel = (event) => {
    const dataChannel = event.channel;
    dataChannel.onmessage = onMessage;
  };

  // Set server's SDP as remote description
  const remoteDescription = new RTCSessionDescription(serverSdp);
  await peerConnection.setRemoteDescription(remoteDescription);


  startAndDisplaySession();
}

// Start session and display audio and video when clicking the "Start" button
async function startAndDisplaySession() {
  if (!sessionInfo) {
    console.log('Please create a connection first');
    return;
  }


  // Create and set local SDP description
  const localDescription = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(localDescription);
  console.log(localDescription);
  // Start session
  await startSession(sessionInfo.session_id, localDescription);
  console.log('Session started successfully');

  showElement(videoElement);
}

const taskInput = document.querySelector('#taskInput');

async function talkHandler() {
  if (!sessionInfo) {
    console.log('Please create a connection first');
    return;
  }
  const prompt = taskInput.value; // Using the same input for simplicity
  if (prompt.trim() === '') {
    alert('Please enter a prompt for the LLM');
    return;
  }

  console.log('Talking to LLM... please wait');

  try {
    const text = await talkToOpenAI(prompt);

    if (text) {
      // Send the AI's response to Heygen's streaming.task API
      const resp = await repeat(sessionInfo.session_id, text);
      console.log('LLM response sent successfully');
    } else {
      console.log('Failed to get a response from AI');
    }
  } catch (error) {
    console.error('Error talking to AI:', error);
    console.log('Error talking to AI');
  }
}

// when clicking the "Close" button, close the connection
async function closeConnectionHandler() {
  if (!sessionInfo) {
    console.log('Please create a connection first');
    return;
  }

  renderID++;
  hideElement(canvasElement);
  hideElement(bgCheckboxWrap);
  mediaCanPlay = false;

  console.log('Closing connection... please wait');
  try {
    // Close local connection
    peerConnection.close();
    // Call the close interface
    const resp = await stopSession(sessionInfo.session_id);

    console.log(resp);
  } catch (err) {
    console.error('Failed to close the connection:', err);
  }
  console.log('Connection closed successfully');
}

document.querySelector('#newBtn').addEventListener('click', createNewSession);
document.querySelector('#repeatBtn').addEventListener('click', send);
document.querySelector('#closeBtn').addEventListener('click', closeConnectionHandler);

// new session
async function newSession(quality, avatar_name, voice_id) {
  const response = await fetch(`${SERVER_URL}/v1/streaming.new`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({
      quality,
      avatar_name,
      voice: {
        voice_id: voice_id,
      },
    }),
  });
  if (response.status === 500) {
    console.error('Server error');
    console.log('Server Error. Please ask the staff if the service has been turned on');

    throw new Error('Server error');
  } else {
    const data = await response.json();
    console.log(data);
    return data.data;
  }
}

// start the session
async function startSession(session_id, sdp) {
  const response = await fetch(`${SERVER_URL}/v1/streaming.start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({ session_id, sdp }),
  });
  if (response.status === 500) {
    console.error('Server error');
    console.log('Server Error. Please ask the staff if the service has been turned on');
    throw new Error('Server error');
  } else {
    const data = await response.json();
    return data.data;
  }
}

// submit the ICE candidate
async function handleICE(session_id, candidate) {
  console.log(candidate);
  const response = await fetch(`${SERVER_URL}/v1/streaming.ice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({ session_id, candidate }),
  });
  if (response.status === 500) {
    console.error('Server error');
    console.log('Server Error. Please ask the staff if the service has been turned on');
    throw new Error('Server error');
  } else {
    const data = await response.json();
    return data;
  }
}

async function talkToOpenAI(prompt) {
  const response = await fetch(`http://localhost:5000/openai/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
  });
  if (response.status === 500) {
    console.error('Server error');
    console.log('Server Error. Please make sure to set the openai api key');
    throw new Error('Server error');
  } else {
    const data = await response.json();
    return data.text;
  }
}



async function send() {
  let question = taskInput.value;
  if (!sessionInfo) {
    console.log('Please create a connection first');
    return;
  }
  const response = await fetch('https://www.chatbase.co/api/v1/chat', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + chatbase_apiKey,
    },
    body: JSON.stringify({
      messages: [
        { content: 'How can I help you?', role: 'assistant' },
        { content: question, role: 'user' },
      ],
      chatbotId: chatbase_id,
      stream: false,
      model: 'gpt-3.5-turbo',
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw Error(errorData.message);
  }
  const data = await response.json();
  if (!sessionInfo) {
  }
  talkAvatar(sessionInfo.session_id, data.text);
}

async function talkAvatar(session_id, text) {
  if (!sessionInfo) {
    console.log('Please create a connection first');

    return;
  }
  const response = await fetch(`${SERVER_URL}/v1/streaming.task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({ session_id, text }),
  });
  if (response.status === 500) {
    console.error('Server error');
    console.log('Server Error. Please ask the staff if the service has been turned on');
    throw new Error('Server error');
  } else {
    const data = await response.json();
    return data.data;
  }
}

// stop session
async function stopSession(session_id) {
  const response = await fetch(`${SERVER_URL}/v1/streaming.stop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({ session_id }),
  });
  if (response.status === 500) {
    console.error('Server error');
    console.log('Server Error. Please ask the staff for help');
    throw new Error('Server error');
  } else {
    const data = await response.json();
    return data.data;
  }
}

const removeBGCheckbox = document.querySelector('#removeBGCheckbox');
// removeBGCheckbox.addEventListener('click', () => {
//   const isChecked = removeBGCheckbox.checked; // status after click

//   if (isChecked && !sessionInfo) {
//     console.log('Please create a connection first');
//     removeBGCheckbox.checked = false;
//     return;
//   }

//   if (isChecked && !mediaCanPlay) {
//     console.log( 'Please wait for the video to load');
//     removeBGCheckbox.checked = false;
//     return;
//   }

//   if (isChecked) {
//     hideElement(mediaElement);
//     showElement(canvasElement);

//     renderCanvas();
//   } else {
//     hideElement(canvasElement);
//     showElement(mediaElement);

//     renderID++;
//   }
// });

let renderID = 0;
function renderCanvas() {
  if (!removeBGCheckbox.checked) return;
  hideElement(mediaElement);
  showElement(canvasElement);
  
  canvasElement.classList.add('show');

  const curRenderID = Math.trunc(Math.random() * 1000000000);
  renderID = curRenderID;

  const ctx = canvasElement.getContext('2d', { willReadFrequently: true });

  if (bgInput.value) {
    canvasElement.parentElement.style.background = bgInput.value?.trim();
  }

  function processFrame() {
    if (!removeBGCheckbox.checked) return;
    if (curRenderID !== renderID) return;

    canvasElement.width = mediaElement.videoWidth;
    canvasElement.height = mediaElement.videoHeight;

    ctx.drawImage(mediaElement, 0, 0, canvasElement.width, canvasElement.height);
    ctx.getContextAttributes().willReadFrequently = true;
    const imageData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const red = data[i];
      const green = data[i + 1];
      const blue = data[i + 2];

      // You can implement your own logic here
      if (isCloseToGreen([red, green, blue])) {
        // if (isCloseToGray([red, green, blue])) {
        data[i + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    requestAnimationFrame(processFrame);
  }

  processFrame();
}

function isCloseToGreen(color) {
  const [red, green, blue] = color;
  return green > 90 && red < 90 && blue < 90;
}

function hideElement(element) {
  element.classList.add('hide');
  element.classList.remove('show');
}
function showElement(element) {
  element.classList.add('show');
  element.classList.remove('hide');
}

const mediaElement = document.querySelector('#mediaElement');
let mediaCanPlay = false;
mediaElement.onloadedmetadata = () => {
  mediaCanPlay = true;
  mediaElement.play();

  showElement(bgCheckboxWrap);
};
const canvasElement = document.querySelector('#canvasElement');
const videoElement = document.querySelector('.videoSectionWrap');
const bgCheckboxWrap = document.querySelector('#bgCheckboxWrap');
const bgInput = document.querySelector('#bgInput');
// bgInput.addEventListener('keydown', (e) => {
//   if (e.key === 'Enter') {
//     renderCanvas();
//   }
// });
