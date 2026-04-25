// 주요 요소 참조
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('capture-btn');
const resetBtn = document.getElementById('reset-btn');
const downloadBtn = document.getElementById('download-btn');
const flash = document.getElementById('flash');
const dateElement = document.getElementById('current-date');

// 사진 슬롯 배열
const slots = [
    document.getElementById('slot-1'),
    document.getElementById('slot-2'),
    document.getElementById('slot-3'),
    document.getElementById('slot-4')
];

let photoCount = 0; // 현재까지 찍은 사진 수
const capturedImages = []; // 이미지 데이터를 담을 배열

// 모든 카메라 장치를 찾아 노트북 카메라(또는 첫 번째 카메라)를 우선 연결하는 코드
async function initCamera() {
    try {
        // 우선 현재 연결 가능한 장치 목록을 가져옵니다.
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        if (videoDevices.length === 0) {
            alert("연결된 카메라가 없습니다.");
            return;
        }

        // 특정 키워드(Internal, Built-in 등)가 포함된 장치를 찾거나, 없으면 첫 번째 장치 선택
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
        // 만약 'exact' 설정 때문에 에러가 나면, 그냥 기본 카메라로 재시도
        const basicStream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = basicStream;
    }
}

// 2. 사진 촬영 기능
function takePhoto() {
    if (photoCount >= 4) {
        alert("이미 4장의 사진을 모두 찍었습니다! 다시 찍으려면 '다시 찍기'를 눌러주세요.");
        return;
    }

    // 번쩍이는 효과 (Flash)
    flash.classList.remove('flash-active');
    void flash.offsetWidth; // 리플로우 강제 발생 (애니메이션 재시작용)
    flash.classList.add('flash-active');

    // 캔버스에 현재 영상 그리기
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 좌우 반전된 화면을 정상적으로 캡처하기 위해 반전 설정
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 이미지 데이터 추출 (Data URL)
    const imageData = canvas.toDataURL('image/png');
    capturedImages.push(imageData);

    // 해당 슬롯에 사진 표시
    slots[photoCount].style.backgroundImage = `url(${imageData})`;
    photoCount++;

    // 4장을 다 찍으면 다운로드 버튼 활성화
    if (photoCount === 4) {
        downloadBtn.disabled = false;
        captureBtn.disabled = true;
    }
}

// 3. 다시 찍기 (초기화)
function resetPhotos() {
    photoCount = 0;
    capturedImages.length = 0;
    slots.forEach(slot => {
        slot.style.backgroundImage = 'none';
    });
    downloadBtn.disabled = true;
    captureBtn.disabled = false;
}

// 4. 사진 합쳐서 저장하기 (4컷 전체 저장)
function downloadStrip() {
    const finalCanvas = document.createElement('canvas');
    const ctx = finalCanvas.getContext('2d');

    // 인화지 크기 설정 (예: 가로 500px, 세로 1500px)
    const stripWidth = 500;
    const padding = 40;
    const gap = 20;
    const photoWidth = stripWidth - (padding * 2);
    const photoHeight = photoWidth * (3 / 4);
    const footerHeight = 100;
    const stripHeight = (padding * 2) + (photoHeight * 4) + (gap * 3) + footerHeight;

    finalCanvas.width = stripWidth;
    finalCanvas.height = stripHeight;

    // 배경색 채우기 (흰색 프레임)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, stripWidth, stripHeight);

    // 4장의 사진 그리기
    const imgObjects = [];
    let loadedCount = 0;

    capturedImages.forEach((src, index) => {
        const img = new Image();
        img.onload = () => {
            const yPos = padding + (index * (photoHeight + gap));
            ctx.drawImage(img, padding, yPos, photoWidth, photoHeight);
            loadedCount++;

            // 마지막 사진까지 다 그려졌을 때 저장 실행
            if (loadedCount === 4) {
                // 하단 날짜 텍스트
                ctx.fillStyle = "#888888";
                ctx.font = "bold 24px Arial";
                ctx.textAlign = "center";
                ctx.fillText(dateElement.innerText, stripWidth / 2, stripHeight - 40);

                // 이미지 다운로드
                const link = document.createElement('a');
                link.download = `photo-booth-${new Date().getTime()}.png`;
                link.href = finalCanvas.toDataURL();
                link.click();
            }
        };
        img.src = src;
    });
}

// 5. 초기 설정 및 이벤트 리스너
function init() {
    // 날짜 설정
    const now = new Date();
    dateElement.innerText = `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')}`;

    // 카메라 시작
    initCamera();

    // 버튼 이벤트
    captureBtn.addEventListener('click', takePhoto);
    resetBtn.addEventListener('click', resetPhotos);
    downloadBtn.addEventListener('click', downloadStrip);
}

// 페이지 로드 시 실행
window.onload = init;