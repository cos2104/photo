// =========================================================
// 1. 주요 HTML 요소 참조
// =========================================================
const surveySection = document.getElementById('survey-section');
const mainBooth = document.getElementById('main-booth');
const questionText = document.getElementById('question-text');
const answerButtons = document.getElementById('answer-buttons');

const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('capture-btn');
const downloadBtn = document.getElementById('download-btn');
const flash = document.getElementById('flash');
const scientistOverlay = document.getElementById('scientist-overlay');
const scientistNameSpan = document.getElementById('scientist-name');

// 사진 보관함 (찍은 사진들이 모이는 곳) - HTML에 <div id="photo-gallery"></div> 가 필요합니다.
const photoGallery = document.getElementById('photo-gallery'); 

// 4개의 슬롯 요소
const slots = [
    document.getElementById('slot-1'),
    document.getElementById('slot-2'),
    document.getElementById('slot-3'),
    document.getElementById('slot-4')
];

// 상태 관리 배열
let photoPool = []; // 찍은 사진들이 저장되는 배열
let selectedSlots = [null, null, null, null]; // 1~4번 슬롯에 들어간 사진 데이터

// =========================================================
// 2. 설문조사 데이터 및 로직
// =========================================================
const scientists = {
    'A': { name: '알베르트 아인슈타인', img: 'einstein.png' },
    'B': { name: '마리 퀴리', img: 'curie.png' },
    'C': { name: '리처드 파인만', img: 'feynman.png' },
    'D': { name: '아이작 뉴턴', img: 'newton.png' }
};

const questions = [
    { q: "물리 현상을 설명할 때 당신의 스타일은?", a: [{ text: "사고실험과 상상력", type: 'A' }, { text: "직접 실험 기구 세팅", type: 'B' }] },
    { q: "어려운 난관에 부딪혔을 때 당신은?", a: [{ text: "직관적인 아이디어", type: 'C' }, { text: "엄밀한 수학적 논리", type: 'D' }] }
];

let currentQuestion = 0;
let scores = { 'A': 0, 'B': 0, 'C': 0, 'D': 0 };

function showQuestion() {
    const q = questions[currentQuestion];
    questionText.innerText = q.q;
    answerButtons.innerHTML = '';

    q.a.forEach(answer => {
        const btn = document.createElement('button');
        btn.innerText = answer.text;
        btn.onclick = () => {
            scores[answer.type]++;
            currentQuestion++;
            if (currentQuestion < questions.length) showQuestion();
            else finishSurvey();
        };
        answerButtons.appendChild(btn);
    });
}

function finishSurvey() {
    const winnerType = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    const selectedScientist = scientists[winnerType];

    scientistNameSpan.innerText = selectedScientist.name;
    
    // 캐릭터 이미지 깨짐 방지: onload 이벤트를 통해 이미지가 완전히 로드된 후 진행
    scientistOverlay.onload = () => {
        surveySection.style.display = 'none';
        mainBooth.style.display = 'flex';
        initCamera();
    };
    
    // 경로에 이미지가 없을 경우 에러 처리
    scientistOverlay.onerror = () => {
        alert(`${selectedScientist.img} 파일을 찾을 수 없습니다. index.html과 같은 폴더에 있는지 확인해주세요.`);
    };
    
    scientistOverlay.src = selectedScientist.img;
}

// =========================================================
// 3. 카메라 제어 (노트북 내장 우선)
// =========================================================
async function initCamera() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        if (videoDevices.length === 0) return alert("연결된 카메라가 없습니다.");

        const internalCamera = videoDevices.find(d => d.label.toLowerCase().includes('internal') || d.label.toLowerCase().includes('built-in'));
        const targetId = internalCamera ? internalCamera.deviceId : videoDevices[0].deviceId;

        const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: targetId }, width: { ideal: 1280 }, height: { ideal: 960 } },
            audio: false
        });
        video.srcObject = stream;
        video.onloadedmetadata = () => video.play();
    } catch (err) {
        const basicStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        video.srcObject = basicStream;
        video.onloadedmetadata = () => video.play();
    }
}

// =========================================================
// 4. 사진 촬영 및 보관함(Gallery) 로직
// =========================================================
function takePhoto() {
    flash.classList.remove('flash-active');
    void flash.offsetWidth; 
    flash.classList.add('flash-active');

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 거울 모드 캡처
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // 캐릭터 오버레이 합성 (우측 하단)
    if (scientistOverlay.complete && scientistOverlay.naturalWidth > 0) {
        const overlayWidth = canvas.width * 0.25; 
        const aspectRatio = scientistOverlay.naturalHeight / scientistOverlay.naturalWidth;
        const overlayHeight = overlayWidth * aspectRatio;
        
        const drawX = canvas.width - overlayWidth - (canvas.width * 0.05);
        const drawY = canvas.height - overlayHeight - (canvas.height * 0.05);
        ctx.drawImage(scientistOverlay, drawX, drawY, overlayWidth, overlayHeight);
    }

    const finalImageData = canvas.toDataURL('image/png');
    photoPool.push(finalImageData);
    renderGallery();
}

// 보관함에 찍은 사진들을 썸네일로 표시
function renderGallery() {
    if (!photoGallery) return; // 요소가 없으면 에러 방지
    photoGallery.innerHTML = ''; 
    photoPool.forEach((photoData, index) => {
        const img = document.createElement('img');
        img.src = photoData;
        img.classList.add('gallery-thumbnail');
        
        // 보관함의 사진을 클릭하면 빈 슬롯으로 이동
        img.onclick = () => assignToSlot(photoData);
        photoGallery.appendChild(img);
    });
}

// =========================================================
// 5. 슬롯 할당 및 취소 로직 (X 버튼)
// =========================================================
function assignToSlot(photoData) {
    const emptyIndex = selectedSlots.findIndex(slot => slot === null);
    if (emptyIndex === -1) {
        alert("4개의 칸이 모두 찼습니다. 기존 사진을 삭제 후 추가해주세요.");
        return;
    }

    selectedSlots[emptyIndex] = photoData;
    updateSlotsUI();
}

function removeFromSlot(index) {
    selectedSlots[index] = null;
    updateSlotsUI();
}

function updateSlotsUI() {
    let filledCount = 0;

    slots.forEach((slot, index) => {
        // 기존 내용 초기화 (X 버튼 포함)
        slot.innerHTML = ''; 
        
        if (selectedSlots[index]) {
            slot.style.backgroundImage = `url(${selectedSlots[index]})`;
            
            // X 버튼 생성
            const deleteBtn = document.createElement('button');
            deleteBtn.innerText = 'X';
            deleteBtn.classList.add('delete-btn');
            deleteBtn.onclick = () => removeFromSlot(index);
            slot.appendChild(deleteBtn);
            
            filledCount++;
        } else {
            slot.style.backgroundImage = 'none';
        }
    });

    // 4칸이 모두 차면 저장 버튼 활성화
    downloadBtn.disabled = (filledCount < 4);
}

// =========================================================
// 6. 커스텀 프레임 다운로드 로직 (제공해주신 2x2 프레임용)
// =========================================================
function downloadStrip() {
    const finalCanvas = document.createElement('canvas');
    const ctx = finalCanvas.getContext('2d');
    
    // 올려주신 프레임 이미지 파일명 (사전에 동일 폴더에 저장되어 있어야 함)
    const frameImg = new Image();
    frameImg.src = 'frame.png'; 

    frameImg.onload = () => {
        // 캔버스 크기를 프레임 이미지 크기에 맞춤
        finalCanvas.width = frameImg.width;
        finalCanvas.height = frameImg.height;

        // 1. 프레임을 먼저 그립니다
        ctx.drawImage(frameImg, 0, 0, finalCanvas.width, finalCanvas.height);

        // 2. 사용자가 선택한 4장의 사진을 프레임의 빈 공간(투명한 곳)에 그립니다.
        // ⚠️ 주의: 아래 좌표(x, y, width, height)는 제공해주신 프레임 이미지의 
        // 실제 투명 영역 위치에 맞게 수정해야 합니다. (현재는 예시 좌표입니다)
        const coords = [
            { x: 50, y: 50, w: 400, h: 300 },   // 1번 칸 위치 (좌상단)
            { x: 500, y: 50, w: 400, h: 300 },  // 2번 칸 위치 (우상단)
            { x: 50, y: 400, w: 400, h: 300 },  // 3번 칸 위치 (좌하단)
            { x: 500, y: 400, w: 400, h: 300 }  // 4번 칸 위치 (우하단)
        ];

        // 이미지들을 그리기 위해 프로미스 사용
        const loadPromises = selectedSlots.map((src, index) => {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => {
                    // 프레임 '아래'에 그려지게 하려면 globalCompositeOperation을 사용할 수 있으나,
                    // 가장 쉬운 방법은 사진을 먼저 그리고 프레임을 나중에 덧씌우는 것입니다.
                    // 이 코드에서는 프레임을 먼저 그렸으므로, 사진이 프레임 위로 올라갑니다.
                    ctx.drawImage(img, coords[index].x, coords[index].y, coords[index].w, coords[index].h);
                    resolve();
                };
                img.src = src;
            });
        });

        Promise.all(loadPromises).then(() => {
            // 다운로드 실행
            const link = document.createElement('a');
            link.download = `scientist-photobooth-${new Date().getTime()}.png`;
            link.href = finalCanvas.toDataURL();
            link.click();
        });
    };
    
    frameImg.onerror = () => {
        alert("frame.png 파일을 찾을 수 없습니다. 프레임 이미지가 준비되었는지 확인해주세요.");
    };
}

// =========================================================
// 7. 초기 설정
// =========================================================
window.onload = () => {
    captureBtn.addEventListener('click', takePhoto);
    downloadBtn.addEventListener('click', downloadStrip);
    showQuestion(); // 설문 시작
};