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

// script.js의 initCamera 함수 부분을 아래 내용으로 덮어쓰기 하세요.
async function initCamera() {
    const constraints = {
        video: {
            width: { ideal: 1280 }, // 가능한 1280을 시도하되
            height: { ideal: 960 },
            facingMode: "user"      // 셀카 모드 우선
        },
        audio: false
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        
        // 일부 브라우저에서 play()를 명시적으로 호출해야 하는 경우가 있습니다.
        video.onloadedmetadata = () => {
            video.play();
        };
    } catch (err) {
        console.error("카메라 에러 상세:", err);
        if (err.name === 'OverconstrainedError') {
            // 해상도 문제일 경우 사양을 낮춰서 재시도
            const lowResConstraints = { video: true, audio: false };
            const lowResStream = await navigator.mediaDevices.getUserMedia(lowResConstraints);
            video.srcObject = lowResStream;
        } else {
            alert("카메라를 켤 수 없습니다. 브라우저 주소창 왼쪽의 '자물쇠' 아이콘을 눌러 권한을 확인해 주세요.");
        }
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