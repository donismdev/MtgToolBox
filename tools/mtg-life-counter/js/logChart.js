// js/logChart.js

let lifeChart = null; // 차트 인스턴스를 저장할 변수

/**
 * 로그 데이터를 기반으로 Chart.js를 사용해 생명점 변화 그래프를 그립니다.
 * @param {HTMLCanvasElement} canvasEl - 차트를 그릴 캔버스 요소
 * @param {Array} lifeLog - 플레이어의 로그 데이터 배열
 * @param {object} theme - 현재 플레이어의 테마 객체
 */
export function renderLifeLogChart(canvasEl, lifeLog, theme) {
    // 이전 차트 인스턴스가 있다면 파괴하여 메모리 누수 방지
    if (lifeChart) {
        lifeChart.destroy();
    }

    // 1. 로그 데이터를 차트 형식에 맞게 가공
    const labels = lifeLog.map(entry => {
        const d = new Date(entry.timestamp);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    });
    
    const dataPoints = lifeLog.map(entry => entry.lifeAfter);

    // 2. 차트 생성
    const ctx = canvasEl.getContext('2d');
    lifeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Life Total',
                data: dataPoints,
                borderColor: theme.highlightColor || 'rgba(255, 255, 255, 0.8)',
                backgroundColor: theme.buttonBgColor || 'rgba(255, 255, 255, 0.2)',
                borderWidth: 3,
                tension: 0.1, // 라인을 약간 부드럽게
                fill: true,
                pointBackgroundColor: theme.highlightColor || '#FFFFFF',
                pointRadius: 5,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false, // y축이 0부터 시작하지 않도록
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)' // y축 눈금 색상
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)' // 그리드 라인 색상
                    }
                },
                x: {
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)' // x축 눈금 색상
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // 범례 숨기기
                }
            }
        }
    });
}
