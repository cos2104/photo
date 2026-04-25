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
const resetBtn = document.getElementById('reset-btn');
const downloadBtn = document.getElementById('download-btn');
const flash = document.getElementById('flash');
const scientistOverlay = document.getElementById('scientist-overlay');
const scientistNameSpan = document.getElementById('scientist-name');
const dateElement = document.getElementById('current-date');

const slots = [
    document.getElementById('slot-1'),
    document.getElementById('slot-2'),
    document.getElementById('slot-3'),
    document.getElementById('slot-4')
];

// =========================================================
// 2. 설문조사 데이터 및 로직 (과학자 매칭)
// =========================================================
const scientists = {
    'A': { name: '알베르트 아인슈타인', img: 'einstein.png' },
    'B': { name: '마리 퀴리', img: 'curie.png' },
    'C': { name: '리처드 파인만', img: 'feynman.png' },
    'D': { name: '아이작 뉴턴', img: 'newton.png' }
};

// 물리/과학 탐구 스타일을 알아보는 질문들
const questions = [
    { 
        q: "물리 현상을 설명할 때 당신의 스타일은?", 
        a: [
            { text: "머릿속으로 사고실험을 하며 상상력을 펼친다.", type: 'A' }, 
            { text: "직접 실험 기구를 세팅하고 데이터를 수집한다.", type: 'B' }
        ] 
    },
    { 
        q: "어려운 난관에 부딪혔을 때 당신은?", 
        a: [
            { text: "직관적인 아이디어로 새로운 접근법을 찾는다.", type: 'C' }, 
            { text: "엄밀한 수학적 논리와 공식으로 기초부터 파고든다.", type: 'D' }
        ] 
    },
    { 
        q: "다른 사람들에게 지식을 전달할 때 당신은?", 
        a: [
            { text: "유머러스하고 이해하기 쉬운 비유를 즐겨 쓴다.", type: 'C' }, 
            { text: "진지하고 끈기 있게 원리를 끝까지 증명해 준다.", type: 'B' }
        ] 
    }
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
            if (currentQuestion < questions.length) {
                showQuestion();
            } else {
                finishSurvey();
            }
        };
        answerButtons.appendChild(btn);
    });
}

function finishSurvey() {
    // 가장 높은 점수를 받은 타입 찾기 (동점일 경우 앞선 알파벳 우선)
    const winnerType = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    const selectedScientist = scientists[winnerType];

    // 결과 세팅 및 화면 전환
    scientistNameSpan.innerText = selectedScientist.name;
    scientistOverlay.src = selectedScientist.img; // 해당 캐릭터 이미지 로드
    
    surveySection.style.display = 'none';
    mainBooth.style.display = 'flex';
    
    // 포토부스 화면이 켜지면 카메라 시작
    initCamera();
}

// =========================================================
// 3. 카메라 제어 로직 (노트북 내장 카메라 우선 연결)
// =========================================================
async function initCamera() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        if (videoDevices.length === 0) {
            alert("연결된 카메라가 없습니다.");
            return;
        }

        // 'internal'이나 'built-in' 키워드가 있는 내장 카메라를 우선적으로 찾음
        const internalCamera = videoDevices.find(device => 
            device.label.toLowerCase().includes('internal') || 
            device.label.toLowerCase().includes('built-in')
        );

        const targetDeviceId = internalCamera ? internalCamera.deviceId : videoDevices[0].deviceId;

        const constraints = {
            video: {
                deviceId: { exact: targetDeviceId },
                width: { ideal: 1280 },
                height: { ideal: 960 }
            },
            audio: false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        video.onloadedmetadata = () => video.play();

    } catch (err) {
        console.error("카메라 에러:", err);
        // 특정 기기 지정이 실패하면 기본 카메라로 재시도
        try {
            const basicStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            video.srcObject = basicStream;
            video.onloadedmetadata = () => video.play();
        } catch (fallbackErr) {
            alert("카메라를 켤 수 없습니다. 브라우저의 권한 설정을 확인해 주세요.");
        }
    }
}

// =========================================================
// 4. 사진 촬영 및 이미지 합성 로직
// =========================================================
let photoCount = 0;
const capturedImages = [];

function takePhoto() {
    if (photoCount >= 4) {
        alert("이미 4장의 사진을 모두 찍었습니다!");
        return;
    }

    // 플래시 효과
    flash.classList.remove('flash-active');
    void flash.offsetWidth; 
    flash.classList.add('flash-active');

    // 캔버스 설정 (비디오 해상도에 맞춤)
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 1. 사용자(웹캠) 그리기 - 좌우 반전 처리 (거울 모드)
    ctx.save(); // 현재 상태 저장
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore(); // 반전 상태 원상복구 (캐릭터는 반전되면 안 되므로)

    // 2. 과학자 캐릭터 오버레이 그리기
    // 실제 카메라 해상도 비율에 맞춰 오버레이 크기와 위치 계산
    if (scientistOverlay.complete && scientistOverlay.naturalWidth > 0) {
        const overlayWidth = canvas.width * 0.25; // 카메라 화면 가로의 25% 크기로 설정
        const aspectRatio = scientistOverlay.naturalHeight / scientistOverlay.naturalWidth;
        const overlayHeight = overlayWidth * aspectRatio;
        
        const paddingX = canvas.width * 0.05;
        const paddingY = canvas.height * 0.05;
        const drawX = canvas.width - overlayWidth - paddingX; // 우측 하단 배치
        const drawY = canvas.height - overlayHeight - paddingY;

        ctx.drawImage(scientistOverlay, drawX, drawY, overlayWidth, overlayHeight);
    }

    // 3. 합성된 이미지를 추출하여 저장 및 화면 표시
    const finalImageData = canvas.toDataURL('image/png');
    capturedImages.push(finalImageData);
    slots[photoCount].style.backgroundImage = `url(${finalImageData})`;
    photoCount++;

    // 4장을 다 찍으면 상태 변경
    if (photoCount === 4) {
        downloadBtn.disabled = false;
        captureBtn.disabled = true;
    }
}

function resetPhotos() {
    photoCount = 0;
    capturedImages.length = 0;
    slots.forEach(slot => slot.style.backgroundImage = 'none');
    downloadBtn.disabled = true;
    captureBtn.disabled = false;
}

// =========================================================
// 5. 4컷 인화지 다운로드 로직
// =========================================================
function downloadStrip() {
    const finalCanvas = document.createElement('canvas');
    const ctx = finalCanvas.getContext('2d');

    const stripWidth = 600;
    const padding = 40;
    const gap = 20;
    const photoWidth = stripWidth - (padding * 2);
    const photoHeight = photoWidth * (3 / 4);
    const footerHeight = 120;
    const stripHeight = (padding * 2) + (photoHeight * 4) + (gap * 3) + footerHeight;

    finalCanvas.width = stripWidth;
    finalCanvas.height = stripHeight;

    // 인화지 배경색 (흰색)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, stripWidth, stripHeight);

    let loadedCount = 0;

    capturedImages.forEach((src, index) => {
        const img = new Image();
        img.onload = () => {
            const yPos = padding + (index * (photoHeight + gap));
            ctx.drawImage(img, padding, yPos, photoWidth, photoHeight);
            loadedCount++;

            // 4장이 모두 캔버스에 그려지면 다운로드 실행
            if (loadedCount === 4) {
                // 하단 텍스트 및 날짜
                ctx.fillStyle = "#333333";
                ctx.font = "bold 28px 'Pretendard', sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("Scientist Photo Booth", stripWidth / 2, stripHeight - 65);
                
                ctx.fillStyle = "#888888";
                ctx.font = "20px 'Pretendard', sans-serif";
                ctx.fillText(dateElement.innerText, stripWidth / 2, stripHeight - 35);

                const link = document.createElement('a');
                link.download = `scientist-photobooth-${new Date().getTime()}.png`;
                link.href = finalCanvas.toDataURL();
                link.click();
            }
        };
        img.src = src;
    });
}

// =========================================================
// 6. 초기 설정 (날짜 세팅 및 설문 시작)
// =========================================================
window.onload = () => {
    // 날짜 설정
    const now = new Date();
    dateElement.innerText = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')}`;

    // 버튼 이벤트 리스너 등록
    captureBtn.addEventListener('click', takePhoto);
    resetBtn.addEventListener('click', resetPhotos);
    downloadBtn.addEventListener('click', downloadStrip);

    // 프로그램 시작 시 첫 번째 질문 표시
    showQuestion();
};